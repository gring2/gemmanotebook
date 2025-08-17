import { Editor } from './Editor';
import { GemmaService } from '@/ai/GemmaService';
import { ReferenceManager } from '@/references/ReferenceManager';

// Mock GemmaService
class MockGemmaService extends GemmaService {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async generateCompletion(currentText: string, context: string, referenceContext?: string): Promise<string> {
    return Promise.resolve('Mock completion');
  }
}

// Mock ReferenceManager
class MockReferenceManager extends ReferenceManager {
  getRelevantContent(keywords: string[], maxLength?: number): string {
    return '';
  }
}

describe('Editor', () => {
  let editor: Editor;
  let container: HTMLElement;
  let mockGemmaService: MockGemmaService;
  let mockReferenceManager: MockReferenceManager;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '<div class="editor-container"><div id="editor"></div></div>';
    container = document.querySelector('.editor-container') as HTMLElement;
    mockGemmaService = new MockGemmaService();
    mockReferenceManager = new MockReferenceManager();
    
    editor = new Editor(container, mockGemmaService, mockReferenceManager);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should initialize with one empty paragraph block', () => {
    const blocks = editor.getBlocks();
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].content).toBe('');
  });

  test('should add a new block', () => {
    const blockId = editor.addBlock('heading-1', 'Test Heading');
    const blocks = editor.getBlocks();
    
    expect(blocks.length).toBe(2); // Initial paragraph + new heading
    
    const newBlock = blocks.find(b => b.id === blockId);
    expect(newBlock).toBeDefined();
    expect(newBlock?.type).toBe('heading-1');
    expect(newBlock?.content).toBe('Test Heading');
  });

  test('should remove a block', () => {
    const blockId = editor.addBlock('paragraph', 'Test content');
    expect(editor.getBlocks().length).toBe(2);
    
    editor.removeBlock(blockId);
    expect(editor.getBlocks().length).toBe(1);
    
    const removedBlock = editor.getBlocks().find(b => b.id === blockId);
    expect(removedBlock).toBeUndefined();
  });

  test('should update a block', () => {
    const blockId = editor.addBlock('paragraph', 'Original content');
    
    editor.updateBlock(blockId, { content: 'Updated content', type: 'heading-2' });
    
    const updatedBlock = editor.getBlocks().find(b => b.id === blockId);
    expect(updatedBlock?.content).toBe('Updated content');
    expect(updatedBlock?.type).toBe('heading-2');
  });

  test('should get editor state', () => {
    editor.addBlock('heading-1', 'Test Heading');
    editor.addBlock('paragraph', 'Test paragraph');
    
    const state = editor.getState();
    expect(state.blocks.length).toBe(3); // Initial + 2 added
    expect(state.blocks[1].type).toBe('heading-1');
    expect(state.blocks[2].type).toBe('paragraph');
  });

  test('should load content from state', () => {
    const testState = {
      blocks: [
        {
          id: 'block-1',
          type: 'heading-1' as const,
          content: 'Test Heading',
          metadata: { level: 1 },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'block-2',
          type: 'paragraph' as const,
          content: 'Test paragraph',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      currentBlockId: null
    };

    editor.loadContent(testState);
    const blocks = editor.getBlocks();
    
    expect(blocks.length).toBe(2);
    expect(blocks[0].content).toBe('Test Heading');
    expect(blocks[1].content).toBe('Test paragraph');
  });
});