
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(maxTokens: number = 10, refillRate: number = 0.2) { // Default: 10 burst, 1 refill every 5s
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  checkLimit(): boolean {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + timePassed * this.refillRate);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
  
  getTimeToNextToken(): number {
     if (this.tokens >= 1) return 0;
     return Math.ceil((1 - this.tokens) / this.refillRate);
  }
}

// Security Constants
export const SECURITY_LIMITS = {
    MAX_MESSAGE_LENGTH: 30000,
    MAX_SYSTEM_INSTRUCTION_LENGTH: 5000,
    MAX_IMAGES: 4,
    MAX_IMAGE_SIZE_MB: 5,
};

export function validateInput(text: string, images: string[] = []): string | null {
    if (!text.trim() && images.length === 0) return "Message cannot be empty.";
    
    // Text Length Check
    if (text.length > SECURITY_LIMITS.MAX_MESSAGE_LENGTH) {
        return `Message too long. Max ${SECURITY_LIMITS.MAX_MESSAGE_LENGTH.toLocaleString()} characters.`;
    }

    // Image Count Check
    if (images.length > SECURITY_LIMITS.MAX_IMAGES) {
        return `Too many images. Max ${SECURITY_LIMITS.MAX_IMAGES}.`;
    }
    
    // Image Validation
    for (const img of images) {
        if (!img.startsWith('data:image/')) return "Invalid image format detected.";
        
        // Base64 Size Estimation: (length * 3/4) - padding
        const sizeInBytes = (img.length * 3) / 4 - (img.indexOf('=') > 0 ? (img.length - img.indexOf('=')) : 0);
        if (sizeInBytes > SECURITY_LIMITS.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            return `Image too large. Max ${SECURITY_LIMITS.MAX_IMAGE_SIZE_MB}MB allowed.`;
        }
    }
    
    return null; // Valid
}

export function sanitizeInput(text: string): string {
    // Remove null bytes and control characters (except newlines/tabs)
    // This helps prevent basic injection attacks or processing errors
    return text.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "").trim(); 
}

// Helper to remove API Keys from error objects before logging
export function sanitizeError(error: any): Error {
    const str = JSON.stringify(error, Object.getOwnPropertyNames(error));
    // Simple regex to mask potential key patterns if they appear in error messages
    const sanitized = str.replace(/AIza[0-9A-Za-z-_]{35}/g, '***API_KEY_HIDDEN***');
    return new Error(JSON.parse(sanitized).message || "An unexpected error occurred");
}
