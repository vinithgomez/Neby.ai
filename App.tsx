import React, { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Sidebar from './components/Sidebar';
import { Message, Role, ChatConfig, DEFAULT_CONFIG, ChatSession } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  // State for sessions and config
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  
  // Initialize sidebarOpen based on screen width
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('neby_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[parsed.length - 1].id);
        } else {
          createNewChat();
        }
      } catch (e) {
        console.error("Failed to load sessions", e);
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  // Save to local storage whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('neby_sessions', JSON.stringify(sessions));
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
    // Only close sidebar on mobile when creating new chat
    if (window.innerWidth < 1024) setSidebarOpen(false);
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
      if (newSessions.length === 0) {
         localStorage.removeItem('neby_sessions');
      }
      return newSessions;
    });
  };

  const renameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(session => 
      session.id === id ? { ...session, title: newTitle } : session
    ));
  };

  const updateCurrentSessionMessages = (updateFn: (msgs: Message[]) => Message[]) => {
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        const updatedMessages = updateFn(session.messages);
        
        let newTitle = session.title;
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

  const handleSendMessage = async (text: string, images: string[]) => {
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

    try {
      const botMessageId = (Date.now() + 1).toString();
      updateCurrentSessionMessages(prev => [...prev, {
        id: botMessageId,
        role: Role.MODEL,
        content: '',
        timestamp: Date.now(),
        isLoading: true
      }]);

      const currentHistory = messages; 
      const historyWithUserMsg = [...currentHistory, newMessage];

      const stream = geminiService.streamChat(historyWithUserMsg, text, images, config);
      
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
      console.error("Error sending message:", error);
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

  return (
    <div className="flex h-screen bg-transparent overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        config={config}
        setConfig={setConfig}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onNewChat={createNewChat}
      />

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full relative w-full transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        
        {/* Header */}
        <header className="flex items-center p-4 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(prev => !prev)}
            className="text-zinc-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="ml-4 font-semibold text-zinc-100 truncate shadow-black drop-shadow-sm">
            {currentSession?.title || 'Neby'}
          </span>
        </header>

        {/* Messages List */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-900/40 border border-white/10 rotate-3 transform hover:rotate-6 transition-transform duration-500">
                <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">✨</span>
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 drop-shadow-sm">
                Welcome to Neby
              </h1>
              <p className="text-center max-w-md text-sm text-zinc-400 leading-relaxed">
                Your cosmic companion powered by Gemini 3.<br/>
                Ready to explore ideas, reason through problems, and create.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full pb-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <div className="p-4 bg-gradient-to-t from-[#030014] via-[#030014]/80 to-transparent z-20">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default App;