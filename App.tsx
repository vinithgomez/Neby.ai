import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sparkles } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Sidebar from './components/Sidebar';
import { Message, Role, ChatConfig, DEFAULT_CONFIG, ChatSession } from './types';
import { geminiService } from './services/geminiService';

const WelcomeLogo = () => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 border border-white/20">
      <Sparkles size={64} className="text-white fill-white/10 animate-pulse" />
    </div>
  );
};

const App: React.FC = () => {
  // State for sessions and config
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  
  // Initialize slidebarOpen based on screen width
  const [slidebarOpen, setSlidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from local storage on mount with robust error handling
  useEffect(() => {
    const initializeSessions = () => {
      try {
        const savedSessions = localStorage.getItem('neby_sessions');
        if (!savedSessions) {
          return createNewChat();
        }

        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[parsed.length - 1].id);
        } else {
          createNewChat();
        }
      } catch (e) {
        console.error("Neby: Failed to load sessions from local storage. Data might be corrupted.", e);
        localStorage.removeItem('neby_sessions');
        createNewChat();
      }
    };

    initializeSessions();
  }, []);

  // Sync sessions to local storage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('neby_sessions', JSON.stringify(sessions));
    } else if (sessions.length === 0 && localStorage.getItem('neby_sessions')) {
      localStorage.removeItem('neby_sessions');
    }
  }, [sessions]);

  // Derived state for current messages
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession ? currentSession.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    setIsLoading(false);
    if (window.innerWidth < 1024) setSlidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== id);
      if (currentSessionId === id) {
        if (newSessions.length > 0) {
          setCurrentSessionId(newSessions[newSessions.length - 1].id);
        } else {
          setTimeout(() => createNewChat(), 0);
        }
      }
      return newSessions;
    });
  };

  const renameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(session => 
      session.id === id ? { ...session, title: newTitle } : session
    ));
  };

  const updateMessage = (updatedMsg: Message) => {
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          messages: session.messages.map(m => m.id === updatedMsg.id ? updatedMsg : m)
        };
      }
      return session;
    }));
  };

  const updateCurrentSessionMessages = (updateFn: (msgs: Message[]) => Message[]) => {
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        const updatedMessages = updateFn(session.messages);
        
        let newTitle = session.title;
        // Auto-generate title from first user message
        if (session.messages.length === 0 && updatedMessages.length > 0) {
          const firstUserMsg = updatedMessages.find(m => m.role === Role.USER);
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        
        return { ...session, messages: updatedMessages, title: newTitle };
      }
      return session;
    }));
  };

  const triggerBotResponse = async (historyBeforeBot: Message[], promptText: string, promptImages: string[]) => {
    setIsLoading(true);
    const botMessageId = (Date.now() + 1).toString();
    
    // Add empty model message to start streaming
    updateCurrentSessionMessages(prev => [...prev, {
      id: botMessageId,
      role: Role.MODEL,
      content: '',
      timestamp: Date.now(),
      isLoading: true
    }]);

    try {
      const stream = geminiService.streamChat(historyBeforeBot, promptText, promptImages, config);
      
      let fullContent = '';
      let groundingSources: any[] = [];

      for await (const chunk of stream) {
        updateCurrentSessionMessages(prev => prev.map(msg => {
          if (msg.id === botMessageId) {
            if (typeof chunk === 'string') {
              fullContent += chunk;
              return { ...msg, content: fullContent, isLoading: false };
            } 
            else if (typeof chunk === 'object' && 'groundingChunks' in chunk) {
              groundingSources = chunk.groundingChunks;
              return { ...msg, groundingSources: groundingSources, isLoading: false };
            }
          }
          return msg;
        }));
      }
    } catch (error) {
      console.error("Error triggering bot response:", error);
      updateCurrentSessionMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: Role.MODEL,
        content: "I encountered an error while processing your request. Please try again.",
        timestamp: Date.now(),
        isLoading: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, images: string[], isImageRequest: boolean = false) => {
    if (!currentSessionId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: text,
      timestamp: Date.now(),
      images: images
    };

    updateCurrentSessionMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    // If it's a specific image request (Magic Wand clicked) OR the current model is the image model
    if (isImageRequest || config.model.includes('image')) {
      const botMessageId = (Date.now() + 1).toString();
      updateCurrentSessionMessages(prev => [...prev, {
        id: botMessageId,
        role: Role.MODEL,
        content: '',
        timestamp: Date.now(),
        isPainting: true
      }]);

      try {
        const generatedImages = await geminiService.generateImage(text);
        updateCurrentSessionMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, content: `I've created an image based on: "${text}"`, images: generatedImages, isPainting: false } 
            : msg
        ));
      } catch (error) {
        console.error("Image generation failed:", error);
        updateCurrentSessionMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { ...msg, content: "Neural weave error: I couldn't visualize that prompt. Please try a different description.", isPainting: false } 
            : msg
        ));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Otherwise, standard chat logic
    const updatedHistory = [...messages, newMessage];
    await triggerBotResponse(updatedHistory, text, images);
  };

  const handleEditSave = async (messageId: string, newContent: string) => {
    if (!currentSessionId) return;

    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // 1. Update the message and remove everything AFTER it
    const editedMsg = { ...messages[msgIndex], content: newContent, audioBase64: undefined };
    const truncatedHistory = [...messages.slice(0, msgIndex), editedMsg];
    
    // 2. Clear state and update with truncated history
    updateCurrentSessionMessages(() => truncatedHistory);

    // 3. Trigger regeneration
    await triggerBotResponse(truncatedHistory, editedMsg.content, editedMsg.images || []);
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden relative">
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
      />

      <div className={`flex-1 flex flex-col h-full relative w-full transition-all duration-300 ease-in-out ${slidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        
        <header className="flex items-center p-4 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-30">
          <button 
            onClick={() => setSlidebarOpen(prev => !prev)}
            className="text-zinc-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="ml-4 font-semibold text-zinc-100 truncate shadow-black drop-shadow-sm">
            {currentSession?.title || 'Neby'}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-purple-900/40 border border-white/10 rotate-3 transform hover:rotate-6 transition-transform duration-500 overflow-hidden">
                <WelcomeLogo />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 drop-shadow-sm">
                Welcome to Neby
              </h1>
              <p className="text-center max-w-md text-sm text-zinc-400 leading-relaxed">
                Your cosmic companion powered by Gemini API.<br/>
                Ready to explore ideas, reason through problems, and create.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full pb-4">
              {messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onUpdateMessage={updateMessage}
                  onEditSave={handleEditSave}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <div className="p-4 bg-gradient-to-t from-[#030014] via-[#030014]/80 to-transparent z-20">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default App;