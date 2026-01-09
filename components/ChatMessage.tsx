import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';
import { User, Globe, Copy, Check } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const NexusLogo = () => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" className="fill-indigo-900/50 stroke-indigo-400" strokeWidth="2"/>
    <path d="M12 6L12 18M6 9L18 15M18 9L6 15" className="stroke-purple-400" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
            isUser 
              ? 'bg-gradient-to-br from-indigo-600 to-purple-600' 
              : 'bg-black/40 border border-white/10 backdrop-blur-md'
          }`}>
            {isUser ? (
              <User size={20} className="text-white/90" />
            ) : (
              <div className="w-6 h-6">
                <NexusLogo />
              </div>
            )}
          </div>
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
          
          <div className={`relative px-6 py-5 shadow-lg ${
            isUser 
              ? 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 text-white rounded-2xl rounded-tr-sm' 
              : 'bg-black/30 backdrop-blur-md text-zinc-100 rounded-2xl rounded-tl-sm border border-white/10'
          }`}>
            
            {/* Images if any */}
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {message.images.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt={`attachment-${idx}`} 
                    className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-white/20 shadow-sm"
                  />
                ))}
              </div>
            )}

            {/* Loading Indicator */}
            {message.isLoading ? (
              <div className="flex space-x-2 h-6 items-center px-2">
                <div className="w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              <div className="markdown-content text-[15px] leading-7 tracking-wide">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}

            {/* Copy Button (only for model messages) */}
            {!isUser && !message.isLoading && (
              <button 
                onClick={handleCopy}
                className="absolute bottom-2 right-2 p-1.5 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-white/10"
                title="Copy response"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            )}
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="text-[11px] text-zinc-500 font-medium shadow-black drop-shadow-sm">
               {isUser ? 'You' : 'Neby'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {/* Grounding Sources */}
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

          {/* Sources Detail View */}
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