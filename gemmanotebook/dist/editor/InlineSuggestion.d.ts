import { GemmaService } from '@/ai/GemmaService';
import { ReferenceManager } from '@/references/ReferenceManager';
export interface SuggestionState {
    blockId: string;
    suggestion: string;
    originalText: string;
    isActive: boolean;
    element: HTMLElement | null;
}
export declare class InlineSuggestion {
    private gemmaService;
    private referenceManager;
    private currentSuggestion;
    private suggestionTimeout;
    private isGenerating;
    private readonly SUGGESTION_DELAY;
    constructor(gemmaService: GemmaService, referenceManager: ReferenceManager);
    requestSuggestion(blockId: string, blockElement: HTMLElement, currentText: string, documentContext: string): Promise<void>;
    private generateSuggestion;
    private cleanSuggestion;
    private showInlineSuggestion;
    private createSuggestionElement;
    private positionSuggestionElement;
    acceptSuggestion(): boolean;
    clearSuggestion(): void;
    hasSuggestion(): boolean;
    getCurrentSuggestion(): SuggestionState | null;
    updateSuggestionPosition(blockElement: HTMLElement): void;
    isSuggestionValid(currentText: string): boolean;
    destroy(): void;
    private extractKeywords;
    private isStopWord;
}
