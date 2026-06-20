import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Mic, MicOff, Sparkles, Video, Paperclip, StopCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { geminiService } from '../services/geminiService';
import { ModelOption } from '../types';
import { validateInput, SECURITY_LIMITS } from '../utils/security';

interface ChatInputProps {
  onSendMessage: (text: string, images: string[], type: 'text' | 'image' | 'video', videoData?: string) => void;
  isLoading: boolean;
  onLiveStart: () => void;
  selectedModel: ModelOption;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, onLiveStart, selectedModel }) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
    // Clear error if input changes
    if (error) setError(null);
  }, [text, images, video]);

  const handleSend = (type: 'text' | 'image' | 'video' = 'text') => {
    // Client-side Validation Check
    const validationError = validateInput(text, images);
    if (validationError) {
        setError(validationError);
        return;
    }

    if ((!text.trim() && images.length === 0 && !video) || isLoading) return;
    onSendMessage(text.trim(), images, type, video || undefined);
    setText('');
    setImages([]);
    setVideo(null);
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('text');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic size check before read
      if (file.size > SECURITY_LIMITS.MAX_IMAGE_SIZE_MB * 1024 * 1024 * 5) { // 5x limit for videos mostly, images strictly checked in validation
         setError("File is too large.");
         return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => { if (typeof reader.result === 'string') setImages(prev => [...prev, reader.result as string]); };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        if (file.size > 20 * 1024 * 1024) { setError("Video too large (Max 20MB)"); return; }
        const reader = new FileReader();
        reader.onloadend = () => { if (typeof reader.result === 'string') setVideo(reader.result); };
        reader.readAsDataURL(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
      setError(null);
    } catch (e) { console.error("Mic access failed", e); setError("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const text = await geminiService.transcribeAudio(base64);
        setText(prev => (prev ? prev + ' ' : '') + text);
      };
      reader.readAsDataURL(blob);
    } catch (e) { console.error(e); setError("Transcription failed."); } finally { setIsTranscribing(false); }
  };

  const getPlaceholder = () => {
    if (isRecording) return "Listening...";
    if (isTranscribing) return "Transcribing...";
    if (selectedModel.id.includes('veo')) return "Describe a video to generate...";
    if (selectedModel.id.includes('image')) return "Describe an image to generate...";
    return `Ask anything...`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 z-20">
      
      {/* Validation Error Toast */}
      {error && (
        <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-300 animate-in slide-in-from-bottom-2 fade-in">
           <AlertTriangle size={14} />
           <span>{error}</span>
           <button onClick={() => setError(null)} className="ml-auto hover:text-white"><X size={12} /></button>
        </div>
      )}

      {/* Media Previews */}
      {(images.length > 0 || video) && (
        <div className="flex gap-3 mb-3 pl-2 overflow-x-auto pb-2 custom-scrollbar animate-message-enter">
          {images.map((img, idx) => (
            <div key={idx} className="relative group shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/20 shadow-lg">
              <img src={img} alt="Preview" className="w-full h-full object-cover" />
              <button onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
            </div>
          ))}
          {video && (
             <div className="relative group shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black/50 flex items-center justify-center">
                <Video size={24} className="text-zinc-300" />
                <button onClick={() => setVideo(null)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
             </div>
          )}
        </div>
      )}

      {/* Floating Input Capsule */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`relative bg-[#0f0f0f] border transition-all duration-300 rounded-[28px] shadow-[0_4px_30px_rgba(0,0,0,0.5)] ${isRecording ? 'border-red-500/30' : error ? 'border-red-500/30' : 'border-white/10 hover:border-white/20 focus-within:border-white/30 focus-within:ring-4 focus-within:ring-white/5'}`}
      >
        
        <div className="flex items-end px-3 py-2 gap-2">
          
          {/* Left Actions */}
          <div className="flex items-center gap-1 pb-1">
             <button onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Attach Media">
               <Paperclip size={18} />
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
             
             {/* Live Mode Toggle (Only if available) */}
             <button onClick={onLiveStart} className="hidden md:flex p-2 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 rounded-full transition-colors" title="Start Live Session">
               <Sparkles size={18} />
             </button>
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 py-2.5 px-2 max-h-32 resize-none focus:outline-none custom-scrollbar text-[15px] font-['Inter'] leading-relaxed"
            rows={1}
            disabled={isLoading || isTranscribing}
            maxLength={SECURITY_LIMITS.MAX_MESSAGE_LENGTH}
          />

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 pb-1">
             {/* Mic Button */}
             <button 
               onClick={isRecording ? stopRecording : startRecording}
               className={`p-2 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500/20 text-red-500' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
               title="Voice Input"
             >
               {isRecording ? <StopCircle size={18} className="animate-pulse" /> : <Mic size={18} />}
             </button>

             {/* Send Button */}
             <button
               onClick={() => handleSend('text')}
               disabled={(!text.trim() && !images.length && !video) || isLoading}
               className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${
                 (!text.trim() && !images.length && !video) || isLoading
                   ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                   : 'bg-white text-black hover:scale-105'
               }`}
             >
               {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatInput;