import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Loader2, Mic, MicOff, AlertCircle, RefreshCw } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, images: string[]) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text, interimText]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const handleSend = () => {
    const finalMsg = (text + ' ' + interimText).trim();
    if ((!finalMsg && images.length === 0) || isLoading) return;
    
    onSendMessage(finalMsg, images);
    setText('');
    setInterimText('');
    setImages([]);
    setSpeechError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    if (isListening) {
      stopListening();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const stopListening = () => {
    setIsInitializing(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        console.warn("Recognition already inactive.");
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  };

  const toggleListening = async () => {
    if (isListening || isInitializing) {
      stopListening();
      return;
    }

    setSpeechError(null);
    setIsInitializing(true);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Browser not supported");
      setIsInitializing(false);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try { recognitionRef.current.abort(); } catch(e) {}
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setIsInitializing(false);
        setSpeechError(null);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setText(prev => {
            const prefix = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + prefix + finalTranscript.trim();
          });
        }
        setInterimText(interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        
        if (event.error === 'no-speech') {
          setIsInitializing(false);
          return;
        }
        
        setIsListening(false);
        setIsInitializing(false);
        setInterimText('');
        
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch(e) {}
          recognitionRef.current = null;
        }
        
        if (event.error === 'network') {
          setSpeechError("Speech service unavailable");
        } else if (event.error === 'not-allowed') {
          setSpeechError("Mic access blocked");
        } else {
          setSpeechError(`Retry speech input`);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          setIsListening(false);
          setIsInitializing(false);
          setInterimText('');
          recognitionRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      console.error("Failed to initialize speech:", err);
      setIsInitializing(false);
      if (err.name === 'NotAllowedError') {
        setSpeechError("Mic access denied");
      } else {
        setSpeechError("System Error: Try again");
      }
    }
  };

  const currentInputValue = isListening 
    ? text + (interimText ? (text ? ' ' : '') + interimText : '') 
    : text;

  const placeholderText = isLoading 
    ? "Thinking..." 
    : isInitializing
      ? "Initializing..."
      : speechError 
        ? speechError 
        : isListening 
          ? "Listening..." 
          : "Message Neby...";

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Image Preview Area */}
      {images.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto pb-2 custom-scrollbar">
          {images.map((img, idx) => (
            <div key={idx} className="relative group flex-shrink-0">
              <img 
                src={img} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-lg border border-white/20 shadow-xl"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 bg-black/80 text-zinc-400 hover:text-red-400 rounded-full p-1 shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`relative flex flex-col bg-black/40 border rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden ${
        speechError 
          ? 'border-red-500/40 ring-2 ring-red-500/5' 
          : 'border-white/10 focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-500/40'
      }`}>
        
        <div className="flex items-end">
          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-zinc-400 hover:text-indigo-300 transition-colors mb-[2px]"
            title="Attach Image"
            disabled={isLoading}
          >
            <ImageIcon size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileSelect}
          />

          {/* Microphone Button */}
          <button
            onClick={toggleListening}
            className={`p-3 transition-all mb-[2px] ${
              isListening || isInitializing
                ? 'text-red-500 hover:text-red-400 scale-110' 
                : speechError 
                  ? 'text-red-400 hover:text-red-300' 
                  : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={isListening ? "Stop Recording" : "Start Voice Input"}
            disabled={isLoading}
          >
            {isInitializing ? (
              <RefreshCw size={20} className="animate-spin opacity-50" />
            ) : isListening ? (
              <div className="relative">
                <MicOff size={20} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              </div>
            ) : speechError ? (
              <AlertCircle size={20} className="text-red-500" />
            ) : (
              <Mic size={20} />
            )}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={currentInputValue}
              onChange={(e) => {
                if (!isListening && !isInitializing) {
                  setText(e.target.value);
                  if (speechError) setSpeechError(null);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              className={`w-full bg-transparent text-zinc-100 placeholder-zinc-500 p-3 max-h-40 resize-none focus:outline-none custom-scrollbar transition-opacity ${
                isListening || isInitializing ? 'cursor-default opacity-80' : ''
              } ${speechError ? 'placeholder-red-400 font-medium' : ''}`}
              rows={1}
              disabled={isLoading}
              readOnly={isListening || isInitializing}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !interimText.trim() && images.length === 0) || isLoading}
            className={`p-2 m-1.5 rounded-xl transition-all mb-[5px] ${
              (!text.trim() && !interimText.trim() && images.length === 0) || isLoading
                ? 'bg-white/5 text-zinc-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/30'
            }`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>

        {/* Listening Indicator Bar */}
        {(isListening || isInitializing) && (
          <div className="h-0.5 bg-zinc-800 w-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-full ${isInitializing ? 'opacity-30' : 'animate-[shimmer_1s_infinite]'} bg-[length:200%_100%]`}></div>
          </div>
        )}
      </div>
      
      <div className="text-center mt-2 text-[10px] uppercase tracking-[0.25em] text-zinc-700 font-bold select-none">
        Powered by Gemini API • Cosmic Neural Mesh
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
};

export default ChatInput;