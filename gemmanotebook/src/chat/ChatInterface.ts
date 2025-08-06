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

export class ChatInterface {
  private container: HTMLElement;
  private messagesContainer!: HTMLElement;
  private inputElement!: HTMLInputElement;
  private gemmaService: GemmaService;
  private editor: Editor;
  private referenceManager: ReferenceManager;
  private messages: ChatMessage[] = [];
  private messageIdCounter = 0;
  private isProcessing = false;

  constructor(container: HTMLElement, gemmaService: GemmaService, editor: Editor, referenceManager: ReferenceManager) {
    this.container = container;
    this.gemmaService = gemmaService;
    this.editor = editor;
    this.referenceManager = referenceManager;

    this.initializeElements();
    this.setupEventListeners();
    this.addWelcomeMessage();
  }

  private initializeElements(): void {
    this.messagesContainer = this.container.querySelector('#chat-messages') as HTMLElement;
    this.inputElement = this.container.querySelector('#chat-input') as HTMLInputElement;

    if (!this.messagesContainer || !this.inputElement) {
      throw new Error('Chat interface elements not found');
    }

    // Add some styling improvements
    this.messagesContainer.style.cssText += `
      max-height: 400px;
      overflow-y: auto;
      scroll-behavior: smooth;
    `;
  }

  private setupEventListeners(): void {
    // Handle Enter key in input
    this.inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
    });

    // Handle input focus
    this.inputElement.addEventListener('focus', () => {
      this.inputElement.style.borderColor = '#2196f3';
    });

    this.inputElement.addEventListener('blur', () => {
      this.inputElement.style.borderColor = '#ddd';
    });
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: ChatMessage = {
      id: `msg-${++this.messageIdCounter}`,
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant powered by Gemma3. I can help you with questions and guidance. For content generation, try:\n\n• **Inline suggestions**: Just type - gray suggestions appear automatically (press Tab to accept, Esc to dismiss)\n• **Chat commands**: "Write a paragraph about..." (generates directly in editor)\n• **AI command palette**: Ctrl+/ (or Cmd+/) to open quick AI commands\n• **Reference documents**: Upload .txt/.md files below - I\'ll use them as context for better responses\n\nWhat can I help you with?',
      timestamp: new Date()
    };

    this.messages.push(welcomeMessage);
    this.renderMessage(welcomeMessage);
  }

  private async sendMessage(): Promise<void> {
    const content = this.inputElement.value.trim();
    if (!content || this.isProcessing) return;

    // Clear input
    this.inputElement.value = '';
    this.isProcessing = true;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${++this.messageIdCounter}`,
      role: 'user',
      content,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.renderMessage(userMessage);

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: `msg-${++this.messageIdCounter}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    this.messages.push(assistantMessage);
    const messageElement = this.renderMessage(assistantMessage);

    try {
      // Get document context and reference context
      const context = this.getDocumentContext();
      const referenceContext = this.getReferenceContext(content);

      // Check if this is a composer command
      if (this.isComposerCommand(content)) {
        await this.handleComposerCommand(content, context, referenceContext, assistantMessage, messageElement);
      } else {
        await this.handleChatMessage(content, context, referenceContext, assistantMessage, messageElement);
      }
    } catch (error) {
      console.error('Chat error:', error);
      assistantMessage.content = 'Sorry, I encountered an error processing your message. Please try again.';
      assistantMessage.isStreaming = false;
      this.updateMessageElement(messageElement, assistantMessage);
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleChatMessage(
    content: string, 
    context: string, 
    referenceContext: string,
    assistantMessage: ChatMessage, 
    messageElement: HTMLElement
  ): Promise<void> {
    let fullResponse = '';

    await this.gemmaService.generateStreamFromChat(
      content,
      (chunk: string) => {
        fullResponse += chunk;
        assistantMessage.content = fullResponse;
        this.updateMessageElement(messageElement, assistantMessage);
        this.scrollToBottom();
      },
      context,
      referenceContext
    );

    assistantMessage.isStreaming = false;
    this.updateMessageElement(messageElement, assistantMessage);
  }

  private async handleComposerCommand(
    content: string, 
    context: string, 
    referenceContext: string,
    assistantMessage: ChatMessage, 
    messageElement: HTMLElement
  ): Promise<void> {
    const instruction = this.extractInstruction(content);

    // Show what we're doing
    const referencesInfo = referenceContext ? ' (using reference materials)' : '';
    assistantMessage.content = `🎯 Generating content in your document${referencesInfo}...`;
    assistantMessage.isStreaming = false;
    this.updateMessageElement(messageElement, assistantMessage);

    try {
      // Generate content directly in the editor using streaming
      await this.editor.streamAIContentIntoEditor(instruction);
      
      // Update chat to show completion
      assistantMessage.content = `✅ Content has been generated and inserted into your document!${referencesInfo ? '\n\n📚 Used reference materials for context.' : ''}`;
      this.updateMessageElement(messageElement, assistantMessage);
      
    } catch (error) {
      console.error('Content generation failed:', error);
      assistantMessage.content = '❌ Failed to generate content. Please try again.';
      this.updateMessageElement(messageElement, assistantMessage);
    }
  }

  private isComposerCommand(content: string): boolean {
    const composerKeywords = [
      'write', 'generate', 'create', 'compose', 'draft', 'make', 
      'help me write', 'can you write', 'please write'
    ];
    
    const lowerContent = content.toLowerCase();
    return composerKeywords.some(keyword => lowerContent.includes(keyword));
  }

  private extractInstruction(content: string): string {
    // Remove common prefixes to get the core instruction
    return content
      .replace(/^(write|generate|create|compose|draft|make)\s+/i, '')
      .replace(/^(help me|can you|please)\s+(write|generate|create|compose|draft|make)\s+/i, '')
      .trim();
  }


  private renderMessage(message: ChatMessage): HTMLElement {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.role}`;
    messageElement.dataset.messageId = message.id;
    
    messageElement.style.cssText = `
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 8px;
      max-width: 85%;
      word-wrap: break-word;
      ${message.role === 'user' 
        ? 'background: #e3f2fd; margin-left: auto; text-align: right;' 
        : 'background: #f5f5f5; margin-right: auto;'}
    `;

    this.updateMessageElement(messageElement, message);
    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();
    
    return messageElement;
  }

  private updateMessageElement(element: HTMLElement, message: ChatMessage): void {
    const contentElement = element.querySelector('.message-content') || (() => {
      const content = document.createElement('div');
      content.className = 'message-content';
      content.style.cssText = 'line-height: 1.4; white-space: pre-wrap;';
      element.appendChild(content);
      return content;
    })();

    contentElement.textContent = message.content;

    // Add streaming indicator
    if (message.isStreaming) {
      const indicator = element.querySelector('.streaming-indicator') || (() => {
        const indicator = document.createElement('span');
        indicator.className = 'streaming-indicator';
        indicator.textContent = ' ●';
        indicator.style.cssText = 'color: #2196f3; animation: pulse 1s infinite;';
        element.appendChild(indicator);
        return indicator;
      })();
    } else {
      const indicator = element.querySelector('.streaming-indicator');
      if (indicator) {
        indicator.remove();
      }
    }

    // Add timestamp
    const timestampElement = element.querySelector('.message-timestamp') || (() => {
      const timestamp = document.createElement('div');
      timestamp.className = 'message-timestamp';
      timestamp.style.cssText = 'font-size: 11px; color: #666; margin-top: 4px; opacity: 0.7;';
      element.appendChild(timestamp);
      return timestamp;
    })();

    timestampElement.textContent = message.timestamp.toLocaleTimeString();
  }

  private scrollToBottom(): void {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private getDocumentContext(): string {
    const blocks = this.editor.getBlocks();
    return blocks.map(block => block.content).join('\n').substring(0, 2000); // Limit context size
  }

  private getReferenceContext(message: string): string {
    // Extract keywords from the user message and document context
    const documentContext = this.getDocumentContext();
    const allText = message + ' ' + documentContext;
    const keywords = this.extractKeywords(allText);
    
    // Get relevant reference content
    return this.referenceManager.getRelevantContent(keywords, 1500);
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
    return [...new Set(words)].slice(0, 12);
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

  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'chat-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1001;
      animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  public clearMessages(): void {
    this.messages = [];
    this.messagesContainer.innerHTML = '';
    this.addWelcomeMessage();
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public addSystemMessage(content: string): void {
    const message: ChatMessage = {
      id: `msg-${++this.messageIdCounter}`,
      role: 'assistant',
      content,
      timestamp: new Date()
    };

    this.messages.push(message);
    this.renderMessage(message);
  }
}