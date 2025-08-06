import { Block, BlockType } from './types';
export declare class BlockFactory {
    createBlock(id: string, type: BlockType, content?: string, metadata?: Record<string, any>): Block;
    private getDefaultMetadata;
    static isTextBlock(type: BlockType): boolean;
    static isListBlock(type: BlockType): boolean;
    static isHeadingBlock(type: BlockType): boolean;
    static getHeadingLevel(type: BlockType): number;
}
