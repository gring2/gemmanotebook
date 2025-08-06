import { Editor } from './Editor';

export class DragAndDrop {
  private editor: Editor;
  private draggedElement: HTMLElement | null = null;
  private draggedBlockId: string | null = null;
  private isDragging = false;
  private startY = 0;
  private startX = 0;
  private editorElement: HTMLElement;

  constructor(editor: Editor, editorElement: HTMLElement) {
    this.editor = editor;
    this.editorElement = editorElement;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Use event delegation for better performance
    this.editorElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Check if clicked on drag handle
    if (!target.closest('.block-handle')) {
      return;
    }

    const blockElement = target.closest('.block') as HTMLElement;
    if (!blockElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.draggedElement = blockElement;
    this.draggedBlockId = blockElement.dataset.blockId || null;
    this.startY = event.clientY;
    this.startX = event.clientX;
    
    // Add dragging class after a small delay to ensure it's a drag, not just a click
    setTimeout(() => {
      if (this.draggedElement && this.isDragging) {
        this.draggedElement.classList.add('dragging');
      }
    }, 100);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.draggedElement || !this.draggedBlockId) {
      return;
    }

    const deltaY = Math.abs(event.clientY - this.startY);
    const deltaX = Math.abs(event.clientX - this.startX);
    
    // Start dragging if moved enough
    if (!this.isDragging && (deltaY > 5 || deltaX > 5)) {
      this.isDragging = true;
      this.draggedElement.classList.add('dragging');
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    if (!this.isDragging) {
      return;
    }

    // Find the block we're hovering over
    const hoveredElement = this.getBlockElementUnderCursor(event.clientX, event.clientY);
    
    // Clear all drag-over classes
    this.clearDragOverClasses();
    
    if (hoveredElement && hoveredElement !== this.draggedElement) {
      const rect = hoveredElement.getBoundingClientRect();
      const midPoint = rect.top + (rect.height / 2);
      
      if (event.clientY < midPoint) {
        hoveredElement.classList.add('drag-over-top');
      } else {
        hoveredElement.classList.add('drag-over-bottom');
      }
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isDragging || !this.draggedElement || !this.draggedBlockId) {
      this.cleanup();
      return;
    }

    // Find the target position
    const targetElement = this.getBlockElementUnderCursor(event.clientX, event.clientY);
    
    if (targetElement && targetElement !== this.draggedElement) {
      const targetBlockId = targetElement.dataset.blockId;
      if (targetBlockId) {
        const rect = targetElement.getBoundingClientRect();
        const midPoint = rect.top + (rect.height / 2);
        const insertAbove = event.clientY < midPoint;
        
        this.moveBlock(this.draggedBlockId, targetBlockId, insertAbove);
      }
    }

    this.cleanup();
  }

  private getBlockElementUnderCursor(x: number, y: number): HTMLElement | null {
    // Temporarily hide the dragged element to get the element underneath
    const originalDisplay = this.draggedElement?.style.display;
    if (this.draggedElement) {
      this.draggedElement.style.display = 'none';
    }
    
    const elementUnder = document.elementFromPoint(x, y);
    const blockElement = elementUnder?.closest('.block') as HTMLElement;
    
    // Restore the dragged element
    if (this.draggedElement && originalDisplay !== undefined) {
      this.draggedElement.style.display = originalDisplay;
    }
    
    return blockElement;
  }

  private clearDragOverClasses(): void {
    const blocks = this.editorElement.querySelectorAll('.block');
    blocks.forEach(block => {
      block.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  }

  private moveBlock(draggedBlockId: string, targetBlockId: string, insertAbove: boolean): void {
    // Get the current indices
    const blocks = this.editor.getBlocks();
    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);
    
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return;
    }

    // Calculate new position
    let newIndex = targetIndex;
    if (!insertAbove) {
      newIndex = targetIndex + 1;
    }
    
    // Adjust for removal of dragged element
    if (draggedIndex < newIndex) {
      newIndex--;
    }

    // Use the editor's move method
    this.editor.moveBlock(draggedBlockId, newIndex);
  }

  private cleanup(): void {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
    }
    
    this.clearDragOverClasses();
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    this.draggedElement = null;
    this.draggedBlockId = null;
    this.isDragging = false;
  }

  public destroy(): void {
    // Remove event listeners if needed
    // In a real implementation, we'd store references to bound functions
    this.cleanup();
  }
}