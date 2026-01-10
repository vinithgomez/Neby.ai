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
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: any[];
  };
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isLoading?: boolean;
  isPainting?: boolean;
  isDirecting?: boolean;
  images?: string[]; // base64 strings
  videoUri?: string;
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
  useMaps: boolean;
  systemInstruction: string;
  aspectRatio: string;
  imageSize: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAnonymous?: boolean;
}

export const DEFAULT_CONFIG: ChatConfig = {
  model: 'gemini-3-flash-preview',
  temperature: 0.7,
  useSearch: false,
  useThinking: false,
  useMaps: false,
  systemInstruction: "You are a helpful, knowledgeable, and creative AI assistant. Answer concisely and accurately.",
  aspectRatio: "1:1",
  imageSize: "1K"
};

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  supportsSearch: boolean;
  supportsThinking: boolean;
  supportsMaps: boolean;
  supportsImageGen: boolean;
  supportsVideoGen: boolean;
  isPremium?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Gemini 3 Flash', 
    description: 'Fast, balanced (Search, Transcribe).',
    supportsSearch: true,
    supportsThinking: true,
    supportsMaps: false,
    supportsImageGen: false,
    supportsVideoGen: false
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro', 
    description: 'Deep reasoning, Image/Video Analysis.',
    supportsSearch: true,
    supportsThinking: true,
    supportsMaps: false,
    supportsImageGen: false,
    supportsVideoGen: false
  },
  { 
    id: 'gemini-3-pro-image-preview', 
    name: 'Gemini 3 Pro Image', 
    description: 'High-fidelity image generation (1K-4K).',
    supportsSearch: false,
    supportsThinking: false,
    supportsMaps: false,
    supportsImageGen: true,
    supportsVideoGen: false
  },
  { 
    id: 'veo-3.1-fast-generate-preview', 
    name: 'Veo 3.1 Video', 
    description: 'Video generation & animation (Premium).',
    supportsSearch: false,
    supportsThinking: false,
    supportsMaps: false,
    supportsImageGen: false,
    supportsVideoGen: true,
    isPremium: true
  }
];