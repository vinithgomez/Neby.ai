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

const StarBoxLogo = () => (
  <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 rounded-lg flex items-center justify-center p-1.5 shadow-lg border border-white/20">
    <Sparkles size={20} className="text-white fill-white/10" />
  </div>
);

const ThinkingLogo = () => {
  const [error, setError] = useState(false);
  if (error) return <Sparkles size={16} className="text-indigo-400 animate-pulse" />;
  return (
    <img 
      src="logo.png" 
      alt="Thinking" 
      onError={() => setError(true)}
      className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(129,140,248,0.6)] animate-pulse"
    />
  );
};

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
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    setIsSpeechLoading(true);

    try {
      let audioBase64 = message.audioBase64;
      if (!audioBase64) {
        audioBase64 = await geminiService.generateSpeech(message.content);
        if (onUpdateMessage) {
          onUpdateMessage({ ...message, audioBase64 });
        } else {
          message.audioBase64 = audioBase64;
        }
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const bytes = decodeBase64(audioBase64);
      const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      source.start();
      setIsSpeaking(true);
    } catch (error) {
      console.error("Failed to play speech:", error);
    } finally {
      setIsSpeechLoading(false);
    }
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
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden ${
            isUser 
              ? 'bg-gradient-to-br from-indigo-600 to-purple-600' 
              : 'bg-black/40 border border-white/10 backdrop-blur-md'
          }`}>
            {isUser ? (
              <User size={20} className="text-white/90" />
            ) : (
              <StarBoxLogo />
            )}
          </div>
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
          
          <div className={`relative px-6 py-5 shadow-lg transition-all duration-300 ${
            isUser 
              ? 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 text-white rounded-2xl rounded-tr-sm' 
              : 'bg-black/30 backdrop-blur-md text-zinc-100 rounded-2xl rounded-tl-sm border border-white/10'
          } ${isEditing ? 'ring-2 ring-indigo-400 border-indigo-500/50' : ''}`}>
            
            {/* Generated Images */}
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4">
                {message.images.map((img, idx) => (
                  <div key={idx} className="relative group/img overflow-hidden rounded-xl border border-white/20 shadow-2xl bg-black/40">
                    <img 
                      src={img} 
                      alt={`generation-${idx}`} 
                      className="max-w-full md:max-w-[400px] h-auto object-contain"
                    />
                    <button 
                      onClick={() => handleDownload(img, idx)}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-img:opacity-100 transition-all backdrop-blur-sm border border-white/10 hover:scale-105 active:scale-95"
                      title="Download Image"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Editing UI */}
            {isEditing ? (
              <div className="flex flex-col gap-3 min-w-[280px]">
                <textarea
                  ref={editInputRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-indigo-400 resize-none min-h-[100px] custom-scrollbar"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEditSubmit();
                    } else if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditContent(message.content);
                    }
                  }}
                />
                <div className="flex items-center justify-end gap-2">
                   <button 
                    onClick={() => { setIsEditing(false); setEditContent(message.content); }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleEditSubmit}
                    className="px-4 py-1.5 rounded-md text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-all shadow-lg flex items-center gap-2"
                  >
                    <Send size={12} />
                    Save & Regenerate
                  </button>
                </div>
              </div>
            ) : (
              /* Display content */
              message.isLoading || message.isPainting ? (
                <div className="flex flex-col gap-3 py-2 px-1 min-w-[180px]">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-6 h-6">
                      <div className={`absolute inset-0 rounded-full animate-ping ${message.isPainting ? 'bg-purple-500/30' : 'bg-indigo-500/30'}`}></div>
                      {message.isPainting ? <Palette size={18} className="text-purple-400 animate-pulse" /> : <ThinkingLogo />}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse ${message.isPainting ? 'text-purple-400' : 'text-zinc-400'}`}>
                      {message.isPainting ? 'Neby is painting' : 'Neby is thinking'}
                    </span>
                  </div>
                  <div className="relative h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`absolute inset-0 w-full animate-thinking-shimmer bg-gradient-to-r from-transparent via-transparent to-transparent ${message.isPainting ? 'via-purple-500' : 'via-indigo-500'}`}></div>
                  </div>
                </div>
              ) : (
                <div className="markdown-content text-[15px] leading-7 tracking-wide">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )
            )}

            {/* Actions Bar */}
            {!message.isLoading && !message.isPainting && !isEditing && (
              <div className={`absolute bottom-2 ${isUser ? 'left-2' : 'right-2'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                
                {isUser && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-zinc-200 hover:text-white rounded-md hover:bg-white/10"
                    title="Edit message"
                  >
                    <Pencil size={14} />
                  </button>
                )}

                {!isUser && message.content && (
                  <button 
                    onClick={handleSpeak}
                    disabled={isSpeechLoading}
                    className={`p-1.5 rounded-md transition-all ${
                      isSpeaking 
                        ? 'bg-indigo-500/30 text-indigo-200 shadow-[0_0_12px_rgba(129,140,248,0.5)]' 
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/10'
                    }`}
                    title={isSpeaking ? "Stop speaking" : "Read aloud"}
                  >
                    {isSpeechLoading ? (
                      <Loader2 size={14} className="animate-spin text-indigo-400" />
                    ) : isSpeaking ? (
                      <Square size={14} fill="currentColor" />
                    ) : (
                      <Volume2 size={14} />
                    )}
                  </button>
                )}

                <button 
                  onClick={handleCopy}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-white/10"
                  title="Copy content"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="text-[11px] text-zinc-500 font-medium shadow-black drop-shadow-sm">
               {isUser ? 'You' : 'Neby'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {message.groundingSources && message.groundingSources.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-700">•</span>
                <div className="flex items-center gap-1 text-[11px] text-indigo-300 bg-indigo-900/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  <Globe size={10} />
                  <span>{message.groundingSources.length} Sources</span>
                </div>
              </div>
            )}
          </div>

          {message.groundingSources && message.groundingSources.length > 0 && (
            <div className="mt-3 grid gap-2 w-full max-w-md">
               {message.groundingSources.map((source, idx) => (
                  source.web && (
                    <a 
                      key={idx}
                      href={source.web.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all group/link"
                    >
                      <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center shrink-0 text-zinc-500 group-hover/link:text-zinc-300">
                        <Globe size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-zinc-300 truncate group-hover/link:text-indigo-300 transition-colors">
                          {source.web.title}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {new URL(source.web.uri).hostname}
                        </div>
                      </div>
                    </a>
                  )
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;