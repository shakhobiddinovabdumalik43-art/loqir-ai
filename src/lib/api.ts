import { User, AuthResponse, Chat, Message, Attachment } from '../types';

const TOKEN_KEY = 'loqir_auth_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Network request failed');
    }

    return data as T;
  },

  // Auth API
  async register(data: {
    fullName: string;
    countryCode: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
  }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  },

  async login(data: {
    countryCode: string;
    phoneNumber: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  },

  async getCurrentUser(): Promise<{ user: User; verified: boolean }> {
    return this.request<{ user: User; verified: boolean }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  },

  // Biometrics Face ID API
  async enrollFace(biometricVector: number[], livenessScore: number, consentGiven: boolean) {
    return this.request<{ success: boolean; message: string; verified: boolean }>(
      '/api/auth/face/enroll',
      {
        method: 'POST',
        body: JSON.stringify({ biometricVector, livenessScore, consentGiven }),
      }
    );
  },

  async verifyFace(biometricVector: number[], livenessScore: number) {
    return this.request<{ success: boolean; verified: boolean; similarity: number; message: string }>(
      '/api/auth/face/verify',
      {
        method: 'POST',
        body: JSON.stringify({ biometricVector, livenessScore }),
      }
    );
  },

  async fallbackVerify(backupPin: string) {
    return this.request<{ success: boolean; verified: boolean; message: string }>(
      '/api/auth/fallback-verify',
      {
        method: 'POST',
        body: JSON.stringify({ backupPin }),
      }
    );
  },

  async resetFaceBiometrics() {
    return this.request<{ success: boolean; message: string }>('/api/auth/face/reset', {
      method: 'POST',
    });
  },

  // Chats API
  async getChats(): Promise<Chat[]> {
    return this.request<Chat[]>('/api/chats');
  },

  async createChat(title?: string): Promise<Chat> {
    return this.request<Chat>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  async getChat(id: string): Promise<Chat> {
    return this.request<Chat>(`/api/chats/${id}`);
  },

  async renameChat(id: string, title: string): Promise<Chat> {
    return this.request<Chat>(`/api/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  async deleteChat(id: string): Promise<void> {
    await this.request(`/api/chats/${id}`, { method: 'DELETE' });
  },

  async deleteMessage(chatId: string, messageId: string): Promise<{ messages: Message[] }> {
    return this.request<{ messages: Message[] }>(`/api/chats/${chatId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  // Streaming AI response
  streamMessage(
    chatId: string,
    payload: {
      prompt: string;
      persona?: string;
      temperature?: number;
      fileAttachments?: Attachment[];
    },
    onChunk: (chunk: string) => void,
    onDone: (messageId: string) => void,
    onError: (err: string) => void,
    signal?: AbortSignal
  ) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`/api/chats/${chatId}/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No readable stream available');

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  onError(data.error);
                  return;
                }
                if (data.chunk) {
                  onChunk(data.chunk);
                }
                if (data.done) {
                  onDone(data.messageId);
                  return;
                }
              } catch (e) {
                console.error('Failed to parse SSE line:', line);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          console.log('Stream aborted by user');
        } else {
          onError(err.message || 'Stream connection failed');
        }
      });
  },
};
