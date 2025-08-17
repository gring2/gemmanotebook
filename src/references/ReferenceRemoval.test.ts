/**
 * @group general
 */
import { ReferenceManager, ReferenceDocument } from './ReferenceManager';
import { ReferenceUI } from './ReferenceUI';

// Mock localStorage
const mockStorage: { [key: string]: string } = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => mockStorage[key] = value,
    removeItem: (key: string) => delete mockStorage[key],
    clear: () => Object.keys(mockStorage).forEach(key => delete mockStorage[key])
  }
});

describe('Enhanced Reference Removal Features', () => {
  let referenceManager: ReferenceManager;
  let referenceUI: ReferenceUI;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Clear localStorage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    
    // Create mock container
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);

    // Create instances
    referenceManager = new ReferenceManager();
    referenceUI = new ReferenceUI(mockContainer, referenceManager);
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
    jest.clearAllMocks();
  });

  describe('Basic Removal Functionality', () => {
    test('should remove document and show undo option', async () => {
      // Create a test document
      const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      const doc = await referenceManager.uploadFile(testFile);
      
      // Verify document exists
      expect(referenceManager.getAllDocuments()).toHaveLength(1);
      expect(referenceManager.getDocument(doc.id)).toBeDefined();
      
      // Remove the document
      const removed = referenceManager.removeDocument(doc.id);
      expect(removed).toBe(true);
      
      // Verify document is removed
      expect(referenceManager.getAllDocuments()).toHaveLength(0);
      expect(referenceManager.getDocument(doc.id)).toBeUndefined();
      
      // Verify it's in recently deleted
      const recentlyDeleted = referenceManager.getRecentlyDeleted();
      expect(recentlyDeleted).toHaveLength(1);
      expect(recentlyDeleted[0].document.id).toBe(doc.id);
    });

    test('should handle removing non-existent document gracefully', () => {
      const removed = referenceManager.removeDocument('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('Undo Functionality', () => {
    test('should restore recently removed document', async () => {
      // Create and remove a document
      const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      const doc = await referenceManager.uploadFile(testFile);
      referenceManager.removeDocument(doc.id);
      
      // Verify it's removed
      expect(referenceManager.getAllDocuments()).toHaveLength(0);
      
      // Undo the removal
      const restored = referenceManager.undoLastRemoval();
      
      // Verify document is restored
      expect(restored).toBeDefined();
      expect(restored!.id).toBe(doc.id);
      expect(referenceManager.getAllDocuments()).toHaveLength(1);
      expect(referenceManager.getDocument(doc.id)).toBeDefined();
    });

    test('should return null when nothing to undo', () => {
      const restored = referenceManager.undoLastRemoval();
      expect(restored).toBeNull();
    });

    test('should handle multiple removals and undo in LIFO order', async () => {
      // Create multiple documents
      const file1 = new File(['Content 1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['Content 2'], 'test2.txt', { type: 'text/plain' });
      const doc1 = await referenceManager.uploadFile(file1);
      const doc2 = await referenceManager.uploadFile(file2);
      
      // Remove both
      referenceManager.removeDocument(doc1.id);
      referenceManager.removeDocument(doc2.id);
      
      // Undo should restore doc2 first (last removed)
      const restored1 = referenceManager.undoLastRemoval();
      expect(restored1!.id).toBe(doc2.id);
      
      // Undo should restore doc1 second
      const restored2 = referenceManager.undoLastRemoval();
      expect(restored2!.id).toBe(doc1.id);
      
      // Nothing more to undo
      const restored3 = referenceManager.undoLastRemoval();
      expect(restored3).toBeNull();
    });
  });

  describe('Bulk Operations', () => {
    test('should clear all documents and move to trash', async () => {
      // Create multiple documents
      const files = [
        new File(['Content 1'], 'test1.txt', { type: 'text/plain' }),
        new File(['Content 2'], 'test2.md', { type: 'text/plain' }),
        new File(['Content 3'], 'test3.txt', { type: 'text/plain' })
      ];
      
      const docs = await Promise.all(files.map(file => referenceManager.uploadFile(file)));
      expect(referenceManager.getAllDocuments()).toHaveLength(3);
      
      // Clear all
      referenceManager.clearAllDocuments();
      
      // Verify all are removed
      expect(referenceManager.getAllDocuments()).toHaveLength(0);
      
      // Verify all are in recently deleted
      const recentlyDeleted = referenceManager.getRecentlyDeleted();
      expect(recentlyDeleted).toHaveLength(3);
      
      // Verify undo restores the most recently added
      const restored = referenceManager.undoLastRemoval();
      expect(restored).toBeDefined();
      expect(referenceManager.getAllDocuments()).toHaveLength(1);
    });

    test('should limit recently deleted to prevent memory overflow', async () => {
      // Create and remove more documents than the limit (10)
      for (let i = 0; i < 15; i++) {
        const file = new File([`Content ${i}`], `test${i}.txt`, { type: 'text/plain' });
        const doc = await referenceManager.uploadFile(file);
        referenceManager.removeDocument(doc.id);
      }
      
      // Should only keep last 10
      const recentlyDeleted = referenceManager.getRecentlyDeleted();
      expect(recentlyDeleted).toHaveLength(10);
      
      // Most recent should be from the highest index
      expect(recentlyDeleted[0].document.name).toBe('test14.txt');
    });
  });

  describe('Trash Management', () => {
    test('should persist recently deleted across sessions', async () => {
      // Create and remove a document
      const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      const doc = await referenceManager.uploadFile(testFile);
      referenceManager.removeDocument(doc.id);
      
      // Create new instance (simulating app restart)
      const newManager = new ReferenceManager();
      
      // Recently deleted should be loaded
      const recentlyDeleted = newManager.getRecentlyDeleted();
      expect(recentlyDeleted).toHaveLength(1);
      expect(recentlyDeleted[0].document.id).toBe(doc.id);
      
      // Should be able to undo
      const restored = newManager.undoLastRemoval();
      expect(restored!.id).toBe(doc.id);
    });

    test('should clear trash completely', async () => {
      // Create and remove documents
      const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      const doc = await referenceManager.uploadFile(testFile);
      referenceManager.removeDocument(doc.id);
      
      // Verify trash has content
      expect(referenceManager.getRecentlyDeleted()).toHaveLength(1);
      
      // Clear trash
      referenceManager.clearTrash();
      
      // Verify trash is empty
      expect(referenceManager.getRecentlyDeleted()).toHaveLength(0);
      
      // Should not be able to undo
      const restored = referenceManager.undoLastRemoval();
      expect(restored).toBeNull();
    });
  });

  describe('UI Integration', () => {
    test('should display bulk action buttons when multiple documents exist', async () => {
      // Initially should not show bulk actions
      let bulkActions = mockContainer.querySelector('.bulk-actions') as HTMLElement;
      expect(bulkActions?.style.display).toBe('none');
      
      // Add multiple documents
      const files = [
        new File(['Content 1'], 'test1.txt', { type: 'text/plain' }),
        new File(['Content 2'], 'test2.txt', { type: 'text/plain' })
      ];
      
      await Promise.all(files.map(file => referenceManager.uploadFile(file)));
      referenceUI.refresh();
      
      // Should now show bulk actions
      bulkActions = mockContainer.querySelector('.bulk-actions') as HTMLElement;
      expect(bulkActions?.style.display).toBe('block');
      
      // Should have all expected buttons
      expect(mockContainer.querySelector('.select-all-btn')).toBeTruthy();
      expect(mockContainer.querySelector('.clear-selected-btn')).toBeTruthy();
      expect(mockContainer.querySelector('.clear-all-btn')).toBeTruthy();
    });

    test('should include checkboxes for each reference item', async () => {
      // Add a document
      const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      await referenceManager.uploadFile(testFile);
      referenceUI.refresh();
      
      // Should have checkbox for the reference
      const checkbox = mockContainer.querySelector('.ref-checkbox') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      expect(checkbox.type).toBe('checkbox');
      expect(checkbox.dataset.docId).toBeDefined();
    });

    test('should show remove button with proper tooltip', async () => {
      // Add a document
      const testFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      await referenceManager.uploadFile(testFile);
      referenceUI.refresh();
      
      // Should have remove button with tooltip
      const removeBtn = mockContainer.querySelector('.remove-btn') as HTMLElement;
      expect(removeBtn).toBeTruthy();
      expect(removeBtn.textContent).toBe('×');
      expect(removeBtn.title).toBe('Remove reference (Delete)');
    });
  });
});