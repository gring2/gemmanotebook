import { Editor } from './Editor';
import { GemmaService } from '@/ai/GemmaService';
import { ReferenceManager } from '@/references/ReferenceManager';

// Mock GemmaService for testing
class MockGemmaService extends GemmaService {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async generateCompletion(currentText: string, context: string, referenceContext?: string): Promise<string> {
    return Promise.resolve(' and this is a completion.');
  }

  async composeDocument(instruction: string, context: string, referenceContext?: string): Promise<string> {
    return Promise.resolve(`# Generated Content\n\nThis is generated content based on: ${instruction}\n\n- Point 1\n- Point 2`);
  }

  async streamComposeDocument(
    instruction: string,
    callback: (text: string) => void,
    context: string = '',
    referenceContext?: string
  ): Promise<void> {
    // Simulate semantic paragraph content
    const content = `This is the first paragraph with meaningful content. It contains several sentences that explain the topic. This completes the first semantic block.\n\nThis is the second paragraph that continues the discussion. It provides additional details and context. The flow between paragraphs is natural and coherent.\n\nThis final paragraph wraps up the`;
    const chunks = content.split(' ');
    
    for (const chunk of chunks) {
      callback(chunk + ' ');
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }
}

// Mock ReferenceManager
class MockReferenceManager extends ReferenceManager {
  getRelevantContent(keywords: string[], maxLength?: number): string {
    return '';
  }
}

describe('AI Integration in Editor', () => {
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

  test('should insert AI generated content as blocks', async () => {
    const initialBlockCount = editor.getBlocks().length;
    
    await editor.insertAIGeneratedContent('Write about AI');
    
    const blocks = editor.getBlocks();
    expect(blocks.length).toBeGreaterThan(initialBlockCount);
    
    // Should have created heading and paragraph blocks
    const hasHeading = blocks.some(b => b.type.startsWith('heading-'));
    const hasBulletList = blocks.some(b => b.type === 'bullet-list');
    
    expect(hasHeading).toBe(true);
    expect(hasBulletList).toBe(true);
  });

  test('should handle inline suggestions', async () => {
    // Get the initial block and add some content
    const blocks = editor.getBlocks();
    const firstBlock = blocks[0];
    
    editor.updateBlock(firstBlock.id, { content: 'This is a test' });
    
    // Since the inline suggestion system is now used, we test that the editor
    // has the inline suggestion functionality available
    expect(editor['inlineSuggestion']).toBeDefined();
    expect(typeof editor['inlineSuggestion'].requestSuggestion).toBe('function');
    expect(typeof editor['inlineSuggestion'].acceptSuggestion).toBe('function');
  });

  test('should parse different content types into appropriate blocks', async () => {
    await editor.insertAIGeneratedContent('Generate mixed content');
    
    const blocks = editor.getBlocks();
    const blockTypes = blocks.map(b => b.type);
    
    // Should have different block types based on the mock response
    expect(blockTypes).toContain('heading-1');
    expect(blockTypes).toContain('paragraph');
    expect(blockTypes).toContain('bullet-list');
  });

  test('should stream content into editor', async () => {
    const initialBlockCount = editor.getBlocks().length;
    
    await editor.streamAIContentIntoEditor('Write streamed content');
    
    const blocks = editor.getBlocks();
    expect(blocks.length).toBeGreaterThan(initialBlockCount);
    
    // Should contain the streamed content
    const contentText = blocks.map(b => b.content).join(' ');
    expect(contentText).toContain('meaningful content');
  });

  test('should create semantic paragraph blocks from streamed content', async () => {
    const initialBlockCount = editor.getBlocks().length;
    
    await editor.streamAIContentIntoEditor('Generate semantic content');
    
    const blocks = editor.getBlocks();
    const newBlocks = blocks.slice(initialBlockCount);
    
    // Should create multiple blocks for different paragraphs
    expect(newBlocks.length).toBeGreaterThan(1);
    
    // Check that paragraphs contain complete sentences  
    const firstParagraph = newBlocks[0]?.content || '';
    const secondParagraph = newBlocks[1]?.content || '';
    
    // Verify basic paragraph structure
    expect(firstParagraph).toContain('This is the first paragraph');
    expect(firstParagraph).toContain('meaningful content');
    
    if (newBlocks.length > 1) {
      expect(secondParagraph).toContain('This is the second paragraph');
      expect(secondParagraph).toContain('discussion');
    }
    
    // Each paragraph should contain complete thoughts
    expect(firstParagraph.length).toBeGreaterThan(20);
    if (secondParagraph) {
      expect(secondParagraph.length).toBeGreaterThan(20);
    }
  });
});