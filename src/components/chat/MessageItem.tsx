import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Attachment } from '../../types';
import { Logo } from '../Logo';
import {
  Copy,
  Check,
  Volume2,
  Square,
  RotateCw,
  Trash2,
  Edit2,
  FileText,
  Download,
  Sparkles,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  onEdit,
  onDelete,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text to Speech
  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const cleanText = message.content
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/[#*`_~]/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Download message content as .md
  const handleDownload = () => {
    const blob = new Blob([message.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loqir-${message.role}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(editContent.trim());
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group relative flex gap-3.5 py-4 px-4 sm:px-6 rounded-2xl transition-colors ${
        isUser
          ? 'bg-purple-950/20 border border-purple-500/10 ml-auto max-w-3xl'
          : 'bg-[#0f1422]/60 border border-white/5 mr-auto max-w-4xl w-full'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
            U
          </div>
        ) : (
          <div className="relative">
            <Logo size="sm" showText={false} />
          </div>
        )}
      </div>

      {/* Message Content Container */}
      <div className="flex-1 min-w-0 space-y-2 text-left">
        {/* Header line: Role and Timestamp */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {isUser ? 'You' : 'LOQIR AI'}
            </span>
            {!isUser && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                v3.8 Neural
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Attached Files Chips */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 pb-1">
            {message.attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-cyan-300"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="max-w-[180px] truncate">{att.name}</span>
                <span className="text-[9px] text-slate-500">
                  ({(att.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Body content / Edit mode */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 bg-black/50 border border-white/20 rounded-xl text-slate-100 text-sm font-sans focus:outline-none focus:border-cyan-400 min-h-[90px]"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium"
              >
                Save & Update
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-slate-200 markdown-content overflow-x-auto">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Code block with syntax styling & Copy Code button
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    if (!inline && match) {
                      return (
                        <div className="relative my-3 rounded-xl overflow-hidden border border-white/10 bg-[#090d16] font-mono text-xs">
                          {/* Code Header Bar */}
                          <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.04] border-b border-white/5 text-slate-400">
                            <span className="text-[11px] font-semibold uppercase text-cyan-300">
                              {match[1]}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(codeString);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy code</span>
                            </button>
                          </div>
                          <div className="p-4 overflow-x-auto text-slate-200 selection:bg-purple-600/40">
                            <pre className="!bg-transparent !p-0 !m-0 font-mono leading-relaxed">
                              <code>{children}</code>
                            </pre>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-xs"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  // Formatted Tables
                  table({ children }: any) {
                    return (
                      <div className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                        <table className="w-full text-left text-xs border-collapse">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children }: any) {
                    return <thead className="bg-white/[0.06] text-cyan-300 border-b border-white/10">{children}</thead>;
                  },
                  th({ children }: any) {
                    return <th className="p-2.5 font-semibold">{children}</th>;
                  },
                  td({ children }: any) {
                    return <td className="p-2.5 border-b border-white/5 text-slate-300">{children}</td>;
                  },
                  // Lists
                  ul({ children }: any) {
                    return <ul className="my-2 list-disc list-inside space-y-1 text-slate-300">{children}</ul>;
                  },
                  ol({ children }: any) {
                    return <ol className="my-2 list-decimal list-inside space-y-1 text-slate-300">{children}</ol>;
                  },
                  // Headings
                  h1({ children }: any) {
                    return <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>;
                  },
                  h2({ children }: any) {
                    return <h2 className="text-lg font-bold text-white mt-3 mb-1.5">{children}</h2>;
                  },
                  h3({ children }: any) {
                    return <h3 className="text-base font-semibold text-cyan-200 mt-2 mb-1">{children}</h3>;
                  },
                  blockquote({ children }: any) {
                    return (
                      <blockquote className="my-2 border-l-2 border-purple-500 pl-3 italic text-slate-400">
                        {children}
                      </blockquote>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}

            {/* Streaming Pulse Cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
            )}
          </div>
        )}

        {/* Message Action Bar */}
        <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 text-xs">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors"
            title="Copy message text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Text-to-Speech (for assistant) */}
          {!isUser && (
            <button
              onClick={handleSpeak}
              className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors"
              title={isSpeaking ? 'Stop voice reading' : 'Read aloud with Text-to-Speech'}
            >
              {isSpeaking ? (
                <Square className="w-3.5 h-3.5 text-rose-400 fill-current" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Regenerate (for assistant or last turn) */}
          {!isUser && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors"
              title="Regenerate LOQIR AI response"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Edit (for user) */}
          {isUser && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors"
              title="Edit message"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download message as markdown file */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors"
            title="Download as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Delete message */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
