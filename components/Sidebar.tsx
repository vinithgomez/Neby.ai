import React, { useState } from 'react';
import { Settings, BrainCircuit, Globe, MessageSquare, X, Trash2, Clock, Pencil, Brain, Sparkles, MapPin, MonitorPlay, LogOut, LogIn, ChevronRight, Zap } from 'lucide-react';
import { ChatConfig, AVAILABLE_MODELS, ChatSession, User as UserType } from '../types';

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
  user: UserType | null;
  onLogout: () => void;
  onTriggerLogin?: () => void;
}

const NebyLogo = () => (
  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10 relative overflow-hidden group">
    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    <Brain size={18} className="text-white relative z-10" />
    <Sparkles size={12} className="text-indigo-200 absolute top-1 right-1 opacity-50" />
  </div>
);

export default function Sidebar({ 
  isOpen, 
  onClose, 
  config, 
  setConfig, 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onDeleteSession,
  onRenameSession,
  onNewChat,
  user,
  onLogout,
  onTriggerLogin
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditValue(session.title);
  };

  const saveEditing = () => {
    if (editingId) {
        if (editValue.trim() && editValue.trim() !== sessions.find(s => s.id === editingId)?.title) {
            onRenameSession(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEditing();
    else if (e.key === 'Escape') {
        setEditingId(null);
        setEditValue('');
    }
  };

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === config.model);
  const validSessions = sessions.filter(s => s.messages.length > 0);

  return (
    <>
      <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-[#09090b]/95 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.5)]`}>
        
        {/* Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3.5">
            <NebyLogo />
            <h2 className="text-lg font-bold text-white tracking-tight leading-none">Neby</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all"><X size={18} /></button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 space-y-8">
            
           {/* New Chat & History */}
           <div className="space-y-4">
              <button onClick={() => { onNewChat(); if (window.innerWidth < 1024) onClose(); }} className="w-full group flex items-center justify-center gap-2 bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 text-zinc-100 py-3.5 rounded-xl transition-all border border-white/5 hover:border-white/10 shadow-sm active:scale-[0.98]">
                <MessageSquare size={16} className="text-indigo-400" />
                <span className="text-sm font-semibold">New Chat</span>
              </button>

              {validSessions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 mb-2">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent Activity</span>
                  </div>
                  <div className="space-y-0.5">
                    {validSessions.slice().reverse().slice(0, 8).map(session => (
                      <div key={session.id} onClick={() => { onSelectSession(session.id); if (window.innerWidth < 1024) onClose(); }} className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-indigo-500/10 text-indigo-200' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-300'}`}>
                        {editingId === session.id ? (
                           <input type="text" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEditing} onKeyDown={handleKeyDown} onClick={(e) => e.stopPropagation()} className="w-full bg-black/40 text-sm rounded px-2 py-1 border border-indigo-500/50 outline-none" />
                        ) : (
                          <>
                             <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentSessionId === session.id ? 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]' : 'bg-zinc-700 group-hover:bg-zinc-600'}`} />
                                <span className="text-sm truncate font-medium">{session.title}</span>
                             </div>
                             
                             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-[#09090b] shadow-xl rounded-md border border-white/10 z-10">
                                <button onClick={(e) => startEditing(e, session)} className="p-1.5 hover:text-indigo-300 transition-colors"><Pencil size={11} /></button>
                                <button onClick={(e) => onDeleteSession(session.id, e)} className="p-1.5 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                             </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
           </div>

            {/* Model Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Zap size={11} /> Model Intelligence
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {AVAILABLE_MODELS.map((m) => (
                  <div key={m.id} onClick={() => setConfig(prev => ({ ...prev, model: m.id }))} 
                    className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 group/model
                    ${config.model === m.id 
                      ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                      : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-semibold ${config.model === m.id ? 'text-indigo-300' : 'text-zinc-300 group-hover/model:text-white'}`}>{m.name}</span>
                      {config.model === m.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-3">
               <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Active Tools</label>
               
               {selectedModel?.supportsThinking && (
                 <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 transition-colors hover:border-white/10">
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${config.useThinking ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-zinc-600'}`}><BrainCircuit size={16} /></div>
                       <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-200">Deep Reasoning</span>
                          <span className="text-[10px] text-zinc-500">Enable chain-of-thought</span>
                       </div>
                    </div>
                    <button onClick={() => setConfig(prev => ({ ...prev, useThinking: !prev.useThinking }))} className={`w-10 h-5 rounded-full transition-all relative ${config.useThinking ? 'bg-purple-600' : 'bg-zinc-800'}`}>
                       <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform shadow-sm ${config.useThinking ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                 </div>
               )}

               {selectedModel?.supportsSearch && (
                 <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 transition-colors hover:border-white/10">
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${config.useSearch ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-zinc-600'}`}><Globe size={16} /></div>
                       <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-200">Google Search</span>
                          <span className="text-[10px] text-zinc-500">Live web grounding</span>
                       </div>
                    </div>
                    <button onClick={() => setConfig(prev => ({ ...prev, useSearch: !prev.useSearch }))} className={`w-10 h-5 rounded-full transition-all relative ${config.useSearch ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                       <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform shadow-sm ${config.useSearch ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                 </div>
               )}

               {(selectedModel?.supportsImageGen || selectedModel?.supportsVideoGen) && (
                 <div className="pt-2 border-t border-white/10 mt-2 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select value={config.aspectRatio} onChange={(e) => setConfig(prev => ({ ...prev, aspectRatio: e.target.value }))} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-zinc-300 outline-none focus:border-indigo-500/50 appearance-none">
                         <option value="1:1">1:1 Square</option>
                         <option value="16:9">16:9 Landscape</option>
                         <option value="9:16">9:16 Portrait</option>
                      </select>
                      {selectedModel.id.includes('pro-image') && (
                        <select value={config.imageSize} onChange={(e) => setConfig(prev => ({ ...prev, imageSize: e.target.value }))} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-zinc-300 outline-none focus:border-indigo-500/50 appearance-none">
                          <option value="1K">1K Res</option>
                          <option value="2K">2K Res</option>
                        </select>
                      )}
                    </div>
                 </div>
               )}
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Persona</label>
               <textarea 
                 value={config.systemInstruction} 
                 onChange={(e) => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))} 
                 className="w-full h-20 bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:bg-black/40 focus:border-indigo-500/30 resize-none transition-all placeholder-zinc-600" 
                 placeholder="Custom system instructions..." 
               />
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 shrink-0 bg-black/20 backdrop-blur-md">
          {user && !user.isAnonymous ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1px] shrink-0">
                 <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" className="w-full h-full rounded-full bg-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-zinc-400 truncate">{user.email}</div>
              </div>
              <button onClick={onLogout} className="p-1.5 text-zinc-500 hover:text-white transition-colors" title="Sign out"><LogOut size={14} /></button>
            </div>
          ) : (
             <button onClick={onTriggerLogin} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-xs font-medium text-zinc-300 group">
                <div className="flex items-center gap-2">
                   <Settings size={14} />
                   <span>Guest Mode</span>
                </div>
                <div className="flex items-center gap-1 text-indigo-400">
                  <LogIn size={14} />
                  <span>Sign In</span>
                </div>
             </button>
          )}
        </div>
      </div>
    </>
  );
}