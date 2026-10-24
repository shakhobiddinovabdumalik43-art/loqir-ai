export interface User {
  id: string;
  fullName: string;
  countryCode: string;
  phoneNumber: string;
  fullPhone: string;
  backupPin: string;
  faceEnrolled: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  requiresFaceVerification?: boolean;
  message?: string;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  content: string; // extracted text content for the AI to analyze
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface AppSettings {
  theme: 'dark' | 'light';
  temperature: number;
  persona: string;
  speechSpeed: number;
  language: string;
}

export interface BiometricDescriptor {
  vector: number[];
  livenessScore: number;
  timestamp: number;
}
