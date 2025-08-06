import { GemmaService } from '@/ai/GemmaService';
import { Editor } from '@/editor/Editor';
import { ReferenceManager } from '@/references/ReferenceManager';
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
}
export declare class ChatInterface {
    private container;
    private messagesContainer;
    private inputElement;
    private gemmaService;
    private editor;
    private referenceManager;
    private messages;
    private messageIdCounter;
    private isProcessing;
    constructor(container: HTMLElement, gemmaService: GemmaService, editor: Editor, referenceManager: ReferenceManager);
    private initializeElements;
    private setupEventListeners;
    private addWelcomeMessage;
    private sendMessage;
    private handleChatMessage;
    private handleComposerCommand;
    private isComposerCommand;
    private extractInstruction;
    private renderMessage;
    private updateMessageElement;
    private scrollToBottom;
    private getDocumentContext;
    private getReferenceContext;
    private extractKeywords;
    private isStopWord;
    private showNotification;
    clearMessages(): void;
    getMessages(): ChatMessage[];
    addSystemMessage(content: string): void;
}
