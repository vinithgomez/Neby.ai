import { GoogleGenAI, Part } from "@google/genai";
import { ChatConfig, Message, Role } from '../types';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Ensure API Key is available
    if (!process.env.API_KEY) {
      console.error("API_KEY is missing from environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async *streamChat(
    history: Message[], 
    newMessage: string, 
    images: string[], 
    config: ChatConfig
  ): AsyncGenerator<string | { groundingChunks: any[] }, void, unknown> {
    
    // Transform internal history to API format
    const chatHistory = history
      .filter(msg => !msg.isLoading && msg.role !== Role.SYSTEM) 
      .map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: msg.images && msg.images.length > 0 
          ? [
              ...msg.images.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] } })),
              { text: msg.content }
            ]
          : [{ text: msg.content }]
      }));

    // Construct the current message parts
    const currentParts: Part[] = [];
    if (images.length > 0) {
      images.forEach(img => {
        const base64Data = img.split(',')[1];
        currentParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        });
      });
    }
    currentParts.push({ text: newMessage });

    // Prepare Tools
    const tools: any[] = [];
    if (config.useSearch) {
      tools.push({ googleSearch: {} });
    }

    // Prepare Thinking Config
    // Thinking Config is only available for the Gemini 3 and 2.5 series models.
    const isThinkingSupported = config.model.includes('gemini-3') || config.model.includes('gemini-2.5');
    const thinkingConfig = (config.useThinking && isThinkingSupported)
      ? { thinkingBudget: 4096 } 
      : undefined;

    // Detect if model supports multi-turn history.
    // Specialized models like TTS often do not support history.
    const isSingleTurnOnly = config.model.includes('tts');
    
    // Construct the contents array.
    const contents = isSingleTurnOnly 
      ? [{ role: 'user', parts: currentParts }]
      : [
          ...chatHistory,
          { role: 'user', parts: currentParts }
        ];

    try {
      // Use generateContentStream directly for better control over history
      const result = await this.ai.models.generateContentStream({
        model: config.model,
        contents: contents,
        config: {
          systemInstruction: config.systemInstruction,
          temperature: config.useThinking ? undefined : config.temperature,
          tools: tools.length > 0 ? tools : undefined,
          thinkingConfig: thinkingConfig,
        }
      });

      for await (const chunk of result) {
        // Check for text content
        const text = chunk.text;
        if (text) {
          yield text;
        }
        
        // Check for grounding metadata
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
           yield { groundingChunks };
        }
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Handle specific known model errors
      if (error.message?.includes('thinking_config') || error.message?.includes('not supported')) {
         yield "Error: This model may not support the selected options (like Deep Thinking or Search). Please try disabling them in the sidebar.";
      } else if (error.message?.includes('Multiturn chat')) {
         yield "Error: This model does not support conversational history. Try starting a new chat or switching models.";
      } else {
         throw error;
      }
    }
  }
}

export const geminiService = new GeminiService();