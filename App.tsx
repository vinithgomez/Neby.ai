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
    <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 border border-white/20">
      <Sparkles size={64} className="text-white fill-white/10 animate-pulse" />
    </div>
  );
};

// --- Live Session Overlay ---
const LiveSessionOverlay = ({ onClose }: { onClose: () => void }) => {
  const [status, setStatus] = useState("Connecting...");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sessionRef = useRef<any>(null); // Store session promise/ref

  useEffect(() => {
    // Setup Live API
    let cleanup: (() => void) | undefined;

    const startLive = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);
        
        // Input pipeline
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        let nextStartTime = 0;

        // Create a FRESH instance to ensure we use the latest API KEY (if it was set via UI flow)
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => setStatus("Listening..."),
            onmessage: async (message: LiveServerMessage) => {
              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                setIsSpeaking(true);
                // Decode & Play
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
                
                sourceNode.onended = () => {
                   if (outputAudioContext.currentTime >= nextStartTime) setIsSpeaking(false);
                };
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

        // Send Audio Input
        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const l = inputData.length;
          const int16 = new Int16Array(l);
          for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
          
          const bytes = new Uint8Array(int16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);

          // Use the promise to ensure session is connected before sending
          sessionPromise.then(session => {
            session.sendRealtimeInput({
              media: { mimeType: 'audio/pcm;rate=16000', data: base64 }
            });
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

      } catch (e) {
        console.error(e);
        setStatus("Microphone access denied or API error.");
      }
    };

    startLive();
    return () => cleanup && cleanup();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
       <div className="absolute top-8 right-8">
         <button onClick={onClose} className="p-4 bg-white/10 rounded-full hover:bg-white/20 transition-all">
           <X size={32} />
         </button>
       </div>
       <div className="text-center space-y-8">
         <div className={`w-48 h-48 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${isSpeaking ? 'border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.5)] scale-110' : 'border-zinc-700'}`}>
            <div className={`w-40 h-40 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center ${isSpeaking ? 'animate-pulse' : ''}`}>
               <Mic size={64} className="text-white" />
            </div>
         </div>
         <div>
            <h2 className="text-3xl font-bold text-white mb-2">Neby Live</h2>
            <p className="text-zinc-400 text-lg animate-pulse">{status}</p>
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
    const guestUser: User = {
        id: 'guest-' + Date.now(),
        name: 'Guest',
        email: '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=guest`,
        isAnonymous: true
    };
    setUser(guestUser);
    localStorage.setItem('neby_auth_user', JSON.stringify(guestUser));
    return guestUser;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('neby_auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      initializeGuest();
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSessionId(null);
      return;
    }
    const unsubscribe = firebaseService.subscribeToSessions(user.id, (loadedSessions) => {
      setSessions(loadedSessions);
      if (loadedSessions.length === 0) {
        const newSession = { id: Date.now().toString(), title: 'New Cosmic Chat', messages: [], createdAt: Date.now() };
        firebaseService.saveSession(user.id, newSession);
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      } else if (!currentSessionId && loadedSessions.length > 0) {
        // If the current session ID isn't in the loaded sessions (e.g. switched user), reset to the last one
        const exists = loadedSessions.some(s => s.id === currentSessionId);
        if (!exists) {
            setCurrentSessionId(loadedSessions[loadedSessions.length - 1].id);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuthModal(false);
    localStorage.setItem('neby_auth_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = async () => {
    await firebaseService.logout();
    localStorage.removeItem('neby_auth_user');
    setUser(null);
    initializeGuest();
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession ? currentSession.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = () => {
    if (!user) return;
    const newSession = { id: Date.now().toString(), title: 'New Cosmic Chat', messages: [], createdAt: Date.now() };
    firebaseService.saveSession(user.id, newSession);
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    firebaseService.deleteSession(user.id, id);
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (currentSessionId === id) {
      if (remaining.length > 0) setCurrentSessionId(remaining[remaining.length - 1].id);
      else setCurrentSessionId(null);
    }
  };

  const renameSession = (id: string, newTitle: string) => {
    if (!user) return;
    const session = sessions.find(s => s.id === id);
    if (session) {
      const updated = { ...session, title: newTitle };
      firebaseService.saveSession(user.id, updated);
      setSessions(prev => prev.map(s => s.id === id ? updated : s));
    }
  };

  const saveCurrentSession = (updatedMessages: Message[], title?: string) => {
    if (!user || !currentSessionId) return;
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
      const updatedSession = { ...session, messages: updatedMessages, title: title || session.title };
      firebaseService.saveSession(user.id, updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSessionId ? updatedSession : s));
    }
  };

  const handleUpdateMessage = (updatedMessage: Message) => {
    if (!currentSessionId || !user) return;
    setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
            const updatedMessages = session.messages.map(m => m.id === updatedMessage.id ? updatedMessage : m);
            firebaseService.saveSession(user.id, { ...session, messages: updatedMessages });
            return { ...session, messages: updatedMessages };
        }
        return session;
    }));
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentSessionId || !user) return;
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;

    const msgIndex = session.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const oldMsg = session.messages[msgIndex];
    const updatedUserMsg = { ...oldMsg, content: newContent };
    
    // Truncate history to the edited message
    const historyPreEdit = session.messages.slice(0, msgIndex);
    const newHistory = [...historyPreEdit, updatedUserMsg];
    
    saveCurrentSession(newHistory);
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: newHistory } : s));
    
    setIsLoading(true);
    const botMsgId = (Date.now() + 1).toString();

    try {
      if (config.model.includes('veo')) {
         const aistudio = (window as any).aistudio;
         if (aistudio) {
             const hasKey = await aistudio.hasSelectedApiKey();
             if (!hasKey) await aistudio.openSelectKey();
         }

         const tempMessages = [...newHistory, { id: botMsgId, role: Role.MODEL, content: 'Synthesizing cosmic motion (Veo)...', timestamp: Date.now(), isDirecting: true }];
         setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));
         
         const videoUri = await geminiService.generateVideo(newContent, config, updatedUserMsg.images?.[0]);
         saveCurrentSession([...newHistory, { id: botMsgId, role: Role.MODEL, content: 'Cosmic render complete.', videoUri, timestamp: Date.now(), isDirecting: false }]);

      } else if (config.model.includes('image')) {
         const aistudio = (window as any).aistudio;
         if (aistudio) {
             const hasKey = await aistudio.hasSelectedApiKey();
             if (!hasKey) await aistudio.openSelectKey();
         }

         const tempMessages = [...newHistory, { id: botMsgId, role: Role.MODEL, content: '', timestamp: Date.now(), isPainting: true }];
         setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));

         const generatedImages = await geminiService.generateImage(newContent, config, updatedUserMsg.images);
         const actionText = updatedUserMsg.images && updatedUserMsg.images.length > 0 ? "Edited image" : `Generated: "${newContent}"`;
         saveCurrentSession([...newHistory, { id: botMsgId, role: Role.MODEL, content: actionText, images: generatedImages, timestamp: Date.now(), isPainting: false }]);

      } else {
         const tempMessages = [...newHistory, { id: botMsgId, role: Role.MODEL, content: '', timestamp: Date.now(), isLoading: true }];
         setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));

         const stream = geminiService.streamChat(
            historyPreEdit, 
            newContent, 
            updatedUserMsg.images || [], 
            config, 
            updatedUserMsg.videoUri && updatedUserMsg.videoUri !== 'Attached Video' ? updatedUserMsg.videoUri : undefined
         );

         let fullContent = '';
         let groundingSources: any[] = [];

         for await (const chunk of stream) {
            if (typeof chunk === 'string') {
                fullContent += chunk;
                setSessions(prev => prev.map(s => {
                    if (s.id === currentSessionId) {
                        return {
                            ...s,
                            messages: s.messages.map(m => m.id === botMsgId ? { ...m, content: fullContent, isLoading: false } : m)
                        };
                    }
                    return s;
                }));
            } else if (chunk.groundingChunks) {
                groundingSources = chunk.groundingChunks;
            }
         }
         saveCurrentSession([
             ...newHistory,
             { id: botMsgId, role: Role.MODEL, content: fullContent, timestamp: Date.now(), isLoading: false, groundingSources }
         ]);
      }
    } catch (error: any) {
        const errorMessage = error.message || error.error?.message || "Error";
         saveCurrentSession([...newHistory, { id: botMsgId, role: Role.MODEL, content: `Error: ${errorMessage}`, timestamp: Date.now(), isLoading: false }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, images: string[], type: 'text' | 'image' | 'video' = 'text', videoData?: string) => {
    if (!currentSessionId || !user) return;

    let actualType = type;
    if (config.model.includes('image') && type === 'text' && !videoData) actualType = 'image';
    
    const userMsg = { 
      id: Date.now().toString(), 
      role: Role.USER, 
      content: text, 
      timestamp: Date.now(), 
      images,
      videoUri: videoData ? 'Attached Video' : undefined
    };
    
    const updatedMessages = [...messages, userMsg];
    saveCurrentSession(updatedMessages);
    
    setIsLoading(true);
    const botMsgId = (Date.now() + 1).toString();

    try {
      if (actualType === 'video') {
        const aistudio = (window as any).aistudio;
        if (aistudio) {
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) await aistudio.openSelectKey();
        }
        
        const tempMessages = [...updatedMessages, { id: botMsgId, role: Role.MODEL, content: 'Synthesizing cosmic motion (Veo)...', timestamp: Date.now(), isDirecting: true }];
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));
        
        const videoUri = await geminiService.generateVideo(text, config, images[0]);
        
        saveCurrentSession([...updatedMessages, { id: botMsgId, role: Role.MODEL, content: 'Cosmic render complete.', videoUri, timestamp: Date.now(), isDirecting: false }]);
      
      } else if (actualType === 'image') {
        const aistudio = (window as any).aistudio;
        if (aistudio) {
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) await aistudio.openSelectKey();
        }

        const tempMessages = [...updatedMessages, { id: botMsgId, role: Role.MODEL, content: '', timestamp: Date.now(), isPainting: true }];
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));

        const generatedImages = await geminiService.generateImage(text, config, images);
        
        const actionText = images.length > 0 ? "Edited image" : `Generated: "${text}"`;
        saveCurrentSession([...updatedMessages, { id: botMsgId, role: Role.MODEL, content: actionText, images: generatedImages, timestamp: Date.now(), isPainting: false }]);
      
      } else {
        const tempMessages = [...updatedMessages, { id: botMsgId, role: Role.MODEL, content: '', timestamp: Date.now(), isLoading: true }];
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: tempMessages } : s));

        const stream = geminiService.streamChat([...updatedMessages], text, images, config, videoData);
        let fullContent = '';
        let groundingSources: any[] = [];

        for await (const chunk of stream) {
          if (typeof chunk === 'string') {
            fullContent += chunk;
            setSessions(prev => prev.map(s => {
              if (s.id === currentSessionId) {
                return {
                  ...s,
                  messages: s.messages.map(m => m.id === botMsgId ? { ...m, content: fullContent, isLoading: false } : m)
                };
              }
              return s;
            }));
          } else if (chunk.groundingChunks) {
            groundingSources = chunk.groundingChunks;
          }
        }
        
        let newTitle = currentSession?.title;
        if (currentSession?.messages.length === 0) newTitle = text.slice(0, 30);
        
        saveCurrentSession([
          ...updatedMessages, 
          { id: botMsgId, role: Role.MODEL, content: fullContent, timestamp: Date.now(), isLoading: false, groundingSources }
        ], newTitle);
      }
    } catch (error: any) {
      const errorMessage = error.message || error.error?.message || JSON.stringify(error);
      const isEntityNotFound = errorMessage.includes("Requested entity was not found") || error.code === 404 || errorMessage.includes("403");
      const uiErrorMsg = isEntityNotFound 
        ? "⚠️ **Project Access Error**. Please re-select your paid API key from a valid Google Cloud Project." 
        : `☄️ Error: ${errorMessage.slice(0,100)}`;
      
      saveCurrentSession([...updatedMessages, { id: botMsgId, role: Role.MODEL, content: uiErrorMsg, timestamp: Date.now(), isLoading: false }]);
      if (isEntityNotFound) {
          const aistudio = (window as any).aistudio;
          if (aistudio) await aistudio.openSelectKey();
      }
    } finally {
      setIsLoading(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!authChecked) return null;

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative z-10 w-full max-w-md">
            <AuthScreen 
              onLogin={handleLogin} 
              onGuest={() => setShowAuthModal(false)} 
              onClose={() => setShowAuthModal(false)}
            />
          </div>
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
      <div className={`flex-1 flex flex-col transition-all duration-300 ${slidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        <header className="flex items-center p-4 border-b border-white/10 bg-black/20 backdrop-blur-md z-30">
          <button onClick={() => setSlidebarOpen(!slidebarOpen)} className="text-zinc-400 p-2"><Menu size={24} /></button>
          <span className="ml-4 font-semibold text-zinc-100 truncate">{currentSession?.title || 'Neby'}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-purple-900/40 border border-white/10 rotate-3 transform hover:rotate-6 transition-transform duration-500 overflow-hidden">
                <WelcomeLogo />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 drop-shadow-sm">
                {user && !user.isAnonymous ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome to Neby'}
              </h1>
              <p className="text-center max-w-md text-sm text-zinc-400 leading-relaxed">
                Explore the cosmos with Gemini 3, Veo, and Live Audio.
              </p>
            </div>
          ) : (
            <>
              {messages.map(m => (
                <ChatMessage 
                  key={m.id} 
                  message={m} 
                  onUpdateMessage={handleUpdateMessage}
                  onEditSave={handleEditMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </main>
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          onLiveStart={() => setIsLiveMode(true)}
          selectedModel={selectedModel}
        />
      </div>
    </div>
  );
};

export default App;