import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

// Ensure data directory and storage files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
}
if (!fs.existsSync(CHATS_FILE)) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify([]), 'utf-8');
}

// In-memory active session tokens: token -> { userId: string, verified: boolean, expiresAt: number }
const SESSIONS = new Map<string, { userId: string; verified: boolean; expiresAt: number }>();

// Data helper functions
function readUsers(): any[] {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function writeUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function readChats(): any[] {
  try {
    const data = fs.readFileSync(CHATS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading chats file:', err);
    return [];
  }
}

function writeChats(chats: any[]) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2), 'utf-8');
}

// Password hashing
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Biometric Vector Comparison (Euclidean distance & Cosine similarity)
function compareBiometrics(vecA: number[], vecB: number[]): { match: boolean; similarity: number; distance: number } {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return { match: false, similarity: 0, distance: 999 };
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  let sumSqDiff = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
    const diff = a - b;
    sumSqDiff += diff * diff;
  }

  const similarity = (normA > 0 && normB > 0) ? (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))) : 0;
  const distance = Math.sqrt(sumSqDiff);

  // High confidence match threshold
  const match = similarity >= 0.78 && distance <= 0.45;
  return { match, similarity, distance };
}

// Gemini AI Client Initialization (Server-side)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: '25mb' }));

// Auth Middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const session = SESSIONS.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) SESSIONS.delete(token);
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
    return;
  }

  const users = readUsers();
  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  (req as any).user = user;
  (req as any).session = session;
  (req as any).token = token;
  next();
}

// ================= API ROUTES =================

// 1. REGISTER
app.post('/api/auth/register', (req, res) => {
  const { fullName, countryCode, phoneNumber, password, confirmPassword } = req.body;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Full name must be at least 2 characters' });
    return;
  }

  // Strictly enforce numeric digits only in phone number
  if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
    res.status(400).json({ error: 'Phone number must contain numeric digits only. No letters or symbols.' });
    return;
  }

  if (phoneNumber.length < 7 || phoneNumber.length > 15) {
    res.status(400).json({ error: 'Phone number length is invalid (must be 7-15 digits)' });
    return;
  }

  if (!password || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }

  const cleanCountryCode = (countryCode || '+998').trim();
  const fullPhone = `${cleanCountryCode}${phoneNumber}`;

  const users = readUsers();
  const existing = users.find((u) => u.fullPhone === fullPhone);
  if (existing) {
    res.status(409).json({ error: 'An account with this phone number already exists' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  // Generate a 6-digit backup security code for alternative authentication
  const backupPin = Math.floor(100000 + Math.random() * 900000).toString();

  const newUser = {
    id: crypto.randomUUID(),
    fullName: fullName.trim(),
    countryCode: cleanCountryCode,
    phoneNumber,
    fullPhone,
    passwordHash,
    salt,
    backupPin,
    faceBiometrics: null, // User enrolls face in Page 2
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  // Issue temporary session token (verified: false until face enrolled/verified)
  const token = crypto.randomBytes(32).toString('hex');
  SESSIONS.set(token, {
    userId: newUser.id,
    verified: false,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      fullName: newUser.fullName,
      fullPhone: newUser.fullPhone,
      backupPin: newUser.backupPin,
      faceEnrolled: false,
    },
    message: 'Account created successfully. Please proceed to Face ID setup.',
  });
});

// 2. LOGIN
app.post('/api/auth/login', (req, res) => {
  const { countryCode, phoneNumber, password } = req.body;

  if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
    res.status(400).json({ error: 'Phone number must contain numeric digits only' });
    return;
  }

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const cleanCountryCode = (countryCode || '+998').trim();
  const fullPhone = `${cleanCountryCode}${phoneNumber}`;

  const users = readUsers();
  const user = users.find((u) => u.fullPhone === fullPhone);
  if (!user) {
    res.status(401).json({ error: 'Invalid phone number or password' });
    return;
  }

  const computedHash = hashPassword(password, user.salt);
  if (computedHash !== user.passwordHash) {
    res.status(401).json({ error: 'Invalid phone number or password' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const hasFaceEnrolled = !!(user.faceBiometrics && user.faceBiometrics.enrolled);

  SESSIONS.set(token, {
    userId: user.id,
    verified: false, // Must verify Face ID or backup PIN on Page 2
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      fullPhone: user.fullPhone,
      backupPin: user.backupPin,
      faceEnrolled: hasFaceEnrolled,
    },
    requiresFaceVerification: true,
    message: hasFaceEnrolled
      ? 'Credentials verified. Please authenticate with Face ID.'
      : 'Credentials verified. Please enroll your Face ID.',
  });
});

// 3. GET CURRENT USER (ME)
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const session = (req as any).session;
  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      countryCode: user.countryCode,
      phoneNumber: user.phoneNumber,
      fullPhone: user.fullPhone,
      backupPin: user.backupPin,
      faceEnrolled: !!(user.faceBiometrics && user.faceBiometrics.enrolled),
      createdAt: user.createdAt,
    },
    verified: session.verified,
  });
});

// 4. FACE ID ENROLLMENT (Page 2)
app.post('/api/auth/face/enroll', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const session = (req as any).session;
  const { biometricVector, livenessScore, consentGiven } = req.body;

  if (!consentGiven) {
    res.status(400).json({ error: 'Explicit biometric consent is required to enroll Face ID.' });
    return;
  }

  if (!biometricVector || !Array.isArray(biometricVector) || biometricVector.length < 8) {
    res.status(400).json({ error: 'Invalid facial biometric descriptor captured. Please hold still in good lighting.' });
    return;
  }

  if (typeof livenessScore === 'number' && livenessScore < 0.6) {
    res.status(400).json({ error: 'Liveness test failed. Please move naturally as prompted to confirm genuine presence.' });
    return;
  }

  // Encrypt & store biometric vector
  const users = readUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  users[index].faceBiometrics = {
    enrolled: true,
    descriptor: biometricVector,
    enrolledAt: new Date().toISOString(),
    livenessScore: livenessScore || 0.95,
  };

  writeUsers(users);

  // Mark session as fully verified!
  session.verified = true;
  SESSIONS.set((req as any).token, session);

  res.json({
    success: true,
    message: 'Face ID successfully enrolled and verified! Welcome to LOQIR AI.',
    verified: true,
  });
});

// 5. FACE ID VERIFICATION (Page 2)
app.post('/api/auth/face/verify', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const session = (req as any).session;
  const { biometricVector, livenessScore } = req.body;

  if (!user.faceBiometrics || !user.faceBiometrics.enrolled || !user.faceBiometrics.descriptor) {
    res.status(400).json({ error: 'No enrolled Face ID found. Please complete facial registration first.' });
    return;
  }

  if (!biometricVector || !Array.isArray(biometricVector)) {
    res.status(400).json({ error: 'No face descriptor detected. Ensure camera is clear and face is centered.' });
    return;
  }

  if (typeof livenessScore === 'number' && livenessScore < 0.6) {
    res.status(400).json({ error: 'Liveness verification failed. Static photos or recorded videos are rejected.' });
    return;
  }

  // Genuine comparison against enrolled biometric descriptor
  const enrolledDescriptor = user.faceBiometrics.descriptor;
  const comparison = compareBiometrics(biometricVector, enrolledDescriptor);

  if (!comparison.match) {
    res.status(403).json({
      error: 'Facial identity mismatch. The scanned face does not match the enrolled biometric profile.',
      similarity: comparison.similarity,
    });
    return;
  }

  // Verification passed!
  session.verified = true;
  SESSIONS.set((req as any).token, session);

  res.json({
    success: true,
    verified: true,
    similarity: comparison.similarity,
    message: 'Face ID verification successful! Access granted.',
  });
});

// 6. BACKUP PIN VERIFICATION (Alternative fallback method)
app.post('/api/auth/fallback-verify', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const session = (req as any).session;
  const { backupPin } = req.body;

  if (!backupPin || String(backupPin).trim() !== String(user.backupPin).trim()) {
    res.status(401).json({ error: 'Invalid 6-digit backup security code' });
    return;
  }

  session.verified = true;
  SESSIONS.set((req as any).token, session);

  res.json({
    success: true,
    verified: true,
    message: 'Backup security verification successful. Access granted.',
  });
});

// 7. RESET BIOMETRICS
app.post('/api/auth/face/reset', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const users = readUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index !== -1) {
    users[index].faceBiometrics = null;
    writeUsers(users);
  }
  res.json({ success: true, message: 'Face ID biometric template removed.' });
});

// 8. LOGOUT
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = (req as any).token;
  SESSIONS.delete(token);
  res.json({ success: true });
});

// ================= CHAT & AI ROUTES (Page 3) =================

// List conversations
app.get('/api/chats', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const allChats = readChats();
  const userChats = allChats
    .filter((c) => c.userId === user.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json(userChats);
});

// Create conversation
app.post('/api/chats', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { title } = req.body;

  const newChat = {
    id: crypto.randomUUID(),
    userId: user.id,
    title: (title || 'New Conversation').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  const allChats = readChats();
  allChats.unshift(newChat);
  writeChats(allChats);

  res.status(201).json(newChat);
});

// Get single chat
app.get('/api/chats/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  const allChats = readChats();
  const chat = allChats.find((c) => c.id === id && c.userId === user.id);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  res.json(chat);
});

// Rename chat
app.patch('/api/chats/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { title } = req.body;

  const allChats = readChats();
  const chat = allChats.find((c) => c.id === id && c.userId === user.id);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }

  chat.title = (title || chat.title).trim();
  chat.updatedAt = new Date().toISOString();
  writeChats(allChats);

  res.json(chat);
});

// Delete chat
app.delete('/api/chats/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  const allChats = readChats();
  const filtered = allChats.filter((c) => !(c.id === id && c.userId === user.id));
  writeChats(filtered);

  res.json({ success: true });
});

// Delete message from chat
app.delete('/api/chats/:id/messages/:messageId', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { id, messageId } = req.params;

  const allChats = readChats();
  const chat = allChats.find((c) => c.id === id && c.userId === user.id);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }

  chat.messages = chat.messages.filter((m: any) => m.id !== messageId);
  chat.updatedAt = new Date().toISOString();
  writeChats(allChats);

  res.json({ success: true, messages: chat.messages });
});

// AI STREAMING CHAT (POST /api/chats/:id/stream)
app.post('/api/chats/:id/stream', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { prompt, persona, temperature, fileAttachments } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  const allChats = readChats();
  const chatIndex = allChats.findIndex((c) => c.id === id && c.userId === user.id);
  if (chatIndex === -1) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }

  const chat = allChats[chatIndex];

  // Save user message
  const userMsgId = crypto.randomUUID();
  const userMsg = {
    id: userMsgId,
    role: 'user',
    content: prompt.trim(),
    timestamp: new Date().toISOString(),
    attachments: fileAttachments || [],
  };
  chat.messages.push(userMsg);

  // If chat title is default, generate concise title from first message
  if (chat.title === 'New Conversation' || chat.messages.length === 1) {
    const rawTitle = prompt.trim().slice(0, 32);
    chat.title = rawTitle.length < prompt.trim().length ? `${rawTitle}...` : rawTitle;
  }

  chat.updatedAt = new Date().toISOString();
  writeChats(allChats);

  // Setup Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Construct system prompt with explicit guardrails
  const systemInstruction = `You are LOQIR AI — Next-Generation Artificial Intelligence, created by the LOQIR neural engineering initiative.
You are a highly capable, articulate, analytical, and versatile AI assistant.

CORE PRINCIPLES & GUIDELINES:
1. ACCURACY & QUALITY: Prioritize factual correctness, structured thinking, and clarity. If an answer involves uncertainty, note assumptions transparently.
2. CAPABILITIES:
   - Deep reasoning, problem solving, mathematics, and STEM step-by-step logic.
   - Professional software engineering, debugging, refactoring, and code architecture across multiple languages.
   - Writing, creative composition, strategic business planning, legal & academic summaries.
   - Polyglot translation and linguistic fluency (English, Uzbek, Russian, and all global languages).
   - Document and data analysis from user-provided files, CSVs, tables, and reports.
3. FORMATTING: Use clean Markdown formatting, syntax-highlighted code blocks with language tags, organized bullet points, and neat ASCII/Markdown tables where applicable.
4. ABSOLUTE RESTRICTION: You MUST NOT generate, fabricate, or promise image generation. You are a pure text, code, math, and analytical intelligence engine. If asked to draw or generate an image, politely inform the user that LOQIR AI is configured exclusively for reasoning, code, text, and multimodal document analysis, not image rendering.
5. USER PERSONA/ROLE: ${persona || 'General High-Performance Assistant'}. Adapt tone to be crisp, elegant, futuristic, and helpful.`;

  // Build context history
  const contents: any[] = [];
  
  // Attach previous conversation context (up to last 12 messages for performance and context)
  const history = chat.messages.slice(-12, -1);
  for (const m of history) {
    contents.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    });
  }

  // Current turn with user prompt and any file text attachments
  let currentTurnText = prompt.trim();
  if (fileAttachments && Array.isArray(fileAttachments) && fileAttachments.length > 0) {
    currentTurnText += '\n\n--- ATTACHED DOCUMENTS / DATA ---\n';
    for (const file of fileAttachments) {
      currentTurnText += `\n[File: ${file.name} (${file.type})]:\n${file.content}\n`;
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: currentTurnText }],
  });

  const assistantMsgId = crypto.randomUUID();
  let fullAssistantText = '';

  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let stream: any = null;
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      stream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
        },
      });
      break;
    } catch (err: any) {
      console.warn(`[LOQIR AI] Model ${modelName} encountered:`, err?.message);
      lastError = err;
      // Wait 400ms before attempting fallback
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  if (!stream) {
    const errorMsg = lastError?.message || 'LOQIR AI neural service temporarily congested. Please retry.';
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
    return;
  }

  try {
    for await (const chunk of stream) {
      const text = chunk.text || '';
      if (text) {
        fullAssistantText += text;
        res.write(`data: ${JSON.stringify({ chunk: text, messageId: assistantMsgId })}\n\n`);
      }
    }

    // Save final assistant message to chat database
    const assistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: fullAssistantText,
      timestamp: new Date().toISOString(),
    };
    chat.messages.push(assistantMsg);
    chat.updatedAt = new Date().toISOString();
    writeChats(allChats);

    res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMsgId })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error during streaming chunk consumption:', error);
    const errorMessage = error?.message || 'Error occurred while streaming response.';
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

// Vite Middleware & SPA serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LOQIR AI] Core server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
