import { Block, BlockType, EditorState } from './types';
import { BlockFactory } from './BlockFactory';
import { BlockRenderer } from './BlockRenderer';
import { GemmaService } from '@/ai/GemmaService';
import { InlineSuggestion } from './InlineSuggestion';
import { ReferenceManager } from '@/references/ReferenceManager';
import { DragAndDrop } from './DragAndDrop';

export class Editor {
  private container: HTMLElement;
  private editorElement!: HTMLElement;
  private blocks: Block[] = [];
  private currentBlockId: string | null = null;
  private blockIdCounter = 0;
  private gemmaService: GemmaService;
  private blockFactory: BlockFactory;
  private blockRenderer: BlockRenderer;
  private inlineSuggestion: InlineSuggestion;
  private referenceManager: ReferenceManager;
  private dragAndDrop: DragAndDrop;

  constructor(container: HTMLElement, gemmaService: GemmaService, referenceManager: ReferenceManager) {
    this.container = container;
    this.gemmaService = gemmaService;
    this.referenceManager = referenceManager;
    this.blockFactory = new BlockFactory();
    this.blockRenderer = new BlockRenderer();
    this.inlineSuggestion = new InlineSuggestion(gemmaService, referenceManager);
    
    this.initializeEditor();
    this.setupEventListeners();
    this.setupSuggestionHandlers();
    
    // Initialize drag and drop after editor element is ready
    this.dragAndDrop = new DragAndDrop(this, this.editorElement);
    
    // Start with an empty paragraph
    this.addBlock('paragraph');
  }

  private initializeEditor(): void {
    this.editorElement = this.container.querySelector('#editor') as HTMLElement;
    if (!this.editorElement) {
      this.editorElement = document.createElement('div');
      this.editorElement.className = 'editor';
      this.editorElement.id = 'editor';
      this.container.appendChild(this.editorElement);
    }
  }

  private setupEventListeners(): void {
    this.editorElement.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.editorElement.addEventListener('input', this.handleInput.bind(this));
    this.editorElement.addEventListener('click', this.handleClick.bind(this));
    
    // Global drag and drop for images
    this.setupGlobalImageDragDrop();
  }

  private setupSuggestionHandlers(): void {
    // Listen for suggestion acceptance
    window.addEventListener('acceptSuggestion', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { blockId, newText } = customEvent.detail;
      this.updateBlock(blockId, { content: newText });
      
      // Focus the block and position cursor at the end
      setTimeout(() => {
        this.focusBlock(blockId, 'end');
      }, 10);
    });

    // Listen for image uploads
    window.addEventListener('imageUploaded', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { blockId } = customEvent.detail;
      
      // Re-render the block to show the uploaded image
      const block = this.getBlockById(blockId);
      if (block) {
        this.updateBlockElement(block);
      }
    });
  }

  private setupGlobalImageDragDrop(): void {
    // Prevent default drag behaviors on the entire editor
    this.editorElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if dragging files
      if (e.dataTransfer?.types.includes('Files')) {
        this.editorElement.classList.add('drag-over');
      }
    });

    this.editorElement.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only remove if leaving the editor entirely
      if (!this.editorElement.contains(e.relatedTarget as Node)) {
        this.editorElement.classList.remove('drag-over');
      }
    });

    this.editorElement.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.editorElement.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Filter for image files
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        alert('Please drop image files only.');
        return;
      }

      // Find the drop position
      const dropPosition = this.getDropPosition(e.clientY);
      
      // Create image blocks for each dropped image
      imageFiles.forEach((file, index) => {
        const insertIndex = dropPosition + index;
        const blockId = this.addBlock('image', '', insertIndex);
        
        // Read the file and update the block
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          this.updateBlock(blockId, {
            metadata: {
              src: result,
              alt: file.name,
              width: 600,
              file: file
            }
          });
        };
        reader.readAsDataURL(file);
      });
    });
  }

  private getDropPosition(clientY: number): number {
    const blocks = Array.from(this.editorElement.querySelectorAll('.block'));
    
    for (let i = 0; i < blocks.length; i++) {
      const blockElement = blocks[i] as HTMLElement;
      const rect = blockElement.getBoundingClientRect();
      const blockCenterY = rect.top + (rect.height / 2);
      
      if (clientY <= blockCenterY) {
        return i;
      }
    }
    
    // Drop at the end if no suitable position found
    return this.blocks.length;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const blockElement = target.closest('.block') as HTMLElement;
    
    if (!blockElement) return;
    
    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.handleEnterKey(blockId, event.shiftKey);
        break;
      case 'Backspace':
        this.handleBackspaceKey(blockId, target);
        break;
      case 'ArrowUp':
        this.handleArrowKey(blockId, 'up');
        break;
      case 'ArrowDown':
        this.handleArrowKey(blockId, 'down');
        break;
      case 'Tab':
        event.preventDefault();
        // Check if there's an active suggestion to accept
        if (this.inlineSuggestion.hasSuggestion()) {
          this.inlineSuggestion.acceptSuggestion();
        } else {
          this.handleTab(blockId, event.shiftKey);
        }
        break;
      case '/':
        // Trigger AI command palette
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.showAICommandPalette(blockId);
        }
        break;
      case 'Escape':
        // Clear any active suggestion
        if (this.inlineSuggestion.hasSuggestion()) {
          event.preventDefault();
          this.inlineSuggestion.clearSuggestion();
        }
        break;
    }
  }

  private handleInput(event: Event): void {
    const inputEvent = event as InputEvent;
    const target = event.target as HTMLElement;
    const blockElement = target.closest('.block') as HTMLElement;
    
    if (!blockElement) return;
    
    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = this.getBlockById(blockId);
    if (!block) return;

    // Update block content
    const newContent = target.textContent || '';
    block.content = newContent;
    
    // Clear suggestion if text changed significantly
    if (this.inlineSuggestion.hasSuggestion() && !this.inlineSuggestion.isSuggestionValid(newContent)) {
      this.inlineSuggestion.clearSuggestion();
    }

    // Handle markdown-like shortcuts
    this.handleMarkdownShortcuts(block, target);
    
    // Trigger inline suggestion for certain input types (but not spaces to avoid interruption)
    if (inputEvent.inputType === 'insertText' && inputEvent.data !== ' ' && newContent.length > 2) {
      const context = this.getDocumentContext();
      this.inlineSuggestion.requestSuggestion(blockId, blockElement, newContent, context);
    }
    
    // Update suggestion position if it exists
    if (this.inlineSuggestion.hasSuggestion()) {
      this.inlineSuggestion.updateSuggestionPosition(blockElement);
    }
    
    this.notifyChange();
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const blockElement = target.closest('.block') as HTMLElement;
    
    // Clear suggestions when clicking (user is repositioning cursor)
    this.inlineSuggestion.clearSuggestion();
    
    if (blockElement) {
      const blockId = blockElement.dataset.blockId;
      if (blockId) {
        this.setCurrentBlock(blockId);
      }
    }
  }

  private handleEnterKey(blockId: string, shiftKey: boolean): void {
    if (shiftKey) {
      // Shift+Enter: insert line break
      document.execCommand('insertLineBreak');
      return;
    }

    const block = this.getBlockById(blockId);
    if (!block) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const beforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
    const afterCursor = range.startContainer.textContent?.substring(range.startOffset) || '';

    // Update current block with content before cursor
    block.content = beforeCursor;
    this.updateBlockElement(block);

    // Find the index of the current block to insert after it
    const currentBlockIndex = this.blocks.findIndex(b => b.id === blockId);
    if (currentBlockIndex === -1) return;

    // Create new block with content after cursor, inserted right after current block
    const newBlockId = this.addBlock('paragraph', afterCursor, currentBlockIndex + 1);
    
    // Focus new block
    setTimeout(() => {
      this.focusBlock(newBlockId);
    }, 0);
  }

  private handleBackspaceKey(blockId: string, target: HTMLElement): void {
    const block = this.getBlockById(blockId);
    if (!block) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    // If cursor is at the beginning of the block and block is empty
    if (range.startOffset === 0 && (!block.content || block.content.trim() === '')) {
      const blockIndex = this.blocks.findIndex(b => b.id === blockId);
      
      if (blockIndex > 0) {
        // Remove current block and focus previous one
        this.removeBlock(blockId);
        const prevBlock = this.blocks[blockIndex - 1];
        if (prevBlock) {
          this.focusBlock(prevBlock.id, 'end');
        }
      }
    }
  }

  private handleArrowKey(blockId: string, direction: 'up' | 'down'): void {
    // Clear suggestions when navigating with arrows
    this.inlineSuggestion.clearSuggestion();
    
    const blockIndex = this.blocks.findIndex(b => b.id === blockId);
    
    if (direction === 'up' && blockIndex > 0) {
      this.focusBlock(this.blocks[blockIndex - 1].id, 'end');
    } else if (direction === 'down' && blockIndex < this.blocks.length - 1) {
      this.focusBlock(this.blocks[blockIndex + 1].id, 'start');
    }
  }

  private handleTab(blockId: string, shiftKey: boolean): void {
    // Handle indentation for lists
    const block = this.getBlockById(blockId);
    if (!block) return;

    if (block.type.includes('list')) {
      // Implement list indentation logic
      console.log('List indentation not yet implemented');
    }
  }

  private handleMarkdownShortcuts(block: Block, target: HTMLElement): void {
    const content = target.textContent || '';
    
    // Check for heading shortcuts
    const headingMatch = content.match(/^(#{1,6})\s(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      
      block.type = `heading-${level}` as BlockType;
      block.content = text;
      
      this.updateBlockElement(block);
      this.focusBlock(block.id, 'end');
      return;
    }

    // Check for quote shortcut
    if (content.startsWith('> ')) {
      block.type = 'quote';
      block.content = content.substring(2);
      
      this.updateBlockElement(block);
      this.focusBlock(block.id, 'end');
      return;
    }

    // Check for code block shortcut
    if (content.startsWith('``` ')) {
      block.type = 'code';
      block.content = content.substring(4);
      
      this.updateBlockElement(block);
      this.focusBlock(block.id, 'end');
      return;
    }

    // Check for horizontal rule
    if (content === '---' || content === '***') {
      block.type = 'horizontal-rule';
      block.content = '';
      
      this.updateBlockElement(block);
      
      // Add new paragraph after horizontal rule
      const newBlockId = this.addBlock('paragraph');
      this.focusBlock(newBlockId);
      return;
    }

    // Check for bullet list
    if (content.startsWith('- ') || content.startsWith('* ')) {
      block.type = 'bullet-list';
      block.content = content.substring(2);
      
      this.updateBlockElement(block);
      this.focusBlock(block.id, 'end');
      return;
    }

    // Check for numbered list
    const numberedMatch = content.match(/^(\d+)\.\s(.*)$/);
    if (numberedMatch) {
      block.type = 'numbered-list';
      block.content = numberedMatch[2];
      
      this.updateBlockElement(block);
      this.focusBlock(block.id, 'end');
      return;
    }

    // Check for checklist
    if (content.startsWith('- [ ] ') || content.startsWith('- [x] ')) {
      block.type = 'checklist';
      block.content = content.substring(6);
      block.metadata = { checked: content.includes('[x]') };
      
      this.updateBlockElement(block);
      this.focusBlock(block.id, 'end');
      return;
    }

    // Check for image shortcut
    if (content === '/image' || content === '/img') {
      block.type = 'image';
      block.content = '';
      block.metadata = {};
      
      this.updateBlockElement(block);
      return;
    }
  }


  public addBlock(type: BlockType, content: string = '', index?: number): string {
    const blockId = `block-${++this.blockIdCounter}`;
    const block = this.blockFactory.createBlock(blockId, type, content);
    
    if (index !== undefined) {
      this.blocks.splice(index, 0, block);
    } else {
      this.blocks.push(block);
    }
    
    this.renderBlock(block, index);
    this.notifyChange();
    
    return blockId;
  }

  public removeBlock(blockId: string): void {
    const index = this.blocks.findIndex(b => b.id === blockId);
    if (index !== -1) {
      this.blocks.splice(index, 1);
      
      const blockElement = this.editorElement.querySelector(`[data-block-id="${blockId}"]`);
      if (blockElement) {
        blockElement.remove();
      }
      
      this.notifyChange();
    }
  }

  public updateBlock(blockId: string, updates: Partial<Block>): void {
    const block = this.getBlockById(blockId);
    if (block) {
      Object.assign(block, updates);
      this.updateBlockElement(block);
      this.notifyChange();
    }
  }

  public moveBlock(blockId: string, newIndex: number): void {
    const currentIndex = this.blocks.findIndex(b => b.id === blockId);
    if (currentIndex !== -1 && newIndex >= 0 && newIndex < this.blocks.length) {
      const [block] = this.blocks.splice(currentIndex, 1);
      this.blocks.splice(newIndex, 0, block);
      
      this.rerenderEditor();
      this.notifyChange();
    }
  }

  private renderBlock(block: Block, index?: number): void {
    const blockElement = this.blockRenderer.render(block);
    
    if (index !== undefined && index < this.editorElement.children.length) {
      this.editorElement.insertBefore(blockElement, this.editorElement.children[index]);
    } else {
      this.editorElement.appendChild(blockElement);
    }
  }

  private updateBlockElement(block: Block): void {
    const blockElement = this.editorElement.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
    if (blockElement) {
      const newElement = this.blockRenderer.render(block);
      blockElement.replaceWith(newElement);
    }
  }

  private rerenderEditor(): void {
    this.editorElement.innerHTML = '';
    this.blocks.forEach(block => this.renderBlock(block));
  }

  private getBlockById(blockId: string): Block | undefined {
    return this.blocks.find(b => b.id === blockId);
  }

  private setCurrentBlock(blockId: string): void {
    this.currentBlockId = blockId;
  }

  private focusBlock(blockId: string, position: 'start' | 'end' = 'start'): void {
    const blockElement = this.editorElement.querySelector(`[data-block-id="${blockId}"] .block-content`) as HTMLElement;
    if (blockElement) {
      blockElement.focus();
      
      const selection = window.getSelection();
      const range = document.createRange();
      
      if (position === 'end') {
        range.selectNodeContents(blockElement);
        range.collapse(false);
      } else {
        range.setStart(blockElement, 0);
        range.collapse(true);
      }
      
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  private getDocumentContext(): string {
    return this.blocks.map(block => block.content).join('\n');
  }

  private getReferenceContext(instruction: string): string {
    // Extract keywords from instruction and document context
    const documentText = this.getDocumentContext();
    const allText = instruction + ' ' + documentText;
    const keywords = this.extractKeywords(allText);
    
    // Get relevant reference content
    return this.referenceManager.getRelevantContent(keywords, 2000);
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
    return [...new Set(words)].slice(0, 15);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 
      'were', 'said', 'each', 'which', 'their', 'time', 'about', 'there',
      'could', 'other', 'more', 'very', 'what', 'know', 'just', 'first',
      'into', 'over', 'think', 'also', 'your', 'work', 'life', 'only',
      'new', 'would', 'come', 'its', 'after', 'way', 'who', 'may',
      'say', 'great', 'where', 'much', 'should', 'well', 'large', 'use',
      'make', 'write', 'generate', 'create', 'please', 'help'
    ]);
    return stopWords.has(word);
  }

  private notifyChange(): void {
    // Notify other components about editor changes
    const event = new CustomEvent('editorChange', {
      detail: { blocks: this.blocks }
    });
    window.dispatchEvent(event);
  }

  public getState(): EditorState {
    return {
      blocks: [...this.blocks],
      currentBlockId: this.currentBlockId
    };
  }

  public loadContent(state: EditorState): void {
    this.blocks = [...state.blocks];
    this.currentBlockId = state.currentBlockId;
    this.blockIdCounter = Math.max(...this.blocks.map(b => parseInt(b.id.split('-')[1]) || 0));
    
    this.rerenderEditor();
  }

  public getBlocks(): Block[] {
    return [...this.blocks];
  }

  private showAutoCompletionNotification(message: string): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      animation: slideInRight 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 2000);
  }

  public async insertAIGeneratedContent(instruction: string, insertAtCurrentBlock: boolean = true): Promise<void> {
    try {
      const context = this.getDocumentContext();
      const referenceContext = this.getReferenceContext(instruction);
      let insertIndex = this.blocks.length;
      
      if (insertAtCurrentBlock && this.currentBlockId) {
        const currentIndex = this.blocks.findIndex(b => b.id === this.currentBlockId);
        insertIndex = currentIndex + 1;
      }

      // Show loading indicator
      const loadingBlockId = this.addBlock('paragraph', '🤖 Generating content...', insertIndex);
      
      // Generate content with reference context
      const generatedContent = await this.gemmaService.composeDocument(instruction, context, referenceContext);
      
      if (generatedContent && generatedContent.trim()) {
        // Remove loading block
        this.removeBlock(loadingBlockId);
        
        // Parse and insert the generated content as blocks
        this.insertGeneratedContentAsBlocks(generatedContent, insertIndex);
        
        this.showAutoCompletionNotification('AI content generated and inserted!');
      } else {
        // Remove loading block if no content generated
        this.removeBlock(loadingBlockId);
        this.showAutoCompletionNotification('No content generated');
      }
    } catch (error) {
      console.error('AI content generation failed:', error);
      this.showAutoCompletionNotification('AI generation failed');
    }
  }

  private insertGeneratedContentAsBlocks(content: string, startIndex: number): void {
    const lines = content.split('\n').filter(line => line.trim());
    let currentIndex = startIndex;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Determine block type based on content
      let blockType: BlockType = 'paragraph';
      let blockContent = trimmedLine;
      let metadata = {};
      
      // Check for headings
      const headingMatch = trimmedLine.match(/^(#{1,6})\s(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        blockType = `heading-${level}` as BlockType;
        blockContent = headingMatch[2];
        metadata = { level };
      }
      // Check for bullet lists
      else if (trimmedLine.startsWith('- ')) {
        blockType = 'bullet-list';
        blockContent = trimmedLine.substring(2);
        metadata = { level: 0 };
      }
      // Check for numbered lists
      else if (trimmedLine.match(/^\d+\.\s/)) {
        blockType = 'numbered-list';
        const match = trimmedLine.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          blockContent = match[2];
          metadata = { level: 0, number: parseInt(match[1]) };
        }
      }
      // Check for quotes
      else if (trimmedLine.startsWith('> ')) {
        blockType = 'quote';
        blockContent = trimmedLine.substring(2);
      }
      // Check for code blocks
      else if (trimmedLine.startsWith('```')) {
        blockType = 'code';
        blockContent = trimmedLine.substring(3).trim();
        metadata = { language: blockContent || 'text' };
        blockContent = ''; // Code content would be on next lines
      }

      this.addBlock(blockType, blockContent, currentIndex);
      currentIndex++;
    }
  }

  public async streamAIContentIntoEditor(instruction: string): Promise<void> {
    try {
      const context = this.getDocumentContext();
      const referenceContext = this.getReferenceContext(instruction);
      let insertIndex = this.blocks.length;
      
      if (this.currentBlockId) {
        const currentIndex = this.blocks.findIndex(b => b.id === this.currentBlockId);
        insertIndex = currentIndex + 1;
      }

      // Create a block for streaming content
      const streamingBlockId = this.addBlock('paragraph', '', insertIndex);
      let accumulatedContent = '';

      await this.gemmaService.streamComposeDocument(
        instruction,
        (chunk: string) => {
          accumulatedContent += chunk;
          this.updateBlock(streamingBlockId, { content: accumulatedContent });
          
          // Auto-scroll to the streaming block
          const blockElement = this.editorElement.querySelector(`[data-block-id="${streamingBlockId}"]`);
          if (blockElement && typeof blockElement.scrollIntoView === 'function') {
            blockElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        },
        context,
        referenceContext
      );

      // After streaming is complete, parse content into proper blocks
      if (accumulatedContent.trim()) {
        this.removeBlock(streamingBlockId);
        this.insertGeneratedContentAsBlocks(accumulatedContent, insertIndex);
        this.showAutoCompletionNotification('AI content streamed successfully!');
      }
    } catch (error) {
      console.error('Streaming AI content failed:', error);
      this.showAutoCompletionNotification('Streaming failed');
    }
  }

  private showAICommandPalette(blockId: string): void {
    const palette = document.createElement('div');
    palette.className = 'ai-command-palette';
    palette.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 20px;
      width: 400px;
      z-index: 1001;
    `;

    const title = document.createElement('h3');
    title.textContent = '🤖 AI Assistant';
    title.style.cssText = 'margin: 0 0 15px 0; color: #333;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'What would you like me to write? (e.g., "Write a paragraph about...")';
    input.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      outline: none;
      margin-bottom: 15px;
    `;

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate';
    generateButton.style.cssText = `
      background: #2196f3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      background: #666;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;

    // Event handlers
    const handleGenerate = async () => {
      const instruction = input.value.trim();
      if (!instruction) return;
      
      document.body.removeChild(palette);
      await this.streamAIContentIntoEditor(instruction);
    };

    const handleCancel = () => {
      document.body.removeChild(palette);
      this.focusBlock(blockId);
    };

    generateButton.addEventListener('click', handleGenerate);
    cancelButton.addEventListener('click', handleCancel);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });

    buttonsContainer.appendChild(cancelButton);
    buttonsContainer.appendChild(generateButton);
    
    palette.appendChild(title);
    palette.appendChild(input);
    palette.appendChild(buttonsContainer);
    
    document.body.appendChild(palette);
    input.focus();
  }

  public destroy(): void {
    // Clean up inline suggestions
    this.inlineSuggestion.destroy();
    
    // Clean up drag and drop
    this.dragAndDrop.destroy();
    
    // Note: In a real implementation, we'd store the handler reference to properly remove it
    // For now, this is just a placeholder for cleanup
  }
}