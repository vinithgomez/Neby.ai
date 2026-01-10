import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Mic, MicOff, Sparkles, Video, Paperclip } from 'lucide-react';
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  const handleSend = (type: 'text' | 'image' | 'video' = 'text') => {
    if ((!text.trim() && images.length === 0 && !video) || isLoading) return;
    
    // Determine type: if video attached -> 'text' (video understanding) or 'video' (generation)?
    // Usually, send 'text' with attachments for understanding. 
    // Send 'video' type only if we want Veo generation.
    // Logic handled in App.tsx based on type param.
    
    onSendMessage(text.trim(), images, type, video || undefined);
    setText('');
    setImages([]);
    setVideo(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('text'); // Default chat send
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        if (file.size > 20 * 1024 * 1024) {
          alert("Video too large (Max 20MB for direct upload)");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setVideo(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Transcription Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Mic access failed", e);
    }
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const getPlaceholder = () => {
    if (isRecording) return "Listening...";
    if (isTranscribing) return "Transcribing...";
    
    if (selectedModel.id.includes('veo')) return "Describe a video to create...";
    if (selectedModel.id.includes('image')) return "Describe an image to generate...";
    if (selectedModel.supportsThinking) return `Ask a complex question (${selectedModel.name})...`;
    
    return `Ask Neby (${selectedModel.name})...`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Attachments Preview */}
      {(images.length > 0 || video) && (
        <div className="flex gap-3 mb-3 overflow-x-auto pb-2 custom-scrollbar">
          {images.map((img, idx) => (
            <div key={idx} className="relative group flex-shrink-0">
              <img src={img} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-white/20" />
              <button onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-black/80 text-zinc-400 hover:text-red-400 rounded-full p-1 border border-white/10">
                <X size={12} />
              </button>
            </div>
          ))}
          {video && (
             <div className="relative group flex-shrink-0 w-20 h-20 bg-black/50 rounded-lg border border-white/20 flex items-center justify-center">
                <Video size={24} className="text-zinc-400" />
                <button onClick={() => setVideo(null)} className="absolute -top-2 -right-2 bg-black/80 text-zinc-400 hover:text-red-400 rounded-full p-1 border border-white/10">
                <X size={12} />
              </button>
             </div>
          )}
        </div>
      )}

      {/* Input Bar */}
      <div className={`relative bg-black/40 border rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 ${isRecording ? 'border-red-500/50 shadow-red-900/20' : 'border-white/10 focus-within:ring-2 focus-within:ring-indigo-500/40'}`}>
        
        {/* Container with items-end for bottom alignment of buttons */}
        <div className="flex items-end gap-2 p-2">
          
          {/* Left Actions */}
          <div className="flex items-center gap-1">
            {/* Attach Button (Images & Video) */}
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-zinc-400 hover:text-indigo-300 hover:bg-white/5 rounded-xl transition-all" title="Attach File">
              <Paperclip size={20} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />

            {/* Microphone (Transcription) */}
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2.5 rounded-xl transition-all ${isRecording ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              title="Transcribe Audio"
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 py-3 px-2 max-h-40 resize-none focus:outline-none custom-scrollbar leading-relaxed"
              rows={1}
              disabled={isLoading || isTranscribing}
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Live Button */}
            <button
               onClick={onLiveStart}
               className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all border border-cyan-500/20"
               title="Start Live Voice Session"
            >
               <Sparkles size={18} />
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSend('text')}
              disabled={(!text.trim() && !images.length && !video) || isLoading}
              className={`p-2.5 rounded-xl transition-all ${
                (!text.trim() && !images.length && !video) || isLoading
                  ? 'bg-white/5 text-zinc-600 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg'
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