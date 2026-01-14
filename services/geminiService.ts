import { GoogleGenAI, Part, Modality } from "@google/genai";
import { ChatConfig, Message, Role } from '../types';
import { RateLimiter, validateInput, sanitizeInput, sanitizeError } from '../utils/security';

// Initialize Rate Limiter: 15 requests burst, refill 1 every 3 seconds
const globalRateLimiter = new RateLimiter(15, 0.33);

export class GeminiService {
  public ai: GoogleGenAI;

  constructor() {
    // API Key must come strictly from env
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      console.warn("Security Warning: API_KEY is missing from environment.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private checkRateLimit() {
    if (!globalRateLimiter.checkLimit()) {
      const waitTime = globalRateLimiter.getTimeToNextToken();
      throw new Error(`Rate limit exceeded. Please wait ${waitTime}s.`);
    }
  }

  /**
   * Generates a short title for the chat session.
   */
  async generateTitle(message: string): Promise<string> {
    try {
      this.checkRateLimit();
      const cleanMessage = sanitizeInput(message).slice(0, 1000); // Strict limit for title generation

      // Re-instantiate to ensure fresh key usage if env changes
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `Generate a short, concise title (max 5 words) for a chat starting with this message: "${cleanMessage}". Return ONLY the title text. Do not use quotes.` }]
        }
      });
      return response.text?.trim() || cleanMessage.slice(0, 30);
    } catch (error) {
      console.error("Title Generation Error:", sanitizeError(error));
      return message.slice(0, 30);
    }
  }

  /**
   * Transcribes audio using Gemini 3 Flash.
   */
  async transcribeAudio(audioBase64: string): Promise<string> {
    try {
      this.checkRateLimit();
      if (!audioBase64) throw new Error("Empty audio data.");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
            { text: "Transcribe this audio exactly as spoken." }
          ]
        }
      });
      return response.text || "";
    } catch (error) {
      console.error("Transcription Error:", sanitizeError(error));
      throw sanitizeError(error);
    }
  }

  /**
   * Generates audio from text using the specialized TTS model.
   */
  async generateSpeech(text: string): Promise<string> {
    try {
      this.checkRateLimit();
      const cleanText = sanitizeInput(text);
      if (!cleanText) throw new Error("Text is required for speech generation.");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Read this message naturally: ${cleanText}` }] }],
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
      console.error("Gemini TTS Error:", sanitizeError(error));
      throw sanitizeError(error);
    }
  }

  /**
   * Generates or Edits images.
   */
  async generateImage(prompt: string, config: ChatConfig, inputImages?: string[]): Promise<string[]> {
    try {
      this.checkRateLimit();
      const cleanPrompt = sanitizeInput(prompt);
      
      const validationError = validateInput(cleanPrompt, inputImages);
      if (validationError) throw new Error(validationError);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const model = config.model; 
      
      const parts: Part[] = [];
      
      if (inputImages && inputImages.length > 0) {
        for (const img of inputImages) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: img.split(',')[1]
            }
          });
        }
      }
      parts.push({ text: cleanPrompt });

      let imageConfig: any = {
        aspectRatio: config.aspectRatio || "1:1"
      };
      
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          imageConfig: model.includes('pro-image') ? { ...imageConfig, imageSize: config.imageSize } : imageConfig
        }
      });

      const images: string[] = [];
      const resParts = response.candidates?.[0]?.content?.parts || [];
      
      for (const part of resParts) {
        if (part.inlineData) {
          images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }

      if (images.length === 0) {
        throw new Error("No image data returned from model.");
      }

      return images;
    } catch (error) {
      console.error("Gemini Image Generation Error:", sanitizeError(error));
      throw sanitizeError(error);
    }
  }

  /**
   * Generates Video or Animates Image.
   */
  async generateVideo(prompt: string, config: ChatConfig, inputImage?: string, onStatusUpdate?: (status: string) => void): Promise<string> {
    try {
      this.checkRateLimit();
      const cleanPrompt = sanitizeInput(prompt);
      const validationError = validateInput(cleanPrompt, inputImage ? [inputImage] : []);
      if (validationError) throw new Error(validationError);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const requestConfig: any = {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: ['16:9', '9:16'].includes(config.aspectRatio || '') ? config.aspectRatio : '16:9'
      };

      let operation;
      if (inputImage) {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: cleanPrompt || "Animate this image",
          image: {
            imageBytes: inputImage.split(',')[1],
            mimeType: 'image/jpeg',
          },
          config: requestConfig
        });
      } else {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: cleanPrompt,
          config: requestConfig
        });
      }

      while (!operation.done) {
        if (onStatusUpdate) onStatusUpdate("Synthesizing video frames...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error("No video URI returned from Gemini Veo");
      }

      // Note: In a production app with a backend, you would proxy this download.
      // Since this is client-only, we must append the key to fetch the content.
      return `${videoUri}&key=${process.env.API_KEY}`;
    } catch (error) {
      console.error("Gemini Video Generation Error:", sanitizeError(error));
      throw sanitizeError(error);
    }
  }

  async *streamChat(
    history: Message[], 
    newMessage: string, 
    images: string[], 
    config: ChatConfig,
    videoData?: string
  ): AsyncGenerator<string | { groundingChunks: any[] }, void, unknown> {
    
    try {
        this.checkRateLimit();
        const cleanMessage = sanitizeInput(newMessage);
        const validationError = validateInput(cleanMessage, images);
        
        // Yield error immediately if validation fails
        if (validationError) {
             yield `⚠️ **Validation Error**: ${validationError}`;
             return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

        const chatHistory = history
          .filter(msg => !msg.isLoading && msg.role !== Role.SYSTEM) 
          .map(msg => ({
            role: msg.role === Role.USER ? 'user' : 'model',
            parts: msg.images && msg.images.length > 0 
              ? [
                  ...msg.images.map(img => ({ inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] } })),
                  { text: sanitizeInput(msg.content) }
                ]
              : [{ text: sanitizeInput(msg.content) }]
          }));

        const currentParts: Part[] = [];
        
        if (images.length > 0) {
          images.forEach(img => {
            currentParts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: img.split(',')[1]
              }
            });
          });
        }

        if (videoData) {
          currentParts.push({
            inlineData: {
              mimeType: 'video/mp4',
              data: videoData.split(',')[1]
            }
          });
        }

        currentParts.push({ text: cleanMessage });

        const tools: any[] = [];
        if (config.useSearch && config.model.includes('gemini-3')) {
          tools.push({ googleSearch: {} });
        }
        if (config.useMaps && config.model.includes('gemini-2.5-flash')) {
          tools.push({ googleMaps: {} });
        }

        const thinkingConfig = (config.useThinking && config.model.includes('gemini-3'))
          ? { thinkingBudget: config.model.includes('pro') ? 32000 : 16000 } 
          : undefined;

        const isSingleTurnOnly = config.model.includes('tts') || config.model.includes('image');
        
        const contents = isSingleTurnOnly 
          ? [{ role: 'user', parts: currentParts }]
          : [
              ...chatHistory,
              { role: 'user', parts: currentParts }
            ];

      const result = await ai.models.generateContentStream({
        model: config.model,
        contents: contents,
        config: {
          systemInstruction: sanitizeInput(config.systemInstruction),
          temperature: config.useThinking ? undefined : config.temperature,
          tools: tools.length > 0 ? tools : undefined,
          thinkingConfig: thinkingConfig,
        }
      });

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) yield text;
        
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) yield { groundingChunks };

        const candidate = chunk.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          yield "\n\n⚠️ *The response was filtered by safety settings.*";
        }
      }
    } catch (error: any) {
      console.error("Gemini API Error Detail:", sanitizeError(error));
      
      const errorMessage = error.message || error.error?.message || JSON.stringify(error);
      const statusCode = error.status || (error.response?.status) || error.code;

      if (errorMessage.includes("Rate limit exceeded")) {
         yield "🛑 **Rate Limit**: " + errorMessage;
         return;
      }

      if (errorMessage.includes("Requested entity was not found") || statusCode === 404) {
        throw sanitizeError(error);
      }
      if (statusCode === 429) {
        yield "🚀 **Server Rate Limit Reached**: Please wait a moment.";
        return;
      }
      yield "☄️ **Error**: " + (errorMessage.slice(0, 100) + "...");
    }
  }
}

export const geminiService = new GeminiService();
