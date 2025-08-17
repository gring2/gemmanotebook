import { GemmaService, GenerationOptions } from '@/ai/GemmaService';

export interface KeyFacts {
  subject: string;
  action: string;
  details: string;
  relevanceScore?: number;
}

export interface ReportSection {
  title: string;
  content: string;
  facts: KeyFacts[];
}

export abstract class BaseAgent {
  protected gemmaService: GemmaService;

  constructor(gemmaService: GemmaService) {
    this.gemmaService = gemmaService;
  }

  protected async generateWithRetry(
    prompt: string, 
    options: GenerationOptions = {},
    maxRetries: number = 2
  ): Promise<string> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await this.gemmaService.generate(prompt, options);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Agent generation attempt ${i + 1} failed:`, error);
        
        if (i < maxRetries) {
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    throw lastError || new Error('Generation failed after retries');
  }

  protected containsKorean(text: string): boolean {
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/;
    return koreanRegex.test(text);
  }

  protected chunkText(text: string, maxSize: number, overlap: number = 50): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + maxSize, text.length);
      const chunk = text.substring(start, end);
      
      // Try to end at sentence boundary
      if (end < text.length) {
        const lastSentence = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastSentence, lastNewline);
        
        if (breakPoint > start + maxSize * 0.7) { // Don't make chunks too small
          chunks.push(text.substring(start, breakPoint + 1));
          start = breakPoint + 1 - overlap;
        } else {
          chunks.push(chunk);
          start = end - overlap;
        }
      } else {
        chunks.push(chunk);
        break;
      }
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }
}