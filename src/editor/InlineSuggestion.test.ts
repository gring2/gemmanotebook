import { InlineSuggestion } from './InlineSuggestion';
import { GemmaService } from '@/ai/GemmaService';
import { ReferenceManager } from '@/references/ReferenceManager';

// Mock GemmaService for testing
class MockGemmaService extends GemmaService {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async generateCompletion(currentText: string, context: string, referenceContext?: string): Promise<string> {
    // Return a mock completion based on the input
    if (currentText.includes('Hello')) {
      return ' world! How are you today?';
    }
    if (currentText.includes('The weather')) {
      return ' is quite nice today.';
    }
    return ' and continue with more text.';
  }
}

// Mock ReferenceManager
class MockReferenceManager extends ReferenceManager {
  getRelevantContent(keywords: string[], maxLength?: number): string {
    return '';
  }
}

describe('InlineSuggestion', () => {
  let inlineSuggestion: InlineSuggestion;
  let mockGemmaService: MockGemmaService;
  let mockReferenceManager: MockReferenceManager;
  let mockBlockElement: HTMLElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div class="block" data-block-id="test-block">
        <div class="block-content" contenteditable="true">Test content</div>
      </div>
    `;
    
    mockBlockElement = document.querySelector('.block') as HTMLElement;
    mockGemmaService = new MockGemmaService();
    mockReferenceManager = new MockReferenceManager();
    inlineSuggestion = new InlineSuggestion(mockGemmaService, mockReferenceManager);

    // Mock window selection
    const mockRange = {
      getBoundingClientRect: () => ({ left: 100, top: 200 })
    } as Range;

    Object.defineProperty(window, 'getSelection', {
      value: () => ({
        getRangeAt: () => mockRange,
        rangeCount: 1
      }),
      writable: true
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    inlineSuggestion.destroy();
  });

  test('should request suggestion and show inline element', async () => {
    const blockId = 'test-block';
    const currentText = 'Hello';
    const context = 'This is a test document.';

    await inlineSuggestion.requestSuggestion(blockId, mockBlockElement, currentText, context);
    
    // Wait for suggestion to be generated (it's async with timeout)
    await new Promise(resolve => setTimeout(resolve, 900));

    expect(inlineSuggestion.hasSuggestion()).toBe(true);
    
    const suggestionElement = document.querySelector('.inline-suggestion');
    expect(suggestionElement).toBeTruthy();
    expect(suggestionElement?.textContent).toContain('world');
  });

  test('should accept suggestion and dispatch event', async () => {
    const blockId = 'test-block';
    const currentText = 'Hello';
    const context = 'This is a test document.';

    // Mock the event dispatcher
    let dispatchedEvent: CustomEvent | null = null;
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = jest.fn((event: CustomEvent) => {
      dispatchedEvent = event;
      return true;
    });

    await inlineSuggestion.requestSuggestion(blockId, mockBlockElement, currentText, context);
    await new Promise(resolve => setTimeout(resolve, 900));

    const accepted = inlineSuggestion.acceptSuggestion();

    expect(accepted).toBe(true);
    expect(dispatchedEvent?.type).toBe('acceptSuggestion');
    expect(dispatchedEvent?.detail.blockId).toBe(blockId);
    expect(dispatchedEvent?.detail.newText).toContain('Hello');
    expect(dispatchedEvent?.detail.newText).toContain('world');

    // Restore original function
    window.dispatchEvent = originalDispatchEvent;
  });

  test('should clear suggestion', async () => {
    const blockId = 'test-block';
    const currentText = 'Hello';
    const context = 'This is a test document.';

    await inlineSuggestion.requestSuggestion(blockId, mockBlockElement, currentText, context);
    await new Promise(resolve => setTimeout(resolve, 900));

    expect(inlineSuggestion.hasSuggestion()).toBe(true);

    inlineSuggestion.clearSuggestion();

    expect(inlineSuggestion.hasSuggestion()).toBe(false);
    
    const suggestionElement = document.querySelector('.inline-suggestion');
    expect(suggestionElement).toBeFalsy();
  });

  test('should validate suggestion against current text', async () => {
    const blockId = 'test-block';
    const originalText = 'Hello';
    const context = 'This is a test document.';

    await inlineSuggestion.requestSuggestion(blockId, mockBlockElement, originalText, context);
    await new Promise(resolve => setTimeout(resolve, 900));

    // Should be valid if current text still starts with original
    expect(inlineSuggestion.isSuggestionValid('Hello there')).toBe(true);
    
    // Should be invalid if current text changed significantly
    expect(inlineSuggestion.isSuggestionValid('Goodbye')).toBe(false);
  });

  test('should not generate suggestion for short text', async () => {
    const blockId = 'test-block';
    const currentText = 'Hi'; // Too short
    const context = 'This is a test document.';

    await inlineSuggestion.requestSuggestion(blockId, mockBlockElement, currentText, context);
    await new Promise(resolve => setTimeout(resolve, 900));

    expect(inlineSuggestion.hasSuggestion()).toBe(false);
  });

  test('should clean suggestion text properly', async () => {
    const blockId = 'test-block';
    const currentText = 'The weather';
    const context = 'Talking about weather today.';

    await inlineSuggestion.requestSuggestion(blockId, mockBlockElement, currentText, context);
    await new Promise(resolve => setTimeout(resolve, 900));

    const suggestion = inlineSuggestion.getCurrentSuggestion();
    expect(suggestion?.suggestion).toBe('is quite nice today.');
    expect(suggestion?.suggestion).not.toContain('The weather'); // Should not duplicate
  });
});