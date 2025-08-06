import { Block, BlockType } from './types';

export class BlockFactory {
  createBlock(
    id: string, 
    type: BlockType, 
    content: string = '', 
    metadata: Record<string, any> = {}
  ): Block {
    const now = new Date();
    
    return {
      id,
      type,
      content,
      metadata: this.getDefaultMetadata(type, metadata),
      createdAt: now,
      updatedAt: now
    };
  }

  private getDefaultMetadata(type: BlockType, metadata: Record<string, any>): Record<string, any> {
    const defaults: Record<BlockType, Record<string, any>> = {
      'paragraph': {},
      'heading-1': { level: 1 },
      'heading-2': { level: 2 },
      'heading-3': { level: 3 },
      'heading-4': { level: 4 },
      'heading-5': { level: 5 },
      'heading-6': { level: 6 },
      'quote': {},
      'code': { language: 'text' },
      'bullet-list': { level: 0 },
      'numbered-list': { level: 0, number: 1 },
      'checklist': { checked: false, level: 0 },
      'horizontal-rule': {},
      'image': { src: '', alt: '', width: 600, caption: '' }
    };

    return { ...defaults[type], ...metadata };
  }

  static isTextBlock(type: BlockType): boolean {
    return [
      'paragraph',
      'heading-1',
      'heading-2', 
      'heading-3',
      'heading-4',
      'heading-5',
      'heading-6',
      'quote',
      'code'
    ].includes(type);
  }

  static isListBlock(type: BlockType): boolean {
    return ['bullet-list', 'numbered-list', 'checklist'].includes(type);
  }

  static isHeadingBlock(type: BlockType): boolean {
    return type.startsWith('heading-');
  }

  static getHeadingLevel(type: BlockType): number {
    if (!this.isHeadingBlock(type)) return 0;
    return parseInt(type.split('-')[1]) || 1;
  }
}