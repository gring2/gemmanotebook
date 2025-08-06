import { Block } from './types';
export declare class BlockRenderer {
    render(block: Block): HTMLElement;
    private createBlockMenu;
    private createContentElement;
    private createParagraphElement;
    private createHeadingElement;
    private createQuoteElement;
    private createCodeElement;
    private createBulletListElement;
    private createNumberedListElement;
    private createChecklistElement;
    private createHorizontalRuleElement;
    private createImageElement;
    private getBlockTypeLabel;
    private setupImageUpload;
    private setupImageResize;
    static applyTextFormatting(element: HTMLElement, content: string): void;
}
