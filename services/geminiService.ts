import { GoogleGenAI, Part, Modality } from "@google/genai";
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

  /**
   * Generates audio from text using the specialized TTS model.
   * Returns a base64 string of raw PCM data (24kHz, 1 channel).
   */
  async generateSpeech(text: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read this message naturally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        throw new Error("No audio data returned from Gemini TTS");
      }
      return audioBase64;
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      throw error;
    }
  }

  /**
   * Generates images based on a text prompt using the image model.
   * Returns an array of base64 strings.
   */
  async generateImage(prompt: string): Promise<string[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      const images: string[] = [];
      const parts = response.candidates?.[0]?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }

      if (images.length === 0) {
        throw new Error("No image data returned from model.");
      }

      return images;
    } catch (error) {
      console.error("Gemini Image Generation Error:", error);
      throw error;
    }
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
    const isThinkingSupported = config.model.includes('gemini-3') || config.model.includes('gemini-2.5');
    const thinkingConfig = (config.useThinking && isThinkingSupported)
      ? { thinkingBudget: 4096 } 
      : undefined;

    // Detect if model supports multi-turn history.
    const isSingleTurnOnly = config.model.includes('tts') || config.model.includes('image');
    
    // Construct the contents array.
    const contents = isSingleTurnOnly 
      ? [{ role: 'user', parts: currentParts }]
      : [
          ...chatHistory,
          { role: 'user', parts: currentParts }
        ];

    try {
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
        const text = chunk.text;
        if (text) {
          yield text;
        }
        
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
           yield { groundingChunks };
        }

        const candidate = chunk.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          yield "\n\n⚠️ *The response was filtered by safety settings.*";
        }
      }
    } catch (error: any) {
      console.error("Gemini API Error Detail:", error);
      
      const errorMessage = error.message || "";
      const statusCode = error.status || (error.response?.status);

      if (statusCode === 429 || errorMessage.toLowerCase().includes('rate limit')) {
        yield "🚀 **Rate Limit Reached**: Neby needs a short break! Please wait a minute.";
        return;
      }

      if (statusCode === 401 || statusCode === 403) {
        yield "🔐 **Authentication Error**: Check your API key.";
        return;
      }

      if (statusCode === 400) {
        yield "❌ **Invalid Request**: Check model compatibility with features like Search or Thinking.";
        return;
      }

      yield "☄️ **Unexpected Error**: Neural mesh disruption. Please try again.";
    }
  }
}

export const geminiService = new GeminiService();