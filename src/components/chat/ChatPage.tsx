import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Chat, Message, Attachment } from '../../types';
import { ChatSidebar } from './ChatSidebar';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { Logo } from '../Logo';
import {
  Menu,
  Download,
  Share2,
  Trash2,
  Sparkles,
  Code2,
  Calculator,
  FileSearch,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface ChatPageProps {
  onOpenSettings?: () => void;
  onOpenBackupPin?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onOpenSettings, onOpenBackupPin }) => {
  const { user, settings } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, streamingText]);

  // Load chat list on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const data = await api.getChats();
      setChats(data);
      if (data.length > 0 && !activeChatId) {
        setActiveChatId(data[0].id);
        setActiveChat(data[0]);
      } else if (data.length === 0) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  // Load active chat when ID changes
  useEffect(() => {
    if (!activeChatId) return;
    const fetchChat = async () => {
      try {
        const c = await api.getChat(activeChatId);
        setActiveChat(c);
      } catch (err) {
        console.error('Failed to get chat:', err);
      }
    };
    fetchChat();
  }, [activeChatId]);

  const handleNewChat = async () => {
    try {
      const newChat = await api.createChat('New Conversation');
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setActiveChat(newChat);
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setSidebarOpen(false);
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    try {
      const updated = await api.renameChat(id, newTitle);
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)));
      if (activeChat?.id === id) {
        setActiveChat((prev) => (prev ? { ...prev, title: updated.title } : null));
      }
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await api.deleteChat(id);
      const remaining = chats.filter((c) => c.id !== id);
      setChats(remaining);
      if (activeChatId === id) {
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Send message with streaming response
  const handleSendMessage = (prompt: string, attachments: Attachment[]) => {
    if (!activeChatId || isStreaming) return;

    // Immediately push user message into UI
    const tempUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
      attachments,
    };

    setActiveChat((prev) =>
      prev ? { ...prev, messages: [...prev.messages, tempUserMessage] } : null
    );

    setIsStreaming(true);
    setStreamingText('');
    setStreamingMessageId(`assistant-${Date.now()}`);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    api.streamMessage(
      activeChatId,
      {
        prompt,
        persona: settings.persona,
        temperature: settings.temperature,
        fileAttachments: attachments,
      },
      (chunk) => {
        setStreamingText((prev) => prev + chunk);
      },
      (completedMessageId) => {
        setIsStreaming(false);
        setStreamingText('');
        setStreamingMessageId(null);
        abortControllerRef.current = null;
        // Refresh chat messages from server to keep database in sync
        api.getChat(activeChatId).then((refreshed) => {
          setActiveChat(refreshed);
          setChats((prev) =>
            prev.map((c) => (c.id === activeChatId ? { ...c, title: refreshed.title, updatedAt: refreshed.updatedAt } : c))
          );
        });
      },
      (error) => {
        console.error('Streaming error:', error);
        setIsStreaming(false);
        setStreamingText('');
        setStreamingMessageId(null);
        abortControllerRef.current = null;
      },
      controller.signal
    );
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamingText('');
      setStreamingMessageId(null);
      if (activeChatId) {
        api.getChat(activeChatId).then(setActiveChat);
      }
    }
  };

  // Message Actions
  const handleRegenerate = () => {
    if (!activeChat || activeChat.messages.length === 0 || isStreaming) return;
    // Find last user message
    const lastUserMsg = [...activeChat.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, lastUserMsg.attachments || []);
    }
  };

  const handleEditMessage = (newContent: string) => {
    handleSendMessage(newContent, []);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChatId) return;
    try {
      const res = await api.deleteMessage(activeChatId, messageId);
      setActiveChat((prev) => (prev ? { ...prev, messages: res.messages } : null));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Export Chat
  const handleExportChat = (format: 'markdown' | 'json') => {
    if (!activeChat) return;
    let dataStr = '';
    let filename = '';

    if (format === 'markdown') {
      filename = `${activeChat.title.replace(/\s+/g, '_')}.md`;
      dataStr = `# ${activeChat.title}\n*LOQIR AI Conversation • Exported ${new Date().toLocaleString()}*\n\n---\n\n`;
      activeChat.messages.forEach((m) => {
        dataStr += `### ${m.role === 'user' ? 'User' : 'LOQIR AI'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n---\n\n`;
      });
    } else {
      filename = `${activeChat.title.replace(/\s+/g, '_')}.json`;
      dataStr = JSON.stringify(activeChat, null, 2);
    }

    const blob = new Blob([dataStr], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Starter prompt helpers
  const starterPrompts = [
    {
      title: 'Architect Code',
      desc: 'Build clean, type-safe fullstack components',
      prompt: 'Write a high-performance TypeScript React hook for debounced real-time search with error handling and AbortController.',
      icon: Code2,
    },
    {
      title: 'Complex Math & Logic',
      desc: 'Step-by-step mathematical reasoning',
      prompt: 'Solve and explain step-by-step: Find the eigenvalues and eigenvectors of matrix A = [[4, 2], [1, 3]].',
      icon: Calculator,
    },
    {
      title: 'Analyze & Summarize',
      desc: 'Extract key insights and structured tables',
      prompt: 'Outline a comprehensive executive summary comparing Cloud Run microservices vs serverless Kubernetes architectures.',
      icon: FileSearch,
    },
    {
      title: 'Multilingual Translation',
      desc: 'Nuanced translations in Uzbek, English & more',
      prompt: 'Translate the following technical concept into natural, fluent Uzbek (Oʻzbek tili) and explain key architectural terms.',
      icon: BookOpen,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#07090e]">
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={onOpenSettings}
        onOpenBackupPin={onOpenBackupPin}
      />

      {/* Main Chat Center Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#07090e] relative">
        {/* Top Chat Bar */}
        <div className="h-14 px-4 sm:px-6 border-b border-white/5 flex items-center justify-between bg-[#090d16]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-sm text-slate-200 truncate">
                {activeChat?.title || 'LOQIR Conversation'}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-mono">
                <Sparkles className="w-2.5 h-2.5" /> Gemini 3.8 Core
              </span>
            </div>
          </div>

          {/* Export Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExportChat('markdown')}
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/[0.04] transition-colors text-xs flex items-center gap-1.5"
              title="Export Conversation as Markdown"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export MD</span>
            </button>
            <button
              onClick={() => handleExportChat('json')}
              className="p-2 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-white/[0.04] transition-colors text-xs flex items-center gap-1.5"
              title="Export Conversation as JSON"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>

        {/* Message Scroll Container */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-6 space-y-4">
          {/* Empty Conversation Welcome Screen */}
          {(!activeChat?.messages || activeChat.messages.length === 0) && (
            <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-8">
              <div className="flex flex-col items-center space-y-4">
                <Logo size="xl" />
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Welcome to{' '}
                    <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                      LOQIR AI
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                    Next-generation artificial intelligence with step-by-step reasoning, polyglot coding, and mathematical precision.
                  </p>
                </div>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {starterPrompts.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(card.prompt, [])}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all group flex flex-col justify-between text-left"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300 transition-colors">
                            {card.title}
                          </span>
                          <Icon className="w-4 h-4 text-purple-400 group-hover:text-cyan-400 transition-colors" />
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {card.desc}
                        </p>
                      </div>
                      <div className="pt-3 flex items-center gap-1 text-[10px] text-cyan-400 font-medium">
                        <span>Send prompt</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Render Chat Messages */}
          {activeChat?.messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onRegenerate={handleRegenerate}
              onEdit={handleEditMessage}
              onDelete={() => handleDeleteMessage(message.id)}
            />
          ))}

          {/* Active Streaming Assistant Response Bubble */}
          {isStreaming && (
            <MessageItem
              message={{
                id: streamingMessageId || 'streaming',
                role: 'assistant',
                content: streamingText || 'Synthesizing response...',
                timestamp: new Date().toISOString(),
              }}
              isStreaming={true}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock at Bottom */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
};
