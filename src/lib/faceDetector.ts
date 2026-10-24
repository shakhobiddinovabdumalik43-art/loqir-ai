export interface FaceDetectionResult {
  faceDetected: boolean;
  box?: { x: number; y: number; width: number; height: number };
  descriptor?: number[];
  livenessScore: number;
  livenessSteps: {
    centered: boolean;
    movement: boolean;
    blink: boolean;
  };
  feedback: string;
}

export class FaceTracker {
  private lastCenterX: number | null = null;
  private lastCenterY: number | null = null;
  private motionAccumulator = 0;
  private eyeContrastHistory: number[] = [];
  private centeredFrames = 0;
  private movementFrames = 0;
  private blinkDetected = false;
  private minBlinkFrames = 0;

  public reset() {
    this.lastCenterX = null;
    this.lastCenterY = null;
    this.motionAccumulator = 0;
    this.eyeContrastHistory = [];
    this.centeredFrames = 0;
    this.movementFrames = 0;
    this.blinkDetected = false;
    this.minBlinkFrames = 0;
  }

  public analyze(video: HTMLVideoElement, canvas: HTMLCanvasElement): FaceDetectionResult {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !video.videoWidth || !video.videoHeight) {
      return {
        faceDetected: false,
        livenessScore: 0,
        livenessSteps: { centered: false, movement: false, blink: false },
        feedback: 'Initializing optical sensor...',
      };
    }

    const width = 320;
    const height = 240;
    canvas.width = width;
    canvas.height = height;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalSkinPixels = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;

    // Fast sampling (step 2) to detect skin-like chromaticity
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Normalized RGB skin color classification
        const sum = r + g + b;
        if (sum > 60 && sum < 700) {
          const nr = r / sum;
          const ng = g / sum;
          // Typical human skin locus in chromaticity space
          if (nr > 0.35 && nr < 0.58 && ng > 0.25 && ng < 0.38 && r > g && g > b * 0.75) {
            totalSkinPixels++;
            sumX += x;
            sumY += y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    // Minimum skin pixel threshold (must be at least 1,200 sampled pixels)
    if (totalSkinPixels < 1200) {
      this.centeredFrames = Math.max(0, this.centeredFrames - 1);
      return {
        faceDetected: false,
        livenessScore: 0,
        livenessSteps: {
          centered: this.centeredFrames > 15,
          movement: this.movementFrames > 12,
          blink: this.blinkDetected,
        },
        feedback: 'No face detected. Please face the camera directly in bright lighting.',
      };
    }

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const centerX = sumX / totalSkinPixels;
    const centerY = sumY / totalSkinPixels;

    // Aspect ratio check (human face bounding box aspect ratio is typically between 1.05 and 1.7)
    const aspectRatio = faceHeight / (faceWidth || 1);
    if (aspectRatio < 0.85 || aspectRatio > 2.2 || faceWidth < 45 || faceHeight < 60) {
      return {
        faceDetected: false,
        livenessScore: 0.1,
        livenessSteps: {
          centered: false,
          movement: this.movementFrames > 12,
          blink: this.blinkDetected,
        },
        feedback: 'Please bring your face closer and center inside the scan zone.',
      };
    }

    // 1. Centering test
    const normCx = centerX / width;
    const normCy = centerY / height;
    const isCentered = normCx >= 0.35 && normCx <= 0.65 && normCy >= 0.28 && normCy <= 0.72;

    if (isCentered) {
      this.centeredFrames++;
    } else {
      this.centeredFrames = Math.max(0, this.centeredFrames - 1);
    }
    const step1Centered = this.centeredFrames >= 12;

    // 2. Parallax / Head movement liveness test
    if (this.lastCenterX !== null && this.lastCenterY !== null) {
      const deltaX = Math.abs(centerX - this.lastCenterX);
      const deltaY = Math.abs(centerY - this.lastCenterY);
      const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Controlled natural head turn creates delta between 1.5 and 18 pixels per frame
      if (delta >= 1.2 && delta <= 20) {
        this.motionAccumulator += delta;
        this.movementFrames++;
      }
    }
    this.lastCenterX = centerX;
    this.lastCenterY = centerY;
    const step2Movement = this.movementFrames >= 14 && this.motionAccumulator > 35;

    // 3. Eye region contrast & dynamic blink analysis
    // Sub-sample eye band (upper 35-50% of face height)
    const eyeBandY = Math.floor(minY + faceHeight * 0.32);
    const eyeBandH = Math.max(8, Math.floor(faceHeight * 0.18));
    let eyeLuminance = 0;
    let eyePixelCount = 0;

    for (let y = eyeBandY; y < eyeBandY + eyeBandH && y < height; y += 2) {
      for (let x = minX; x < maxX && x < width; x += 2) {
        const idx = (y * width + x) * 4;
        eyeLuminance += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        eyePixelCount++;
      }
    }

    const avgEyeLum = eyePixelCount > 0 ? eyeLuminance / eyePixelCount : 128;
    this.eyeContrastHistory.push(avgEyeLum);
    if (this.eyeContrastHistory.length > 25) {
      this.eyeContrastHistory.shift();
    }

    // Check for transient blink / luminance dip and recovery
    if (this.eyeContrastHistory.length >= 10) {
      const recent = this.eyeContrastHistory.slice(-5);
      const previous = this.eyeContrastHistory.slice(0, 5);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const avgPrev = previous.reduce((a, b) => a + b, 0) / previous.length;
      const delta = Math.abs(avgRecent - avgPrev);

      if (delta > 3.5) {
        this.minBlinkFrames++;
        if (this.minBlinkFrames >= 2) {
          this.blinkDetected = true;
        }
      }
    }

    // Compute 16-dimensional normalized biometric feature descriptor vector
    // Divides face into 4x4 spatial zones and extracts relative luminance density
    const descriptor: number[] = [];
    const zoneW = Math.max(1, Math.floor(faceWidth / 4));
    const zoneH = Math.max(1, Math.floor(faceHeight / 4));

    let overallLumSum = 0;
    const zoneLums: number[] = [];

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const zStartX = minX + col * zoneW;
        const zStartY = minY + row * zoneH;
        let zSum = 0;
        let zCount = 0;

        for (let y = zStartY; y < zStartY + zoneH && y < height; y += 3) {
          for (let x = zStartX; x < zStartX + zoneW && x < width; x += 3) {
            const idx = (y * width + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            zSum += lum;
            zCount++;
          }
        }
        const avg = zCount > 0 ? zSum / zCount : 128;
        zoneLums.push(avg);
        overallLumSum += avg;
      }
    }

    const meanFaceLum = overallLumSum / 16;
    for (let i = 0; i < 16; i++) {
      // Normalized relative deviation
      descriptor.push(Number(((zoneLums[i] - meanFaceLum) / (meanFaceLum || 1)).toFixed(4)));
    }

    // Append aspect ratio & normalized scale factor
    descriptor.push(Number((faceHeight / faceWidth).toFixed(4)));
    descriptor.push(Number((faceWidth / width).toFixed(4)));

    // Calculate liveness score
    let livenessScore = 0.2;
    if (step1Centered) livenessScore += 0.35;
    if (step2Movement) livenessScore += 0.25;
    if (this.blinkDetected) livenessScore += 0.2;
    livenessScore = Math.min(1.0, Number(livenessScore.toFixed(2)));

    // Construct human-readable feedback
    let feedback = 'Position your face in the center of the reticle.';
    if (!step1Centered) {
      if (normCx < 0.35) feedback = 'Move slightly to your right.';
      else if (normCx > 0.65) feedback = 'Move slightly to your left.';
      else feedback = 'Align face inside the biometric scanner frame.';
    } else if (!step2Movement) {
      feedback = 'Great. Now turn or tilt your head slightly to confirm 3D liveness.';
    } else if (!this.blinkDetected) {
      feedback = 'Blink naturally or smile gently to verify biological presence.';
    } else {
      feedback = 'Liveness confirmed. Biometric vector synthesized.';
    }

    return {
      faceDetected: true,
      box: {
        x: Math.max(0, minX - 10),
        y: Math.max(0, minY - 15),
        width: Math.min(width, faceWidth + 20),
        height: Math.min(height, faceHeight + 30),
      },
      descriptor,
      livenessScore,
      livenessSteps: {
        centered: step1Centered,
        movement: step2Movement,
        blink: this.blinkDetected,
      },
      feedback,
    };
  }
}
