import { GoogleGenAI, Part, Modality } from "@google/genai";
import { ChatConfig, Message, Role } from '../types';

export class GeminiService {
  public ai: GoogleGenAI; // Made public for Live API access in App

  constructor() {
    if (!process.env.API_KEY) {
      console.error("API_KEY is missing from environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  /**
   * Transcribes audio using Gemini 3 Flash.
   */
  async transcribeAudio(audioBase64: string): Promise<string> {
    try {
      // Re-instantiate to get latest key
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
      console.error("Transcription Error:", error);
      throw error;
    }
  }

  /**
   * Generates audio from text using the specialized TTS model.
   */
  async generateSpeech(text: string): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
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
   * Generates or Edits images.
   */
  async generateImage(prompt: string, config: ChatConfig, inputImages?: string[]): Promise<string[]> {
    try {
      // Re-instantiate AI to ensure it picks up the latest API Key if changed via UI
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const model = config.model; 
      
      const parts: Part[] = [];
      
      // If input images are present, we are editing (or informing generation)
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
      parts.push({ text: prompt });

      // Config depends on model
      let imageConfig: any = {
        aspectRatio: config.aspectRatio || "1:1"
      };
      
      // Image Size only for Pro Image
      if (model.includes('pro-image')) {
        // "1K", "2K", "4K"
      }

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
      console.error("Gemini Image Generation Error:", error);
      throw error;
    }
  }

  /**
   * Generates Video or Animates Image.
   */
  async generateVideo(prompt: string, config: ChatConfig, inputImage?: string, onStatusUpdate?: (status: string) => void): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const requestConfig: any = {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: ['16:9', '9:16'].includes(config.aspectRatio || '') ? config.aspectRatio : '16:9'
      };

      // Construct payload
      let operation;
      if (inputImage) {
        // Image-to-Video
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt || "Animate this image",
          image: {
            imageBytes: inputImage.split(',')[1],
            mimeType: 'image/jpeg',
          },
          config: requestConfig
        });
      } else {
        // Text-to-Video
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
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

      return `${videoUri}&key=${process.env.API_KEY}`;
    } catch (error) {
      console.error("Gemini Video Generation Error:", error);
      throw error;
    }
  }

  async *streamChat(
    history: Message[], 
    newMessage: string, 
    images: string[], 
    config: ChatConfig,
    videoData?: string // base64 video file if any
  ): AsyncGenerator<string | { groundingChunks: any[] }, void, unknown> {
    
    // Re-instantiate AI for streaming to catch latest key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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

    const currentParts: Part[] = [];
    
    // Images
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

    // Video Attachment (for Understanding)
    if (videoData) {
      // Assuming small video file converted to base64
      // inlineData limit is ~20MB. 
      // MimeType usually video/mp4
      currentParts.push({
        inlineData: {
          mimeType: 'video/mp4',
          data: videoData.split(',')[1]
        }
      });
    }

    currentParts.push({ text: newMessage });

    const tools: any[] = [];
    // Only Gemini 3 supports Google Search in this codebase context
    if (config.useSearch && config.model.includes('gemini-3')) {
      tools.push({ googleSearch: {} });
    }
    // Only Gemini 2.5 supports Google Maps (if we were using it)
    if (config.useMaps && config.model.includes('gemini-2.5-flash')) {
      tools.push({ googleMaps: {} });
    }

    // Thinking Config - Valid for Gemini 3 and 2.5
    // Flash limit ~24k, Pro limit ~32k
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

    try {
      const result = await ai.models.generateContentStream({
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
        if (text) yield text;
        
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) yield { groundingChunks };

        const candidate = chunk.candidates?.[0];
        if (candidate?.finishReason === 'SAFETY') {
          yield "\n\n⚠️ *The response was filtered by safety settings.*";
        }
      }
    } catch (error: any) {
      console.error("Gemini API Error Detail:", error);
      
      const errorMessage = error.message || error.error?.message || JSON.stringify(error);
      const statusCode = error.status || (error.response?.status) || error.code;

      if (errorMessage.includes("Requested entity was not found") || statusCode === 404) {
        throw error;
      }
      if (statusCode === 429) {
        yield "🚀 **Rate Limit Reached**: Please wait.";
        return;
      }
      yield "☄️ **Error**: " + (errorMessage.slice(0, 100) + "...");
    }
  }
}

export const geminiService = new GeminiService();