import React, { useState } from 'react';
import { Settings, BrainCircuit, Globe, MessageSquare, X, Trash2, Clock, Pencil } from 'lucide-react';
import { ChatConfig, AVAILABLE_MODELS, ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  config: ChatConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onNewChat: () => void;
}

const NexusLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" className="fill-indigo-500/20 stroke-indigo-400" strokeWidth="2"/>
    <path d="M12 6L12 18M6 9L18 15M18 9L6 15" className="stroke-purple-400" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  setConfig, 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onDeleteSession,
  onRenameSession,
  onNewChat 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
  };

  const saveEditing = () => {
    if (editingId) {
        if (editValue.trim()) {
            onRenameSession(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        saveEditing();
    } else if (e.key === 'Escape') {
        setEditingId(null);
        setEditValue('');
    }
  };

  return (
    <>
      {/* Backdrop (Mobile Only) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-black/40 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:w-80 flex flex-col shadow-2xl`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-lg bg-white/5 border border-white/10">
               <NexusLogo />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 bg-clip-text text-transparent">
              Neby
            </h2>
          </div>
          <button onClick={onClose} className="lg:hidden text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 shrink-0">
            <button 
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="group w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-100 py-3 rounded-xl transition-all font-semibold shadow-lg shadow-indigo-900/20 active:scale-[0.98] border border-indigo-500/30 hover:border-indigo-500/50"
            >
              <MessageSquare size={18} className="text-indigo-300 group-hover:text-indigo-200" />
              New Chat
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <div className="p-4 space-y-8">

            {/* Recent Chats Section */}
            {sessions.length > 0 && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-2">
                  <Clock size={10} /> Recent
                </label>
                <div className="space-y-1">
                  {sessions.slice().reverse().map(session => (
                    <div 
                      key={session.id}
                      onClick={() => {
                        onSelectSession(session.id);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
                        currentSessionId === session.id
                          ? 'bg-white/10 border-white/10 text-zinc-100 shadow-md'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border-transparent hover:border-white/5'
                      }`}
                    >
                      {editingId === session.id ? (
                        <div className="flex items-center gap-2 w-full">
                             <input
                              type="text"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEditing}
                              onKeyDown={handleKeyDown}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-black/20 text-white text-sm rounded px-2 py-1 w-full border border-indigo-500/50 outline-none focus:ring-1 focus:ring-indigo-500/50"
                            />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentSessionId === session.id ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-zinc-700'}`} />
                            <span className="text-sm truncate font-medium">{session.title}</span>
                          </div>
                          <div className={`flex items-center opacity-0 group-hover:opacity-100 transition-opacity ${currentSessionId === session.id ? 'opacity-100' : ''}`}>
                            <button
                                onClick={(e) => startEditing(e, session)}
                                className="p-1.5 rounded-md hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors mr-1"
                                title="Rename chat"
                            >
                                <Pencil size={12} />
                            </button>
                            <button
                              onClick={(e) => onDeleteSession(session.id, e)}
                              className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors"
                              title="Delete chat"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Model Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Model</label>
              <div className="space-y-2">
                {AVAILABLE_MODELS.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setConfig(prev => ({ ...prev, model: m.id }))}
                    className={`p-3 rounded-lg border cursor-pointer transition-all relative overflow-hidden ${
                      config.model === m.id 
                        ? 'bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-500/40' 
                        : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 relative z-10">
                      <span className={`font-medium text-sm ${config.model === m.id ? 'text-indigo-300' : 'text-zinc-300'}`}>
                        {m.name}
                      </span>
                      {config.model === m.id && <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 relative z-10">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Capabilities</label>
              
              {/* Thinking Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${config.useThinking ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-zinc-500'}`}>
                    <BrainCircuit size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Deep Thinking</div>
                    <div className="text-[10px] text-zinc-500">Reasoning capabilities</div>
                  </div>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, useThinking: !prev.useThinking }))}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    config.useThinking ? 'bg-purple-600' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${
                    config.useThinking ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Search Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${config.useSearch ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-zinc-500'}`}>
                    <Globe size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Google Search</div>
                    <div className="text-[10px] text-zinc-500">Real-time web data</div>
                  </div>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, useSearch: !prev.useSearch }))}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    config.useSearch ? 'bg-blue-600' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${
                    config.useSearch ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* System Instruction */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">System Persona</label>
              <textarea 
                value={config.systemInstruction}
                onChange={(e) => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                className="w-full h-24 bg-black/20 border border-white/10 rounded-lg p-3 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 resize-none placeholder-zinc-600 transition-all backdrop-blur-sm"
                placeholder="How should the AI behave?"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 shrink-0 bg-black/20">
          <div className="flex items-center gap-2 text-zinc-500 text-[11px] justify-center">
            <Settings size={12} />
            <span>Powered by Google Gemini</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;