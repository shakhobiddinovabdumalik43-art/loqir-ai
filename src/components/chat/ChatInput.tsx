import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../../types';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (prompt: string, attachments: Attachment[]) => void;
  onStopGeneration?: () => void;
  isStreaming?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  isStreaming = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  // Voice speech-to-text setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        setIsRecording(false);
      }
    }
  };

  // File Upload Handler (Text extraction for document analysis)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Limit file size to 8MB
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds 8MB limit.`);
        setTimeout(() => setErrorMessage(null), 3500);
        continue;
      }

      try {
        const textContent = await file.text();
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            content: textContent.slice(0, 50000), // Max 50k chars per attachment
          },
        ]);
      } catch (err) {
        console.error('Failed to read file:', err);
        setErrorMessage(`Unable to parse content of ${file.name}`);
        setTimeout(() => setErrorMessage(null), 3500);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if ((!prompt.trim() && attachments.length === 0) || isStreaming) return;

    onSendMessage(prompt.trim(), attachments);
    setPrompt('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {errorMessage && (
        <div className="mb-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Attached Document Chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-xl bg-black/40 border border-white/5">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-cyan-500/30 text-xs text-cyan-300"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-slate-400 hover:text-white ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Box */}
      <div className="relative backdrop-blur-2xl bg-[#0d111a]/95 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.json,.csv,.py,.js,.ts,.html,.css,.sql,.c,.cpp,.java,.sh"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex items-end gap-2 p-3">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/[0.06] transition-colors flex-shrink-0"
            title="Attach document or dataset (TXT, CSV, JSON, MD, Code)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`p-2 rounded-xl transition-all flex-shrink-0 ${
              isRecording
                ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/30'
                : 'text-slate-400 hover:text-purple-300 hover:bg-white/[0.06]'
            }`}
            title={isRecording ? 'Listening... click to stop' : 'Voice input'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask LOQIR AI anything, generate code, solve math, or analyze files..."
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none max-h-44 py-1.5 leading-relaxed font-sans"
          />

          {/* Action Button: Send or Stop */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 flex-shrink-0 transition-colors shadow-sm"
              title="Stop response generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!prompt.trim() && attachments.length === 0}
              className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white disabled:opacity-40 disabled:pointer-events-none flex-shrink-0 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-3 pb-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            LOQIR Neural Model • Shift+Enter for new line
          </span>
          <span className="text-slate-600">No Image Generation</span>
        </div>
      </div>
    </div>
  );
};
