/**
 * @group general
 */
import { BlockFactory } from './BlockFactory';
import { BlockRenderer } from './BlockRenderer';
import { Block } from './types';

describe('Image Block Functionality', () => {
  let blockFactory: BlockFactory;
  let blockRenderer: BlockRenderer;

  beforeEach(() => {
    blockFactory = new BlockFactory();
    blockRenderer = new BlockRenderer();
  });

  describe('BlockFactory - Image Block Creation', () => {
    test('should create empty image block with default metadata', () => {
      const block = blockFactory.createBlock('img-1', 'image');
      
      expect(block.type).toBe('image');
      expect(block.content).toBe('');
      expect(block.metadata).toEqual({
        src: '',
        alt: '',
        width: 600,
        caption: ''
      });
      expect(block.id).toBe('img-1');
      expect(block.createdAt).toBeInstanceOf(Date);
      expect(block.updatedAt).toBeInstanceOf(Date);
    });

    test('should create image block with custom metadata', () => {
      const customMetadata = {
        src: 'data:image/png;base64,test',
        alt: 'Test image',
        width: 800,
        caption: 'Test caption'
      };

      const block = blockFactory.createBlock('img-2', 'image', '', customMetadata);

      expect(block.metadata).toEqual({
        src: 'data:image/png;base64,test',
        alt: 'Test image',
        width: 800,
        caption: 'Test caption'
      });
    });

    test('should merge custom metadata with defaults', () => {
      const customMetadata = {
        src: 'data:image/jpg;base64,test',
        alt: 'Test image'
        // width and caption should use defaults
      };

      const block = blockFactory.createBlock('img-3', 'image', '', customMetadata);

      expect(block.metadata).toEqual({
        src: 'data:image/jpg;base64,test',
        alt: 'Test image',
        width: 600, // default
        caption: ''  // default
      });
    });
  });

  describe('BlockRenderer - Image Block Rendering', () => {
    test('should render empty image block with upload area', () => {
      const block: Block = {
        id: 'img-1',
        type: 'image',
        content: '',
        metadata: { src: '', alt: '', width: 600, caption: '' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const element = blockRenderer.render(block);

      expect(element.className).toBe('block');
      expect(element.dataset.blockId).toBe('img-1');
      expect(element.dataset.blockType).toBe('image');

      // Should contain upload area
      const uploadArea = element.querySelector('.image-upload-area');
      expect(uploadArea).toBeTruthy();
      expect(uploadArea?.textContent).toContain('Click to upload or drag an image here');

      // Should contain file input
      const fileInput = element.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput?.getAttribute('accept')).toBe('image/*');
    });

    test('should render image block with uploaded image', () => {
      const block: Block = {
        id: 'img-2',
        type: 'image',
        content: '',
        metadata: { 
          src: 'data:image/png;base64,test123',
          alt: 'Test image',
          width: 500,
          caption: 'My test caption'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const element = blockRenderer.render(block);

      // Should contain actual image
      const img = element.querySelector('.block-image') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img.src).toBe('data:image/png;base64,test123');
      expect(img.alt).toBe('Test image');
      expect(img.style.width).toBe('500px');

      // Should contain caption
      const caption = element.querySelector('.image-caption');
      expect(caption).toBeTruthy();
      expect(caption?.textContent).toBe('My test caption');

      // Should contain resize handle
      const resizeHandle = element.querySelector('.image-resize-handle');
      expect(resizeHandle).toBeTruthy();
    });

    test('should render block type indicator correctly', () => {
      const block: Block = {
        id: 'img-1',
        type: 'image',
        content: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const element = blockRenderer.render(block);
      const typeIndicator = element.querySelector('.block-type-indicator');
      
      expect(typeIndicator?.textContent).toBe('IMG');
    });

    test('should include drag handle and menu', () => {
      const block: Block = {
        id: 'img-1',
        type: 'image',
        content: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const element = blockRenderer.render(block);

      // Should have drag handle
      const dragHandle = element.querySelector('.block-handle');
      expect(dragHandle).toBeTruthy();
      expect(dragHandle?.innerHTML).toBe('⋮⋮');

      // Should have block menu
      const blockMenu = element.querySelector('.block-menu');
      expect(blockMenu).toBeTruthy();

      // Should have add button
      const addButton = element.querySelector('.add-button');
      expect(addButton).toBeTruthy();
    });

    test('should include drag indicators', () => {
      const block: Block = {
        id: 'img-1',
        type: 'image',
        content: '',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const element = blockRenderer.render(block);

      const topIndicator = element.querySelector('.drag-indicator.top');
      const bottomIndicator = element.querySelector('.drag-indicator.bottom');

      expect(topIndicator).toBeTruthy();
      expect(bottomIndicator).toBeTruthy();
    });
  });

  describe('Image Metadata Handling', () => {
    test('should handle missing metadata gracefully', () => {
      const block: Block = {
        id: 'img-1',
        type: 'image',
        content: '',
        metadata: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const element = blockRenderer.render(block);
      expect(element).toBeTruthy();
      
      // Should show upload area when no metadata
      const uploadArea = element.querySelector('.image-upload-area');
      expect(uploadArea).toBeTruthy();
    });

    test('should handle empty src gracefully', () => {
      const block: Block = {
        id: 'img-1',
        type: 'image',
        content: '',
        metadata: { src: '', alt: 'test', width: 600 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const element = blockRenderer.render(block);
      
      // Should show upload area when src is empty
      const uploadArea = element.querySelector('.image-upload-area');
      expect(uploadArea).toBeTruthy();
    });

    test('should use default width when not specified', () => {
      const block: Block = {
        id: 'img-1',
        type: 'image',
        content: '',
        metadata: { 
          src: 'data:image/png;base64,test',
          alt: 'test'
          // width not specified
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const element = blockRenderer.render(block);
      const img = element.querySelector('.block-image') as HTMLImageElement;
      
      // Should not have explicit width style (will use natural sizing)
      expect(img.style.width).toBe('');
    });
  });

  describe('Image Block Utilities', () => {
    test('should identify image blocks correctly', () => {
      const imageBlock = blockFactory.createBlock('img-1', 'image');
      const textBlock = blockFactory.createBlock('text-1', 'paragraph');
      const headingBlock = blockFactory.createBlock('h1-1', 'heading-1');

      // Image block should not be identified as text block
      expect(BlockFactory.isTextBlock('image')).toBe(false);
      
      // Should not be a list block
      expect(BlockFactory.isListBlock('image')).toBe(false);
      
      // Should not be a heading block
      expect(BlockFactory.isHeadingBlock('image')).toBe(false);
    });
  });
});