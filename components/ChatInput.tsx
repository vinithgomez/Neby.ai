import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Mic, MicOff, Sparkles, Video, Paperclip, StopCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ModelOption } from '../types';

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
  }, [text]);

  const handleSend = (type: 'text' | 'image' | 'video' = 'text') => {
    if ((!text.trim() && images.length === 0 && !video) || isLoading) return;
    onSendMessage(text.trim(), images, type, video || undefined);
    setText('');
    setImages([]);
    setVideo(null);
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
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => { if (typeof reader.result === 'string') setImages(prev => [...prev, reader.result as string]); };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        if (file.size > 20 * 1024 * 1024) { alert("Video too large (Max 20MB)"); return; }
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
    } catch (e) { console.error("Mic access failed", e); }
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
    } catch (e) { console.error(e); } finally { setIsTranscribing(false); }
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
      <div className={`relative bg-[#09090b]/60 backdrop-blur-2xl border transition-all duration-300 rounded-[24px] shadow-2xl ${isRecording ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20 focus-within:border-indigo-500/30 focus-within:ring-1 focus-within:ring-indigo-500/30'}`}>
        
        <div className="flex items-end p-2 gap-2">
          
          {/* Left Actions */}
          <div className="flex items-center gap-1 pb-1 pl-1">
             <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Attach Media">
               <Paperclip size={20} />
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
             
             {/* Live Mode Toggle (Only if available) */}
             <button onClick={onLiveStart} className="hidden md:flex p-2.5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-colors" title="Start Live Session">
               <Sparkles size={20} />
             </button>
          </div>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 py-3.5 px-2 max-h-32 resize-none focus:outline-none custom-scrollbar text-[15px] leading-relaxed"
            rows={1}
            disabled={isLoading || isTranscribing}
          />

          {/* Right Actions */}
          <div className="flex items-center gap-2 pb-1 pr-1">
             {/* Mic Button */}
             <button 
               onClick={isRecording ? stopRecording : startRecording}
               className={`p-2.5 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500/20 text-red-500 scale-110' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
               title="Voice Input"
             >
               {isRecording ? <StopCircle size={22} className="animate-pulse" /> : <Mic size={20} />}
             </button>

             {/* Send Button */}
             <button
               onClick={() => handleSend('text')}
               disabled={(!text.trim() && !images.length && !video) || isLoading}
               className={`p-3 rounded-2xl transition-all duration-300 shadow-lg ${
                 (!text.trim() && !images.length && !video) || isLoading
                   ? 'bg-white/5 text-zinc-600 cursor-not-allowed'
                   : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 hover:shadow-indigo-500/30'
               }`}
             >
               {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;