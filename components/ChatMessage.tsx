import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';
import { User, Globe, Copy, Check, Sparkles, Volume2, Square, Loader2, Pencil, X, Send, Download, Palette } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface ChatMessageProps {
  message: Message;
  onUpdateMessage?: (updatedMessage: Message) => void;
  onEditSave?: (messageId: string, newContent: string) => void;
}

const ThinkingIndicator = ({ isPainting }: { isPainting?: boolean }) => (
  <div className="flex items-center gap-3 py-2 px-1">
    <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border ${isPainting ? 'bg-purple-500/10 border-purple-500/30' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
       {isPainting ? <Palette size={16} className="text-purple-400 animate-pulse" /> : <Sparkles size={16} className="text-indigo-400 animate-pulse" />}
    </div>
    <div className="flex flex-col gap-1">
       <span className={`text-xs font-semibold uppercase tracking-wider ${isPainting ? 'text-purple-400' : 'text-indigo-400'}`}>
          {isPainting ? 'Creating Visuals' : 'Reasoning'}
       </span>
       <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full w-full animate-thinking-shimmer bg-gradient-to-r from-transparent ${isPainting ? 'via-purple-500' : 'via-indigo-500'} to-transparent opacity-50`} />
       </div>
    </div>
  </div>
);

// PCM Decoding Helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onUpdateMessage, onEditSave }) => {
  const isUser = message.role === Role.USER;
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editInputRef.current.value.length, editInputRef.current.value.length);
    }
  }, [isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (imgUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `neby-generation-${message.id}-${index}.png`;
    link.click();
  };

  const stopSpeaking = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleSpeak = async () => {
    if (isSpeaking) { stopSpeaking(); return; }
    setIsSpeechLoading(true);
    try {
      let audioBase64 = message.audioBase64;
      if (!audioBase64) {
        audioBase64 = await geminiService.generateSpeech(message.content);
        if (onUpdateMessage) onUpdateMessage({ ...message, audioBase64 }); else message.audioBase64 = audioBase64;
      }
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const bytes = decodeBase64(audioBase64);
      const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => { setIsSpeaking(false); audioSourceRef.current = null; };
      audioSourceRef.current = source;
      source.start();
      setIsSpeaking(true);
    } catch (error) { console.error("Failed to play speech:", error); } finally { setIsSpeechLoading(false); }
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content && onEditSave) {
      onEditSave(message.id, editContent.trim());
      setIsEditing(false);
    } else {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} group animate-message-enter`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] lg:max-w-[75%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0 flex flex-col items-center pt-1">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg border ${isUser ? 'bg-indigo-600 border-indigo-400/30' : 'bg-[#18181b] border-white/10'}`}>
            {isUser ? <User size={16} className="text-white" /> : <Sparkles size={16} className="text-indigo-400" />}
          </div>
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
            
            {/* Name & Time */}
            <div className={`flex items-center gap-2 mb-1.5 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-xs font-bold text-zinc-400">{isUser ? 'You' : 'Neby'}</span>
                <span className="text-[10px] text-zinc-600">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className={`relative px-6 py-5 shadow-sm transition-all duration-300 ${
                isUser 
                ? 'bg-[#27272a] text-zinc-100 rounded-3xl rounded-tr-lg border border-white/5' 
                : 'bg-black/20 backdrop-blur-md text-zinc-200 rounded-3xl rounded-tl-lg border border-white/5'
            } ${isEditing ? 'ring-1 ring-indigo-500/50' : ''}`}>
                
                {/* Images */}
                {message.images && message.images.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                    {message.images.map((img, idx) => (
                    <div key={idx} className="relative group/img overflow-hidden rounded-xl border border-white/10 bg-black/50">
                        <img src={img} alt={`gen-${idx}`} className="max-w-full md:max-w-sm max-h-80 object-contain" />
                        <button onClick={() => handleDownload(img, idx)} className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-all backdrop-blur-md hover:bg-black/80"><Download size={14} /></button>
                    </div>
                    ))}
                </div>
                )}

                {/* Content / Edit Mode */}
                {isEditing ? (
                    <div className="flex flex-col gap-3 min-w-[280px]">
                        <textarea ref={editInputRef} value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-none min-h-[100px]" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } else if (e.key === 'Escape') { setIsEditing(false); setEditContent(message.content); } }} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleEditSubmit} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all">Save</button>
                        </div>
                    </div>
                ) : (
                    message.isLoading || message.isPainting ? <ThinkingIndicator isPainting={message.isPainting} /> : (
                        <div className="markdown-content text-[15px] leading-7 font-light tracking-wide text-zinc-200 selection:bg-indigo-500/30">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    )
                )}

                {/* Message Actions */}
                {!message.isLoading && !message.isPainting && !isEditing && (
                    <div className={`absolute -bottom-3 ${isUser ? 'left-4' : 'right-4'} flex items-center gap-0.5 bg-[#18181b] border border-white/10 rounded-full px-2 py-0.5 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100`}>
                        {isUser && <button onClick={() => setIsEditing(true)} className="p-1.5 text-zinc-400 hover:text-white transition-colors"><Pencil size={12} /></button>}
                        {!isUser && message.content && (
                            <button onClick={handleSpeak} className={`p-1.5 transition-colors ${isSpeaking ? 'text-indigo-400' : 'text-zinc-400 hover:text-white'}`}>
                                {isSpeechLoading ? <Loader2 size={12} className="animate-spin" /> : isSpeaking ? <Square size={12} fill="currentColor" /> : <Volume2 size={12} />}
                            </button>
                        )}
                        <button onClick={handleCopy} className="p-1.5 text-zinc-400 hover:text-white transition-colors">{copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}</button>
                    </div>
                )}
            </div>
            
            {/* Grounding Sources */}
            {message.groundingSources && message.groundingSources.length > 0 && (
                <div className="mt-2 pl-2">
                   <div className="flex flex-wrap gap-2">
                      {message.groundingSources.map((source, idx) => source.web && (
                          <a key={idx} href={source.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group/link max-w-[200px]">
                             <div className="p-0.5 rounded bg-white/5"><Globe size={10} className="text-zinc-500 group-hover/link:text-blue-400" /></div>
                             <span className="text-[11px] text-zinc-400 truncate group-hover/link:text-zinc-200">{source.web.title}</span>
                          </a>
                      ))}
                   </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;