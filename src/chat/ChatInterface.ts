import { GemmaService } from '@/ai/GemmaService';
import { Editor } from '@/editor/Editor';
import { ReferenceManager } from '@/references/ReferenceManager';
import { MultiTurnReportGenerator } from '@/agents/MultiTurnReportGenerator';

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
  private multiTurnGenerator: MultiTurnReportGenerator;
  private messages: ChatMessage[] = [];
  private messageIdCounter = 0;
  private isProcessing = false;

  constructor(container: HTMLElement, gemmaService: GemmaService, editor: Editor, referenceManager: ReferenceManager) {
    this.container = container;
    this.gemmaService = gemmaService;
    this.editor = editor;
    this.referenceManager = referenceManager;
    this.multiTurnGenerator = new MultiTurnReportGenerator(gemmaService);

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

      // Debug logging - remove after testing
      console.log('Debug - Reference context length:', referenceContext.length);
      console.log('Debug - Reference context preview:', referenceContext.substring(0, 200));
      console.log('Debug - Is composer command:', this.isComposerCommand(content));

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
    const isKorean = this.containsKorean(content);

    // Check if we should use multi-turn approach
    if (this.multiTurnGenerator.shouldUseMultiTurn(instruction, referenceContext)) {
      console.log('Using multi-turn report generation');
      await this.handleMultiTurnGeneration(instruction, referenceContext, assistantMessage, messageElement);
      return;
    }

    // Use existing single-turn approach
    console.log('Using single-turn generation');
    const referencesInfo = referenceContext 
      ? isKorean ? ' (참고자료 활용)' : ' (using reference materials)'
      : '';
    
    assistantMessage.content = isKorean 
      ? `🎯 문서에 내용을 생성하고 있습니다${referencesInfo}...`
      : `🎯 Generating content in your document${referencesInfo}...`;
    assistantMessage.isStreaming = false;
    this.updateMessageElement(messageElement, assistantMessage);

    try {
      // Generate content directly in the editor using streaming
      await this.editor.streamAIContentIntoEditor(instruction);
      
      // Update chat to show completion
      if (isKorean) {
        assistantMessage.content = `✅ 내용이 생성되어 문서에 삽입되었습니다!${referencesInfo ? '\n\n📚 참고자료를 활용하여 내용을 작성했습니다.' : ''}`;
      } else {
        assistantMessage.content = `✅ Content has been generated and inserted into your document!${referencesInfo ? '\n\n📚 Used reference materials for context.' : ''}`;
      }
      this.updateMessageElement(messageElement, assistantMessage);
      
    } catch (error) {
      console.error('Content generation failed:', error);
      assistantMessage.content = isKorean 
        ? '❌ 내용 생성에 실패했습니다. 다시 시도해주세요.'
        : '❌ Failed to generate content. Please try again.';
      this.updateMessageElement(messageElement, assistantMessage);
    }
  }

  private isComposerCommand(content: string): boolean {
    const composerKeywords = [
      // English keywords
      'write', 'generate', 'create', 'compose', 'draft', 'make', 
      'help me write', 'can you write', 'please write',
      // Korean translations
      '써줘', '작성해줘', '생성해줘', '만들어줘', '초안', '쓰기',
      '써주세요', '작성해주세요', '만들어주세요', '도와줘',
      // Korean document-related terms
      '작성', '생성', '만들', '써', '쓰', '작성해', '만들어',
      '레포트', '보고서', '문서', '글을', '내용을',
      // Korean reference-based generation terms
      '참고해서', '참고하여', '활용해서', '활용하여', '기반으로'
    ];
    
    const lowerContent = content.toLowerCase();
    return composerKeywords.some(keyword => lowerContent.includes(keyword));
  }

  private extractInstruction(content: string): string {
    // Remove common prefixes to get the core instruction
    return content
      .replace(/^(write|generate|create|compose|draft|make)\s+/i, '')
      .replace(/^(help me|can you|please)\s+(write|generate|create|compose|draft|make)\s+/i, '')
      .replace(/^(써줘|작성해줘|생성해줘|만들어줘|써주세요|작성해주세요|만들어주세요)\s*/i, '')
      .replace(/^.*?(를|을)\s+(참고해서|참고하여|활용해서|활용하여|기반으로)\s+/i, '')
      .replace(/^(참고자료를|참고자료를|자료를)\s*(참고해서|참고하여|활용해서|활용하여|기반으로)\s*/i, '')
      .replace(/^(도와줘|도와주세요)\s+/i, '')
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
    // Check if we have any reference documents first
    const allDocs = this.referenceManager.getAllDocuments();
    if (allDocs.length === 0) {
      return '';
    }

    // For Korean requests about reports/documents, return all reference content
    const isKorean = this.containsKorean(message);
    const hasReportRequest = message.toLowerCase().includes('레포트') || 
                           message.toLowerCase().includes('보고서') ||
                           message.toLowerCase().includes('참고') ||
                           message.toLowerCase().includes('활용') ||
                           message.includes('report') ||
                           message.includes('reference');

    if (hasReportRequest || isKorean) {
      // Return all reference documents content for document generation requests
      return this.referenceManager.getDocumentsContent().substring(0, 2000);
    }

    // Extract keywords from the user message and document context
    const documentContext = this.getDocumentContext();
    const allText = message + ' ' + documentContext;
    const keywords = this.extractKeywords(allText);
    
    // Get relevant reference content using keywords
    const relevantContent = this.referenceManager.getRelevantContent(keywords, 1500);
    
    // If no relevant content found with keywords, return some reference content anyway
    if (!relevantContent.trim()) {
      return this.referenceManager.getDocumentsContent().substring(0, 1000);
    }
    
    return relevantContent;
  }

  private extractKeywords(text: string): string[] {
    const isKorean = this.containsKorean(text);
    
    if (isKorean) {
      // For Korean text, extract meaningful morphemes and words
      const koreanWords = text
        .replace(/[^\w\s가-힣]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1) // Korean words can be shorter
        .filter(word => !this.isKoreanStopWord(word));
      
      return [...new Set(koreanWords)].slice(0, 15);
    } else {
      // English keyword extraction
      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3) // Filter short words
        .filter(word => !this.isStopWord(word));

      // Return unique words, limited to avoid too much context
      return [...new Set(words)].slice(0, 12);
    }
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

  private containsKorean(text: string): boolean {
    // Korean character ranges: Hangul syllables, Jamo, and other Korean characters
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/;
    return koreanRegex.test(text);
  }

  private isKoreanStopWord(word: string): boolean {
    const koreanStopWords = new Set([
      // Common Korean particles, conjunctions, and function words
      '은', '는', '이', '가', '을', '를', '의', '에', '에서', '로', '와', '과', '도',
      '그', '이', '저', '그런', '이런', '저런', '것', '수', '때', '곳', '등',
      '하다', '있다', '없다', '되다', '같다', '이다', '아니다',
      '그리고', '하지만', '그러나', '또한', '또는', '혹은', '만약', '다시',
      '아주', '매우', '정말', '너무', '조금', '좀', '많이', '잘', '못'
    ]);
    return koreanStopWords.has(word);
  }

  private async handleMultiTurnGeneration(
    instruction: string,
    referenceContext: string,
    assistantMessage: ChatMessage,
    messageElement: HTMLElement
  ): Promise<void> {
    try {
      // Generate the multi-turn report
      const report = await this.multiTurnGenerator.generateKoreanReport(
        instruction,
        referenceContext,
        (progress) => {
          assistantMessage.content = progress.message;
          assistantMessage.isStreaming = progress.stage !== 'complete' && progress.stage !== 'error';
          this.updateMessageElement(messageElement, assistantMessage);
        }
      );

      // Insert the generated report into the editor
      await this.insertReportIntoEditor(report);

      // Update final success message
      assistantMessage.content = '✅ 참고자료를 활용한 한국어 리포트가 성공적으로 생성되었습니다!\n\n📚 다단계 AI 워크플로우를 통해 참고자료의 핵심 정보를 추출하고 체계적으로 구성했습니다.';
      assistantMessage.isStreaming = false;
      this.updateMessageElement(messageElement, assistantMessage);

    } catch (error) {
      console.error('Multi-turn generation failed:', error);
      assistantMessage.content = `❌ 다단계 리포트 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}\n\n단순 생성 방식으로 다시 시도해보세요.`;
      assistantMessage.isStreaming = false;
      this.updateMessageElement(messageElement, assistantMessage);
    }
  }

  private async insertReportIntoEditor(report: string): Promise<void> {
    // Parse the report into sections and insert each as a separate block
    const sections = this.parseReportSections(report);
    
    for (const section of sections) {
      if (section.trim()) {
        // Insert each section as a new block
        const blockId = this.editor.addBlock('paragraph', section.trim());
        
        // Small delay to make the insertion feel more natural
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private parseReportSections(report: string): string[] {
    // Split by markdown headers and double line breaks
    const sections = report.split(/(?=^#)/gm)
      .flatMap(section => section.split(/\n\s*\n/))
      .filter(section => section.trim().length > 0)
      .map(section => section.trim());
    
    return sections;
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