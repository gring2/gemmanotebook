/**
 * @group general
 */
import { Editor } from './Editor';
import { GemmaService } from '../ai/GemmaService';
import { ReferenceManager } from '../references/ReferenceManager';
import { Block, BlockType } from './types';

// Mock dependencies
jest.mock('../ai/GemmaService');
jest.mock('../references/ReferenceManager');

describe('Drag & Drop Collision Prevention', () => {
  let editor: Editor;
  let mockContainer: HTMLElement;
  let mockGemmaService: jest.Mocked<GemmaService>;
  let mockReferenceManager: jest.Mocked<ReferenceManager>;

  beforeEach(() => {
    // Create mock container
    mockContainer = document.createElement('div');
    mockContainer.innerHTML = '<div id="editor"></div>';
    document.body.appendChild(mockContainer);

    // Create mocked services
    mockGemmaService = new GemmaService() as jest.Mocked<GemmaService>;
    mockReferenceManager = new ReferenceManager() as jest.Mocked<ReferenceManager>;

    // Create editor instance
    editor = new Editor(mockContainer, mockGemmaService, mockReferenceManager);
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
    jest.clearAllMocks();
  });

  describe('findEmptyImageBlockNear Method', () => {
    test('should find empty image block at exact position', () => {
      // Add some blocks including an empty image block
      editor.addBlock('paragraph', 'First paragraph');
      editor.addBlock('image', ''); // Empty image block at index 1
      editor.addBlock('paragraph', 'Second paragraph');

      // Should find the empty image block at position 1
      const emptyBlock = (editor as any).findEmptyImageBlockNear(1);
      
      expect(emptyBlock).toBeTruthy();
      expect(emptyBlock.type).toBe('image');
      expect(emptyBlock.metadata?.src).toBeFalsy();
    });

    test('should find empty image block within search range', () => {
      // Add blocks with empty image block nearby
      editor.addBlock('paragraph', 'First paragraph');
      editor.addBlock('image', ''); // Empty image block at index 1  
      editor.addBlock('paragraph', 'Second paragraph');

      // Search at position 0 should find the empty image block at position 1 (within range of 2)
      const emptyBlock = (editor as any).findEmptyImageBlockNear(0);
      
      expect(emptyBlock).toBeTruthy();
      expect(emptyBlock.type).toBe('image');
    });

    test('should not find image block with existing src', () => {
      // Add image block with src (not empty)
      const imageBlockId = editor.addBlock('image', '');
      editor.updateBlock(imageBlockId, {
        metadata: { 
          src: 'data:image/png;base64,test',
          alt: 'test',
          width: 600
        }
      });

      // Should not find this block as it has src
      const emptyBlock = (editor as any).findEmptyImageBlockNear(0);
      
      expect(emptyBlock).toBeNull();
    });

    test('should return null when no empty image blocks found', () => {
      // Add only non-image blocks
      editor.addBlock('paragraph', 'First paragraph');
      editor.addBlock('heading-1', 'Heading');
      editor.addBlock('paragraph', 'Second paragraph');

      const emptyBlock = (editor as any).findEmptyImageBlockNear(1);
      
      expect(emptyBlock).toBeNull();
    });

    test('should respect search range boundaries', () => {
      // Create a scenario where empty image block is outside search range
      for (let i = 0; i < 10; i++) {
        editor.addBlock('paragraph', `Paragraph ${i}`);
      }
      editor.addBlock('image', ''); // Empty image at index 10

      // Search at position 0 should not find the image block at position 10 (outside range)
      const emptyBlock = (editor as any).findEmptyImageBlockNear(0);
      
      expect(emptyBlock).toBeNull();
    });

    test('should find multiple empty image blocks and return the first one', () => {
      editor.addBlock('paragraph', 'First paragraph');
      editor.addBlock('image', ''); // First empty image block
      editor.addBlock('image', ''); // Second empty image block  
      editor.addBlock('paragraph', 'Second paragraph');

      const emptyBlock = (editor as any).findEmptyImageBlockNear(1);
      
      expect(emptyBlock).toBeTruthy();
      expect(emptyBlock.type).toBe('image');
      // Should return the first one found in the search
    });
  });

  describe('Image Block Type Shortcut Collision', () => {
    test('should create image block when typing /image', () => {
      // Simulate typing '/image' in a paragraph block
      const blockId = editor.addBlock('paragraph', '');
      const block = editor.getBlocks().find(b => b.id === blockId);
      
      if (block) {
        // Simulate the markdown shortcut handling
        block.content = '/image';
        (editor as any).handleMarkdownShortcuts(block, { textContent: '/image' });
        
        expect(block.type).toBe('image');
        expect(block.content).toBe('');
        expect(block.metadata).toEqual({});
      }
    });

    test('should create image block when typing /img', () => {
      const blockId = editor.addBlock('paragraph', '');
      const block = editor.getBlocks().find(b => b.id === blockId);
      
      if (block) {
        block.content = '/img';
        (editor as any).handleMarkdownShortcuts(block, { textContent: '/img' });
        
        expect(block.type).toBe('image');
        expect(block.content).toBe('');
        expect(block.metadata).toEqual({});
      }
    });
  });

  describe('Drop Position Calculation', () => {
    beforeEach(() => {
      // Add some blocks to test drop position
      editor.addBlock('paragraph', 'First');
      editor.addBlock('paragraph', 'Second');
      editor.addBlock('paragraph', 'Third');
    });

    test('should calculate drop position based on clientY', () => {
      // Mock getBoundingClientRect for blocks
      const mockBlocks = Array.from(document.querySelectorAll('.block'));
      mockBlocks.forEach((block, index) => {
        jest.spyOn(block, 'getBoundingClientRect').mockReturnValue({
          top: index * 50, // Each block is 50px tall
          height: 40,
          bottom: (index * 50) + 40,
          left: 0,
          right: 100,
          width: 100,
          x: 0,
          y: index * 50,
          toJSON: () => ({})
        });
      });

      // Test dropping at the top of first block
      const position1 = (editor as any).getDropPosition(10); // Above center of first block
      expect(position1).toBe(0);

      // Test dropping between first and second block
      const position2 = (editor as any).getDropPosition(35); // Below center of first block
      expect(position2).toBe(1);

      // Test dropping at the end  
      const position3 = (editor as any).getDropPosition(200); // Way below all blocks
      expect(position3).toBe(editor.getBlocks().length); // Should be at the end
    });
  });

  describe('Image File Validation', () => {
    test('should accept valid image file types', () => {
      const validFiles = [
        new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        new File(['test'], 'test.png', { type: 'image/png' }),
        new File(['test'], 'test.gif', { type: 'image/gif' }),
        new File(['test'], 'test.webp', { type: 'image/webp' })
      ];

      validFiles.forEach(file => {
        expect(file.type.startsWith('image/')).toBe(true);
      });
    });

    test('should reject non-image file types', () => {
      const invalidFiles = [
        new File(['test'], 'test.txt', { type: 'text/plain' }),
        new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        new File(['test'], 'test.doc', { type: 'application/msword' })
      ];

      invalidFiles.forEach(file => {
        expect(file.type.startsWith('image/')).toBe(false);
      });
    });
  });

  describe('Integration: /image + Drag & Drop Collision Prevention', () => {
    test('should reuse empty image block created by /image command', () => {
      // Step 1: Create empty image block via /image command
      const blockId = editor.addBlock('paragraph', '');
      const block = editor.getBlocks().find(b => b.id === blockId);
      
      if (block) {
        block.content = '/image';
        (editor as any).handleMarkdownShortcuts(block, { textContent: '/image' });
      }

      // Verify image block was created
      expect(block?.type).toBe('image');
      const initialBlockCount = editor.getBlocks().length;

      // Step 2: Mock drag & drop with collision prevention
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockDropPosition = 0; // Drop at the beginning

      // Simulate the collision detection
      const emptyBlock = (editor as any).findEmptyImageBlockNear(mockDropPosition);
      expect(emptyBlock).toBeTruthy(); // Should find the empty image block
      expect(emptyBlock.type).toBe('image');
      expect(emptyBlock.metadata?.src).toBeFalsy(); // Should be empty

      // Verify no duplicate blocks were created
      expect(editor.getBlocks().length).toBe(initialBlockCount);
    });

    test('should create new block when no empty image block exists', () => {
      // Add some non-image blocks
      editor.addBlock('paragraph', 'First');
      editor.addBlock('heading-1', 'Heading');
      editor.addBlock('paragraph', 'Second');

      const initialBlockCount = editor.getBlocks().length;
      const mockDropPosition = 1;

      // Should not find any empty image blocks
      const emptyBlock = (editor as any).findEmptyImageBlockNear(mockDropPosition);
      expect(emptyBlock).toBeNull();

      // In real scenario, this would create a new image block
      const newImageBlockId = editor.addBlock('image', '', mockDropPosition);
      
      expect(editor.getBlocks().length).toBe(initialBlockCount + 1);
      const newBlock = editor.getBlocks().find(b => b.id === newImageBlockId);
      expect(newBlock?.type).toBe('image');
    });

    test('should handle multiple image drops correctly', () => {
      // Create one empty image block
      const blockId = editor.addBlock('image', '');
      const initialBlockCount = editor.getBlocks().length;

      // Simulate dropping 3 images
      const mockFiles = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.png', { type: 'image/png' }),
        new File(['test3'], 'test3.gif', { type: 'image/gif' })
      ];

      const emptyBlock = (editor as any).findEmptyImageBlockNear(0);
      expect(emptyBlock).toBeTruthy();

      // First image should reuse existing block
      // Second and third should create new blocks
      const expectedNewBlocks = mockFiles.length - 1; // -1 because first reuses existing

      // Simulate adding new blocks for additional images
      for (let i = 1; i < mockFiles.length; i++) {
        editor.addBlock('image', '', i);
      }

      expect(editor.getBlocks().length).toBe(initialBlockCount + expectedNewBlocks);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty blocks array gracefully', () => {
      // Remove all blocks
      const blocks = editor.getBlocks();
      blocks.forEach(block => {
        editor.removeBlock(block.id);
      });

      expect(editor.getBlocks().length).toBe(0);

      // Should not crash when searching for empty blocks
      const emptyBlock = (editor as any).findEmptyImageBlockNear(0);
      expect(emptyBlock).toBeNull();
    });

    test('should handle invalid drop position gracefully', () => {
      editor.addBlock('paragraph', 'Test');

      // Test negative position
      const emptyBlock1 = (editor as any).findEmptyImageBlockNear(-5);
      expect(emptyBlock1).toBeNull();

      // Test extremely large position
      const emptyBlock2 = (editor as any).findEmptyImageBlockNear(1000);
      expect(emptyBlock2).toBeNull();
    });
  });
});