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
  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm relative overflow-hidden group">
    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    <span className="text-black font-['Space_Grotesk'] font-bold tracking-tighter text-sm">N.</span>
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
      
      <div className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-[#030303] border-r border-[#1a1a1a] transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        
        {/* Header */}
        <div className="h-16 px-5 flex items-center justify-between shrink-0 mb-2 mt-2">
          <div className="flex items-center gap-3">
            <NebyLogo />
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-md transition-all"><X size={16} /></button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 space-y-8">
            
           {/* New Chat & History */}
           <div className="space-y-4">
              <button onClick={() => { onNewChat(); if (window.innerWidth < 1024) onClose(); }} className="w-full group flex items-center justify-start px-3 gap-2 bg-[#121212] hover:bg-[#1a1a1a] text-zinc-100 py-2.5 rounded-lg transition-all border border-[#222]">
                <MessageSquare size={14} className="text-zinc-400" />
                <span className="text-xs font-medium">New Session</span>
              </button>

              {validSessions.length > 0 && (
                <div className="space-y-1 mt-4">
                  <div className="px-2 mb-2">
                     <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest font-['Space_Grotesk']">History</span>
                  </div>
                  <div className="space-y-0.5">
                    {validSessions.slice().reverse().slice(0, 8).map(session => (
                      <div key={session.id} onClick={() => { onSelectSession(session.id); if (window.innerWidth < 1024) onClose(); }} className={`group relative flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-[#1a1a1a] text-zinc-100' : 'text-zinc-500 hover:bg-[#0f0f0f] hover:text-zinc-300'}`}>
                        {editingId === session.id ? (
                           <input type="text" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEditing} onKeyDown={handleKeyDown} onClick={(e) => e.stopPropagation()} className="w-full bg-black/40 text-sm rounded px-2 py-1 border border-indigo-500/50 outline-none" />
                        ) : (
                          <>
                             <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className={`text-xs truncate font-medium`}>{session.title}</span>
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
              <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 font-['Space_Grotesk']">
                Intelligence
              </label>
              <div className="grid grid-cols-1 gap-1">
                {AVAILABLE_MODELS.map((m) => (
                  <div key={m.id} onClick={() => setConfig(prev => ({ ...prev, model: m.id }))} 
                    className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 group/model
                    ${config.model === m.id 
                      ? 'bg-[#1a1a1a] border-[#333]' 
                      : 'bg-transparent border-transparent hover:bg-[#0f0f0f] hover:border-[#222]'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${config.model === m.id ? 'text-zinc-100' : 'text-zinc-400 group-hover/model:text-zinc-300'}`}>{m.name}</span>
                      {config.model === m.id && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                    </div>
                    <p className="text-[10px] text-zinc-600 leading-snug line-clamp-2">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-3 pt-4">
               <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 font-['Space_Grotesk']">System</label>
               
               {/* Cosmic Mode Toggle */}
               <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#0f0f0f] transition-colors cursor-pointer" onClick={() => setConfig(prev => ({ ...prev, useCosmicMode: !prev.useCosmicMode }))}>
                  <div className="flex items-center gap-3">
                     <div className={`p-1.5 rounded ${config.useCosmicMode ? 'bg-white text-black' : 'text-zinc-500'}`}><Sparkles size={14} /></div>
                     <span className="text-xs font-medium text-zinc-300">Cosmic Mode</span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${config.useCosmicMode ? 'bg-white' : 'border border-zinc-700'}`} />
               </div>

               {selectedModel?.supportsThinking && (
                 <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#0f0f0f] transition-colors cursor-pointer" onClick={() => setConfig(prev => ({ ...prev, useThinking: !prev.useThinking }))}>
                    <div className="flex items-center gap-3">
                       <div className={`p-1.5 rounded ${config.useThinking ? 'bg-white text-black' : 'text-zinc-500'}`}><BrainCircuit size={14} /></div>
                       <span className="text-xs font-medium text-zinc-300">Deep Chain</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${config.useThinking ? 'bg-white' : 'border border-zinc-700'}`} />
                 </div>
               )}

               {selectedModel?.supportsSearch && (
                 <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#0f0f0f] transition-colors cursor-pointer" onClick={() => setConfig(prev => ({ ...prev, useSearch: !prev.useSearch }))}>
                    <div className="flex items-center gap-3">
                       <div className={`p-1.5 rounded ${config.useSearch ? 'bg-white text-black' : 'text-zinc-500'}`}><Globe size={14} /></div>
                       <span className="text-xs font-medium text-zinc-300">Web Grounding</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${config.useSearch ? 'bg-white' : 'border border-zinc-700'}`} />
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

            <div className="space-y-2 pt-2">
               <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 font-['Space_Grotesk']">System Prompt</label>
               <textarea 
                 value={config.systemInstruction} 
                 onChange={(e) => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))} 
                 className="w-full h-20 bg-[#0a0a0a] border border-[#222] rounded-lg p-3 text-xs text-zinc-300 focus:outline-none focus:bg-[#111] focus:border-[#444] resize-none transition-all placeholder-zinc-700 font-mono" 
                 placeholder="Custom system instructions..." 
               />
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a1a1a] shrink-0 bg-[#030303]">
          {user && !user.isAnonymous ? (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[#0a0a0a] border border-[#222]">
              <div className="w-7 h-7 rounded-full bg-[#222] shrink-0 overflow-hidden">
                 <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" className="w-full h-full bg-[#111]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-200 truncate">{user.name}</div>
                <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
              </div>
              <button onClick={onLogout} className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors" title="Sign out"><LogOut size={12} /></button>
            </div>
          ) : (
             <button onClick={onTriggerLogin} className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#0a0a0a] hover:bg-[#111] border border-[#222] hover:border-[#333] transition-all text-xs font-medium text-zinc-300 group">
                <div className="flex items-center gap-2 text-zinc-400">
                   <Settings size={14} />
                   <span>Guest</span>
                </div>
                <div className="flex items-center gap-1 text-white">
                  <LogIn size={12} />
                  <span>Sign In</span>
                </div>
             </button>
          )}
        </div>
      </div>
    </>
  );
}