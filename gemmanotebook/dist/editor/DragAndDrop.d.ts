import { Editor } from './Editor';
export declare class DragAndDrop {
    private editor;
    private draggedElement;
    private draggedBlockId;
    private isDragging;
    private startY;
    private startX;
    private editorElement;
    constructor(editor: Editor, editorElement: HTMLElement);
    private setupEventListeners;
    private handleMouseDown;
    private handleMouseMove;
    private handleMouseUp;
    private getBlockElementUnderCursor;
    private clearDragOverClasses;
    private moveBlock;
    private cleanup;
    destroy(): void;
}
