export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isLoading?: boolean;
  isPainting?: boolean;
  images?: string[]; // base64 strings
  groundingSources?: GroundingChunk[];
  audioBase64?: string; // Cached TTS audio
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface ChatConfig {
  model: string;
  temperature: number;
  useSearch: boolean;
  useThinking: boolean;
  systemInstruction: string;
}

export const DEFAULT_CONFIG: ChatConfig = {
  model: 'gemini-3-flash-preview',
  temperature: 0.7,
  useSearch: false,
  useThinking: false,
  systemInstruction: "You are a helpful, knowledgeable, and creative AI assistant. Answer concisely and accurately."
};

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  supportsSearch: boolean;
  supportsThinking: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Gemini 3 Flash', 
    description: 'Fast, efficient, and balanced for daily use.',
    supportsSearch: true,
    supportsThinking: true
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro', 
    description: 'Advanced reasoning, coding, and complex logic.',
    supportsSearch: true,
    supportsThinking: true
  },
  { 
    id: 'gemini-2.5-flash-image', 
    name: 'Gemini Imagine', 
    description: 'State-of-the-art image generation and editing.',
    supportsSearch: false,
    supportsThinking: false
  },
  { 
    id: 'gemini-flash-lite-latest', 
    name: 'Gemini Lite', 
    description: 'Ultra-fast and lightweight for simple tasks.',
    supportsSearch: true,
    supportsThinking: false
  },
  { 
    id: 'gemini-2.5-flash-native-audio-preview-12-2025', 
    name: 'Gemini Native Audio', 
    description: 'Superior multimodal capabilities and audio processing.',
    supportsSearch: true,
    supportsThinking: true
  },
  { 
    id: 'gemini-2.5-flash-preview-tts', 
    name: 'Gemini TTS', 
    description: 'Specialized for voice-to-text (Single-turn only).',
    supportsSearch: false,
    supportsThinking: false
  },
];