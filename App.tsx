import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sparkles, X, Mic } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import { Message, Role, ChatConfig, DEFAULT_CONFIG, ChatSession, User, AVAILABLE_MODELS } from './types';
import { geminiService } from './services/geminiService';
import { firebaseService } from './services/firebase';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const WelcomeLogo = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
       <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
       <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl relative z-10 border border-white/10 rotate-3 transition-transform hover:rotate-6 hover:scale-105 duration-500">
         <Sparkles size={48} className="text-white fill-white/20 animate-pulse" style={{ animationDuration: '4s' }} />
       </div>
    </div>
  );
};

// --- Live Session Overlay ---
const LiveSessionOverlay = ({ onClose }: { onClose: () => void }) => {
  const [status, setStatus] = useState("Connecting...");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const startLive = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);
        
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        let nextStartTime = 0;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => setStatus("Listening..."),
            onmessage: async (message: LiveServerMessage) => {
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                setIsSpeaking(true);
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < bytes.length; i++) bytes[i] = binaryString.charCodeAt(i);
                
                const float32Data = new Float32Array(bytes.length / 2);
                const dataInt16 = new Int16Array(bytes.buffer);
                for (let i = 0; i < dataInt16.length; i++) float32Data[i] = dataInt16[i] / 32768.0;

                const buffer = outputAudioContext.createBuffer(1, float32Data.length, 24000);
                buffer.getChannelData(0).set(float32Data);

                const sourceNode = outputAudioContext.createBufferSource();
                sourceNode.buffer = buffer;
                sourceNode.connect(outputNode);
                
                nextStartTime = Math.max(outputAudioContext.currentTime, nextStartTime);
                sourceNode.start(nextStartTime);
                nextStartTime += buffer.duration;
                sourceNode.onended = () => { if (outputAudioContext.currentTime >= nextStartTime) setIsSpeaking(false); };
              }
            },
            onclose: () => setStatus("Disconnected"),
            onerror: (e) => setStatus("Error: " + e.type)
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
          }
        });
        
        sessionRef.current = sessionPromise;

        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const l = inputData.length;
          const int16 = new Int16Array(l);
          for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
          const bytes = new Uint8Array(int16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);

          sessionPromise.then(session => {
            session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: base64 } });
          });
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);

        cleanup = () => {
            stream.getTracks().forEach(t => t.stop());
            scriptProcessor.disconnect();
            source.disconnect();
            inputAudioContext.close();
            outputAudioContext.close();
        };

      } catch (e) { console.error(e); setStatus("Microphone access denied or API error."); }
    };
    startLive();
    return () => cleanup && cleanup();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
       <button onClick={onClose} className="absolute top-8 right-8 p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all border border-white/5"><X size={32} /></button>
       <div className="text-center space-y-12">
         <div className={`relative w-64 h-64 flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'scale-110' : ''}`}>
             <div className={`absolute inset-0 bg-cyan-500/30 blur-[100px] rounded-full transition-opacity duration-300 ${isSpeaking ? 'opacity-100' : 'opacity-20'}`} />
             <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center relative z-10 transition-all duration-300 ${isSpeaking ? 'border-cyan-400/50 shadow-[0_0_50px_rgba(34,211,238,0.3)]' : 'border-white/10'}`}>
                <div className={`w-40 h-40 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-2xl ${isSpeaking ? 'animate-pulse' : ''}`}>
                    <Mic size={64} className="text-white" />
                </div>
             </div>
         </div>
         <div>
            <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">Neby Live</h2>
            <p className="text-zinc-400 text-xl font-light tracking-wide">{status}</p>
         </div>
       </div>
    </div>
  );
};


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [slidebarOpen, setSlidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === config.model) || AVAILABLE_MODELS[0];

  const initializeGuest = () => {
    const guestUser: User = { id: 'guest-' + Date.now(), name: 'Guest', email: '', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=guest`, isAnonymous: true };
    setUser(guestUser);
    localStorage.setItem('neby_auth_user', JSON.stringify(guestUser));
    return guestUser;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('neby_auth_user');
    if (storedUser) setUser(JSON.parse(storedUser)); else initializeGuest();
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!user) { setSessions([]); setCurrentSessionId(null); return; }
    const unsubscribe = firebaseService.subscribeToSessions(user.id, (loadedSessions) => {
      setSessions(loadedSessions);
      if (loadedSessions.length === 0) {
        const newSession = { id: Date.now().toString(), title: 'New Cosmic Chat', messages: [], createdAt: Date.now() };
        firebaseService.saveSession(user.id, newSession);
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      } else if (!currentSessionId && loadedSessions.length > 0) {
        if (!loadedSessions.some(s => s.id === currentSessionId)) setCurrentSessionId(loadedSessions[loadedSessions.length - 1].id);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = (loggedInUser: User) => { setUser(loggedInUser); setShowAuthModal(false); localStorage.setItem('neby_auth_user', JSON.stringify(loggedInUser)); };
  const handleLogout = async () => { await firebaseService.logout(); localStorage.removeItem('neby_auth_user'); setUser(null); initializeGuest(); };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession ? currentSession.messages : [];
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const createNewChat = () => { if (!user) return; const newSession = { id: Date.now().toString(), title: 'New Chat', messages: [], createdAt: Date.now() }; firebaseService.saveSession(user.id, newSession); setSessions(prev => [...prev, newSession]); setCurrentSessionId(newSession.id); };
  const deleteSession = (id: string, e: React.MouseEvent) => { e.stopPropagation(); if (!user) return; firebaseService.deleteSession(user.id, id); const remaining = sessions.filter(s => s.id !== id); setSessions(remaining); if (currentSessionId === id) setCurrentSessionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null); };
  
  const renameSession = (id: string, newTitle: string) => { 
    if (!user) return; 
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    firebaseService.updateSessionTitle(user.id, id, newTitle);
  };
  
  const saveCurrentSession = (updatedMessages: Message[], title?: string) => { 
    if (!user || !currentSessionId) return; 
    setSessions(prev => {
      const session = prev.find(s => s.id === currentSessionId);
      if (!session) return prev;
      
      const updatedSession = { 
          ...session, 
          messages: updatedMessages, 
          title: title || session.title // This preserves title from state if argument is not provided
      };
      
      firebaseService.saveSession(user.id, updatedSession); 
      return prev.map(s => s.id === currentSessionId ? updatedSession : s);
    });
  };

  const handleUpdateMessage = (updatedMessage: Message) => { if (!currentSessionId || !user) return; setSessions(prev => prev.map(session => { if (session.id === currentSessionId) { const updatedMessages = session.messages.map(m => m.id === updatedMessage.id ? updatedMessage : m); firebaseService.saveSession(user.id, { ...session, messages: updatedMessages }); return { ...session, messages: updatedMessages }; } return session; })); };

  const handleEditMessage = async (messageId: string, newContent: string) => {
      if (!currentSessionId || !user) return;
      const session = sessions.find(s => s.id === currentSessionId);
      if (!session) return;
      const msgIndex = session.messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return;
      const oldMsg = session.messages[msgIndex];
      const updatedUserMsg = { ...oldMsg, content: newContent };
      const historyPreEdit = session.messages.slice(0, msgIndex);
      const newHistory = [...historyPreEdit, updatedUserMsg];
      saveCurrentSession(newHistory);
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: newHistory } : s));
      setIsLoading(true);
      const botMsgId = (Date.now() + 1).toString();
      try {
          // Logic mirrors handleSendMessage but uses newHistory
          await processGeneration(newContent, updatedUserMsg.images || [], newHistory, botMsgId, config, updatedUserMsg.videoUri && updatedUserMsg.videoUri !== 'Attached Video' ? updatedUserMsg.videoUri : undefined);
      } catch (e: any) { console.error(e); } finally { setIsLoading(false); }
  };

  const processGeneration = async (text: string, images: string[], history: Message[], botMsgId: string, cfg: ChatConfig, videoData?: string) => {
    let actualType = 'text';
    if (cfg.model.includes('image') && !videoData) actualType = 'image';
    if (cfg.model.includes('veo')) actualType = 'video'; // Naive check
    
    // Check type logic from original handleSendMessage
    if (cfg.model.includes('veo')) actualType = 'video';
    
    try {
        if (actualType === 'video') {
             const aistudio = (window as any).aistudio;
             if (aistudio) { const hasKey = await aistudio.hasSelectedApiKey(); if (!hasKey) await aistudio.openSelectKey(); }
             const tempMessages = [...history, { id: botMsgId, role: Role.MODEL, content: 'Synthesizing cosmic motion (Veo)...', timestamp: Date.now(), isDirecting: true }];
             setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));
             const videoUri = await geminiService.generateVideo(text, cfg, images[0]);
             saveCurrentSession([...history, { id: botMsgId, role: Role.MODEL, content: 'Cosmic render complete.', videoUri, timestamp: Date.now(), isDirecting: false }]);
        } else if (actualType === 'image') {
             const aistudio = (window as any).aistudio;
             if (aistudio) { const hasKey = await aistudio.hasSelectedApiKey(); if (!hasKey) await aistudio.openSelectKey(); }
             const tempMessages = [...history, { id: botMsgId, role: Role.MODEL, content: '', timestamp: Date.now(), isPainting: true }];
             setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));
             const generatedImages = await geminiService.generateImage(text, cfg, images);
             const actionText = images.length > 0 ? "Edited image" : `Generated: "${text}"`;
             saveCurrentSession([...history, { id: botMsgId, role: Role.MODEL, content: actionText, images: generatedImages, timestamp: Date.now(), isPainting: false }]);
        } else {
             const tempMessages = [...history, { id: botMsgId, role: Role.MODEL, content: '', timestamp: Date.now(), isLoading: true }];
             setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));
             const stream = geminiService.streamChat(history.slice(0, -1), text, images, cfg, videoData); // Note: streamChat expects history excluding current msg usually, but here logic is a bit intertwined. Fix: streamChat takes history AND new message.
             
             // streamChat implementation separates history and new message.
             // If we are editing, history passed to this func is inclusive of the edited user message.
             // We need to pop it.
             const userMsg = history[history.length - 1];
             const prevHistory = history.slice(0, -1);
             
             // Re-call stream
             const streamIter = geminiService.streamChat(prevHistory, userMsg.content, userMsg.images || [], cfg, videoData);

             let fullContent = '';
             let groundingSources: any[] = [];
             for await (const chunk of streamIter) {
                if (typeof chunk === 'string') {
                    fullContent += chunk;
                    setSessions(prev => prev.map(s => { if (s.id === currentSessionId) { return { ...s, messages: s.messages.map(m => m.id === botMsgId ? { ...m, content: fullContent, isLoading: false } : m) }; } return s; }));
                } else if (chunk.groundingChunks) { groundingSources = chunk.groundingChunks; }
             }
             saveCurrentSession([...history, { id: botMsgId, role: Role.MODEL, content: fullContent, timestamp: Date.now(), isLoading: false, groundingSources }]);
        }
    } catch (error: any) {
        const errorMessage = error.message || "Error";
        saveCurrentSession([...history, { id: botMsgId, role: Role.MODEL, content: `Error: ${errorMessage}`, timestamp: Date.now(), isLoading: false }]);
    }
  };

  const handleSendMessage = async (text: string, images: string[], type: 'text' | 'image' | 'video' = 'text', videoData?: string) => {
    if (!currentSessionId || !user) return;
    const userMsg = { id: Date.now().toString(), role: Role.USER, content: text, timestamp: Date.now(), images, videoUri: videoData ? 'Attached Video' : undefined };
    const updatedMessages = [...messages, userMsg];
    saveCurrentSession(updatedMessages);
    
    // Auto-Title Logic
    if (messages.length === 0) {
       if (text.trim()) {
          geminiService.generateTitle(text).then(title => {
              renameSession(currentSessionId, title);
          });
       } else if (images.length > 0) {
          renameSession(currentSessionId, "Image Analysis");
       } else if (videoData) {
          renameSession(currentSessionId, "Video Analysis");
       }
    }

    setIsLoading(true);
    const botMsgId = (Date.now() + 1).toString();
    try {
        await processGeneration(text, images, updatedMessages, botMsgId, config, videoData);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  if (!authChecked) return null;

  return (
    <div className="flex h-screen bg-transparent overflow-hidden selection:bg-indigo-500/30">
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAuthModal(false)} />
          <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-200"><AuthScreen onLogin={handleLogin} onGuest={() => setShowAuthModal(false)} onClose={() => setShowAuthModal(false)} /></div>
        </div>
      )}

      {isLiveMode && <LiveSessionOverlay onClose={() => setIsLiveMode(false)} />}
      
      <Sidebar 
        isOpen={slidebarOpen} 
        onClose={() => setSlidebarOpen(false)} 
        config={config} 
        setConfig={setConfig} 
        sessions={sessions} 
        currentSessionId={currentSessionId} 
        onSelectSession={setCurrentSessionId} 
        onDeleteSession={deleteSession} 
        onRenameSession={renameSession} 
        onNewChat={createNewChat} 
        user={user}
        onLogout={handleLogout}
        onTriggerLogin={() => setShowAuthModal(true)}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out relative ${slidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center p-4 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md z-30 sticky top-0">
          <button onClick={() => setSlidebarOpen(!slidebarOpen)} className="text-zinc-400 p-2 hover:bg-white/5 rounded-lg transition-colors"><Menu size={20} /></button>
          <span className="ml-3 font-semibold text-zinc-100 truncate text-sm">{currentSession?.title || 'Neby'}</span>
        </header>

        {/* Desktop Toggle (Floating) */}
        {!slidebarOpen && (
             <button onClick={() => setSlidebarOpen(true)} className="hidden lg:flex absolute top-6 left-6 z-30 p-2.5 bg-[#09090b]/50 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 backdrop-blur-md transition-all shadow-lg">
                <Menu size={20} />
             </button>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-32">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-40 h-40">
                <WelcomeLogo />
              </div>
              <div className="space-y-3 max-w-md">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-200 via-white to-purple-200 drop-shadow-sm tracking-tight">
                  {user && !user.isAnonymous ? `Hello, ${user.name.split(' ')[0]}` : 'Welcome to Neby'}
                </h1>
                <p className="text-zinc-400 leading-relaxed text-lg">
                  Your creative companion for thinking, coding, and visualizing ideas.
                </p>
              </div>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3">
                 <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-zinc-400 flex items-center gap-2">
                    <Sparkles size={12} className="text-purple-400" />
                    Gemini 3 Pro
                 </div>
                 <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs font-medium text-zinc-400 flex items-center gap-2">
                    <Mic size={12} className="text-cyan-400" />
                    Live Audio
                 </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto pt-4 md:pt-10">
              {messages.map(m => (
                <ChatMessage 
                  key={m.id} 
                  message={m} 
                  onUpdateMessage={handleUpdateMessage}
                  onEditSave={handleEditMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#050508] via-[#050508]/90 to-transparent pt-20 pb-6 px-4 pointer-events-none z-20">
           <div className="pointer-events-auto">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                isLoading={isLoading} 
                onLiveStart={() => setIsLiveMode(true)}
                selectedModel={selectedModel}
              />
              <div className="text-center mt-2">
                  <p className="text-[10px] text-zinc-600 font-medium">
                      Powered by Google Gemini 3 • AI can make mistakes.
                  </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;