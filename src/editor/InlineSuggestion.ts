import { GemmaService } from '@/ai/GemmaService';
import { ReferenceManager } from '@/references/ReferenceManager';

export interface SuggestionState {
  blockId: string;
  suggestion: string;
  originalText: string;
  isActive: boolean;
  element: HTMLElement | null;
}

export class InlineSuggestion {
  private gemmaService: GemmaService;
  private referenceManager: ReferenceManager;
  private currentSuggestion: SuggestionState | null = null;
  private suggestionTimeout: NodeJS.Timeout | null = null;
  private isGenerating = false;
  private readonly SUGGESTION_DELAY = 800; // ms to wait after typing stops

  constructor(gemmaService: GemmaService, referenceManager: ReferenceManager) {
    this.gemmaService = gemmaService;
    this.referenceManager = referenceManager;
  }

  public async requestSuggestion(
    blockId: string, 
    blockElement: HTMLElement, 
    currentText: string, 
    documentContext: string
  ): Promise<void> {
    // Clear any existing suggestion
    this.clearSuggestion();

    // Clear existing timeout
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }

    // Don't generate if already generating or text is too short
    if (this.isGenerating || currentText.trim().length < 3) {
      return;
    }

    // Set timeout to generate suggestion after user stops typing
    this.suggestionTimeout = setTimeout(async () => {
      await this.generateSuggestion(blockId, blockElement, currentText, documentContext);
    }, this.SUGGESTION_DELAY);
  }

  private async generateSuggestion(
    blockId: string,
    blockElement: HTMLElement,
    currentText: string,
    documentContext: string
  ): Promise<void> {
    if (this.isGenerating) return;

    try {
      this.isGenerating = true;
      
      // Get reference context if available
      const contextKeywords = this.extractKeywords(currentText + ' ' + documentContext);
      const referenceContext = this.referenceManager.getRelevantContent(contextKeywords, 1000);
      
      // Generate suggestion using AI with reference context
      const suggestion = await this.gemmaService.generateCompletion(currentText, documentContext, referenceContext);
      
      if (suggestion && suggestion.trim() && suggestion !== currentText) {
        // Clean up the suggestion (remove any duplicate text)
        const cleanSuggestion = this.cleanSuggestion(currentText, suggestion);
        
        if (cleanSuggestion) {
          this.showInlineSuggestion(blockId, blockElement, currentText, cleanSuggestion);
        }
      }
    } catch (error) {
      console.error('Failed to generate inline suggestion:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  private cleanSuggestion(currentText: string, rawSuggestion: string): string {
    let suggestion = rawSuggestion.trim();
    
    // Remove any text that duplicates the current text
    if (suggestion.startsWith(currentText)) {
      suggestion = suggestion.substring(currentText.length).trim();
    }
    
    // Limit suggestion length to be reasonable
    const words = suggestion.split(' ');
    if (words.length > 10) {
      suggestion = words.slice(0, 10).join(' ') + '...';
    }
    
    // Only show if there's meaningful content
    return suggestion.length > 2 ? suggestion : '';
  }

  private showInlineSuggestion(
    blockId: string,
    blockElement: HTMLElement,
    originalText: string,
    suggestion: string
  ): void {
    // Clear any existing suggestion
    this.clearSuggestion();

    // Create suggestion element
    const suggestionElement = this.createSuggestionElement(suggestion);
    
    // Find the content element within the block
    const contentElement = blockElement.querySelector('.block-content') as HTMLElement;
    if (!contentElement) return;

    // Position the suggestion element
    this.positionSuggestionElement(contentElement, suggestionElement);
    
    // Store suggestion state
    this.currentSuggestion = {
      blockId,
      suggestion,
      originalText,
      isActive: true,
      element: suggestionElement
    };

    // Show subtle animation
    suggestionElement.style.opacity = '0';
    document.body.appendChild(suggestionElement);
    
    requestAnimationFrame(() => {
      suggestionElement.style.transition = 'opacity 0.2s ease';
      suggestionElement.style.opacity = '0.5';
    });
  }

  private createSuggestionElement(suggestion: string): HTMLElement {
    const element = document.createElement('span');
    element.className = 'inline-suggestion';
    element.textContent = suggestion;
    element.style.cssText = `
      position: absolute;
      color: #999;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      pointer-events: none;
      white-space: pre-wrap;
      z-index: 100;
      opacity: 0.5;
      font-style: italic;
    `;
    return element;
  }

  private positionSuggestionElement(contentElement: HTMLElement, suggestionElement: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();

    // Position suggestion right after the cursor
    suggestionElement.style.left = `${rect.left}px`;
    suggestionElement.style.top = `${rect.top}px`;
  }

  public acceptSuggestion(): boolean {
    if (!this.currentSuggestion || !this.currentSuggestion.isActive) {
      return false;
    }

    const { blockId, suggestion, originalText } = this.currentSuggestion;
    const newText = originalText + suggestion.replace(/\.\.\.$/, ''); // Remove trailing dots if present
    
    // Clear the suggestion
    this.clearSuggestion();
    
    // Dispatch event to update the block content
    const event = new CustomEvent('acceptSuggestion', {
      detail: { blockId, newText }
    });
    window.dispatchEvent(event);
    
    return true;
  }

  public clearSuggestion(): void {
    if (this.currentSuggestion?.element) {
      this.currentSuggestion.element.remove();
    }
    
    this.currentSuggestion = null;
    
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
      this.suggestionTimeout = null;
    }
  }

  public hasSuggestion(): boolean {
    return this.currentSuggestion?.isActive ?? false;
  }

  public getCurrentSuggestion(): SuggestionState | null {
    return this.currentSuggestion;
  }

  // Update suggestion position when text changes
  public updateSuggestionPosition(blockElement: HTMLElement): void {
    if (!this.currentSuggestion || !this.currentSuggestion.element) return;

    const contentElement = blockElement.querySelector('.block-content') as HTMLElement;
    if (contentElement) {
      this.positionSuggestionElement(contentElement, this.currentSuggestion.element);
    }
  }

  // Check if suggestion is still valid (text hasn't changed too much)
  public isSuggestionValid(currentText: string): boolean {
    if (!this.currentSuggestion) return false;
    
    // If the original text is still a prefix of current text, suggestion might still be valid
    return currentText.startsWith(this.currentSuggestion.originalText);
  }

  public destroy(): void {
    this.clearSuggestion();
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - split by words and filter meaningful ones
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // Filter short words
      .filter(word => !this.isStopWord(word));

    // Return unique words, limited to avoid too much context
    return [...new Set(words)].slice(0, 10);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 
      'were', 'said', 'each', 'which', 'their', 'time', 'about', 'there',
      'could', 'other', 'more', 'very', 'what', 'know', 'just', 'first',
      'into', 'over', 'think', 'also', 'your', 'work', 'life', 'only',
      'new', 'would', 'come', 'its', 'after', 'way', 'who', 'may',
      'say', 'great', 'where', 'much', 'should', 'well', 'large', 'use'
    ]);
    return stopWords.has(word);
  }
}