import { Block, BlockType } from './types';

export class BlockRenderer {
  render(block: Block): HTMLElement {
    const blockElement = document.createElement('div');
    blockElement.className = 'block';
    blockElement.dataset.blockId = block.id;
    blockElement.dataset.blockType = block.type;
    blockElement.draggable = false; // We'll handle drag manually

    // Add drag indicators
    const topIndicator = document.createElement('div');
    topIndicator.className = 'drag-indicator top';
    blockElement.appendChild(topIndicator);

    const bottomIndicator = document.createElement('div');
    bottomIndicator.className = 'drag-indicator bottom';
    blockElement.appendChild(bottomIndicator);

    // Add block menu
    const menu = this.createBlockMenu(block);
    blockElement.appendChild(menu);

    // Add block type indicator
    const typeIndicator = document.createElement('div');
    typeIndicator.className = 'block-type-indicator';
    typeIndicator.textContent = this.getBlockTypeLabel(block.type);
    blockElement.appendChild(typeIndicator);

    // Add drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'block-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.title = 'Click and drag to move';
    blockElement.appendChild(dragHandle);

    // Create content element based on block type
    const contentElement = this.createContentElement(block);
    blockElement.appendChild(contentElement);

    return blockElement;
  }

  private createBlockMenu(block: Block): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'block-menu';

    const addButton = document.createElement('button');
    addButton.className = 'menu-button add-button';
    addButton.innerHTML = '+';
    addButton.title = 'Add block below';
    menu.appendChild(addButton);

    return menu;
  }

  private createContentElement(block: Block): HTMLElement {
    switch (block.type) {
      case 'paragraph':
        return this.createParagraphElement(block);
      
      case 'heading-1':
      case 'heading-2':
      case 'heading-3':
      case 'heading-4':
      case 'heading-5':
      case 'heading-6':
        return this.createHeadingElement(block);
      
      case 'quote':
        return this.createQuoteElement(block);
      
      case 'code':
        return this.createCodeElement(block);
      
      case 'bullet-list':
        return this.createBulletListElement(block);
      
      case 'numbered-list':
        return this.createNumberedListElement(block);
      
      case 'checklist':
        return this.createChecklistElement(block);
      
      case 'horizontal-rule':
        return this.createHorizontalRuleElement(block);
      
      case 'image':
        return this.createImageElement(block);
      
      default:
        return this.createParagraphElement(block);
    }
  }

  private createParagraphElement(block: Block): HTMLElement {
    const element = document.createElement('div');
    element.className = 'block-content';
    element.contentEditable = 'true';
    element.textContent = block.content;
    element.setAttribute('data-placeholder', 'Type \'/\' for commands, or just start writing...');
    return element;
  }

  private createHeadingElement(block: Block): HTMLElement {
    const level = parseInt(block.type.split('-')[1]) || 1;
    const element = document.createElement(`h${level}`);
    element.className = `block-content heading-${level}`;
    element.contentEditable = 'true';
    element.textContent = block.content;
    element.setAttribute('data-placeholder', `Heading ${level}`);
    return element;
  }

  private createQuoteElement(block: Block): HTMLElement {
    const element = document.createElement('blockquote');
    element.className = 'block-content quote';
    element.contentEditable = 'true';
    element.textContent = block.content;
    element.setAttribute('data-placeholder', 'Empty quote');
    return element;
  }

  private createCodeElement(block: Block): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    const languageSelect = document.createElement('select');
    languageSelect.className = 'language-select';
    languageSelect.style.cssText = 'margin-bottom: 8px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;';
    
    const languages = ['text', 'javascript', 'typescript', 'python', 'java', 'html', 'css', 'json', 'markdown'];
    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = lang;
      option.selected = lang === (block.metadata?.language || 'text');
      languageSelect.appendChild(option);
    });

    const codeElement = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'block-content';
    code.contentEditable = 'true';
    code.textContent = block.content;
    code.style.cssText = 'outline: none; background: transparent;';
    code.setAttribute('data-placeholder', 'Enter code...');
    
    codeElement.appendChild(code);
    wrapper.appendChild(languageSelect);
    wrapper.appendChild(codeElement);

    // Update language metadata when changed
    languageSelect.addEventListener('change', () => {
      block.metadata = { ...block.metadata, language: languageSelect.value };
    });

    return wrapper;
  }

  private createBulletListElement(block: Block): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'list-item';
    
    const marker = document.createElement('span');
    marker.className = 'list-marker';
    marker.textContent = '•';
    
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.textContent = block.content;
    
    wrapper.appendChild(marker);
    wrapper.appendChild(content);
    
    return wrapper;
  }

  private createNumberedListElement(block: Block): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'list-item';
    
    const marker = document.createElement('span');
    marker.className = 'list-marker';
    marker.textContent = `${block.metadata?.number || 1}.`;
    
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.textContent = block.content;
    
    wrapper.appendChild(marker);
    wrapper.appendChild(content);
    
    return wrapper;
  }

  private createChecklistElement(block: Block): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'list-item checklist-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = block.metadata?.checked || false;
    
    const content = document.createElement('div');
    content.className = 'block-content';
    content.contentEditable = 'true';
    content.textContent = block.content;
    
    // Update checked state
    checkbox.addEventListener('change', () => {
      block.metadata = { ...block.metadata, checked: checkbox.checked };
      if (checkbox.checked) {
        content.style.textDecoration = 'line-through';
        content.style.color = '#888';
      } else {
        content.style.textDecoration = 'none';
        content.style.color = 'inherit';
      }
    });
    
    // Apply initial style
    if (checkbox.checked) {
      content.style.textDecoration = 'line-through';
      content.style.color = '#888';
    }
    
    wrapper.appendChild(checkbox);
    wrapper.appendChild(content);
    
    return wrapper;
  }

  private createHorizontalRuleElement(block: Block): HTMLElement {
    const hr = document.createElement('hr');
    hr.className = 'horizontal-rule';
    return hr;
  }

  private createImageElement(block: Block): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-block';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    if (block.metadata?.src) {
      // Display existing image
      const img = document.createElement('img');
      img.src = block.metadata.src;
      img.alt = block.metadata.alt || '';
      img.className = 'block-image';
      img.draggable = false;
      
      if (block.metadata.width) {
        img.style.width = `${block.metadata.width}px`;
      }
      
      imageContainer.appendChild(img);

      // Add resize handles
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'image-resize-handle';
      resizeHandle.innerHTML = '↘';
      imageContainer.appendChild(resizeHandle);

      // Add caption
      const caption = document.createElement('div');
      caption.className = 'image-caption block-content';
      caption.contentEditable = 'true';
      caption.textContent = block.metadata.caption || '';
      caption.setAttribute('data-placeholder', 'Add a caption...');
      wrapper.appendChild(imageContainer);
      wrapper.appendChild(caption);

      // Setup resize functionality
      this.setupImageResize(img, resizeHandle, block);
    } else {
      // Show upload area
      const uploadArea = document.createElement('div');
      uploadArea.className = 'image-upload-area';
      uploadArea.innerHTML = `
        <div class="upload-placeholder">
          <div class="upload-icon">📁</div>
          <div class="upload-text">Click to upload or drag an image here</div>
          <div class="upload-formats">Supports JPG, PNG, GIF, WebP</div>
        </div>
      `;

      // Add file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      
      uploadArea.appendChild(fileInput);
      imageContainer.appendChild(uploadArea);
      wrapper.appendChild(imageContainer);

      // Setup upload functionality
      this.setupImageUpload(uploadArea, fileInput, block);
    }

    return wrapper;
  }

  private getBlockTypeLabel(type: BlockType): string {
    switch (type) {
      case 'paragraph': return '';
      case 'heading-1': return 'H1';
      case 'heading-2': return 'H2';
      case 'heading-3': return 'H3';
      case 'heading-4': return 'H4';
      case 'heading-5': return 'H5';
      case 'heading-6': return 'H6';
      case 'quote': return 'QUOTE';
      case 'code': return 'CODE';
      case 'bullet-list': return 'LIST';
      case 'numbered-list': return 'NUM';
      case 'checklist': return 'TODO';
      case 'horizontal-rule': return 'HR';
      case 'image': return 'IMG';
      default: return '';
    }
  }

  private setupImageUpload(uploadArea: HTMLElement, fileInput: HTMLInputElement, block: Block): void {
    const handleFile = (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        // Update block metadata with image data
        block.metadata = {
          ...block.metadata,
          src: result,
          alt: file.name,
          width: 600, // Default width
          file: file
        };

        // Trigger a re-render by dispatching an event
        const event = new CustomEvent('imageUploaded', {
          detail: { blockId: block.id, imageData: result }
        });
        window.dispatchEvent(event);
      };
      
      reader.readAsDataURL(file);
    };

    // Click to upload
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFile(file);
      }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    });
  }

  private setupImageResize(img: HTMLImageElement, resizeHandle: HTMLElement, block: Block): void {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startWidth = img.offsetWidth;
      
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const newWidth = Math.max(100, Math.min(800, startWidth + deltaX));
      
      img.style.width = `${newWidth}px`;
      
      // Update block metadata
      if (block.metadata) {
        block.metadata.width = newWidth;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  static applyTextFormatting(element: HTMLElement, content: string): void {
    // Apply inline formatting like **bold**, *italic*, ~~strikethrough~~, `code`
    let formattedContent = content;
    
    // Bold formatting
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic formatting
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Strikethrough formatting
    formattedContent = formattedContent.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // Inline code formatting
    formattedContent = formattedContent.replace(/`(.*?)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
    
    // Link formatting
    formattedContent = formattedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    if (formattedContent !== content) {
      element.innerHTML = formattedContent;
    }
  }
}