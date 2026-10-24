import React, { useState } from 'react';
import { Chat } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../Logo';
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  ShieldCheck,
  KeyRound,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenSettings?: () => void;
  onOpenBackupPin?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  activeChatId,
  isOpen,
  onToggleOpen,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onOpenSettings,
  onOpenBackupPin,
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const saveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation from LOQIR memory?')) {
      onDeleteChat(id);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 bg-[#090d16] border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <button
              onClick={onToggleOpen}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-cyan-500/30 hover:from-purple-600/50 hover:to-cyan-500/50 border border-cyan-500/30 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all"
          >
            <Plus className="w-4 h-4 text-cyan-300" />
            <span>New Neural Conversation</span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/5 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Memory Vault ({filteredChats.length})
          </div>

          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs">
              {searchQuery ? 'No matching conversations' : 'No past conversations yet.'}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isEditing = chat.id === editingId;

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-950/40 to-cyan-950/30 border border-cyan-500/30 text-cyan-200 shadow-sm'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />

                    {isEditing ? (
                      <form
                        onSubmit={(e) => saveRename(chat.id, e)}
                        className="flex items-center gap-1 flex-1 min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-black/60 px-2 py-0.5 rounded text-xs text-white border border-cyan-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => saveRename(chat.id, e)}
                          className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="p-1 text-slate-400 hover:bg-white/10 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </form>
                    ) : (
                      <span className="truncate text-left text-xs font-medium">
                        {chat.title}
                      </span>
                    )}
                  </div>

                  {/* Actions on hover (rename / delete) */}
                  {!isEditing && (
                    <div className="hidden group-hover:flex items-center gap-1 pl-1">
                      <button
                        onClick={(e) => startRename(chat, e)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                        title="Rename conversation"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => confirmDelete(chat.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Profile Section */}
        {user && (
          <div className="p-3 border-t border-white/10 bg-black/40 space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
                  {user.fullName.charAt(0)}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" /> Face ID Verified
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10"
                    title="Settings"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  title="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Backup PIN trigger */}
            {onOpenBackupPin && (
              <button
                onClick={onOpenBackupPin}
                className="w-full py-1.5 px-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-[11px] text-slate-300 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-1.5 text-slate-400">
                  <KeyRound className="w-3 h-3 text-purple-400" /> Security PIN
                </span>
                <span className="font-mono text-cyan-400 font-bold">••••••</span>
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
