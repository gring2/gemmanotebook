export type BlockType = 
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
  | 'quote'
  | 'code'
  | 'bullet-list'
  | 'numbered-list'
  | 'checklist'
  | 'horizontal-rule';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorState {
  blocks: Block[];
  currentBlockId: string | null;
}

export interface BlockFactory {
  createBlock(id: string, type: BlockType, content?: string, metadata?: Record<string, any>): Block;
}

export interface BlockRenderer {
  render(block: Block): HTMLElement;
}

export interface AutoCompletionSuggestion {
  text: string;
  confidence: number;
  type: 'completion' | 'suggestion';
}

export interface FormattingRange {
  start: number;
  end: number;
  type: 'bold' | 'italic' | 'strikethrough' | 'code' | 'link';
  metadata?: Record<string, any>;
}

export interface ListItemMetadata {
  level: number;
  checked?: boolean;
  number?: number;
}