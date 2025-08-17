import { Editor } from '@/editor/Editor';
import { FileStorage } from '@/storage/FileStorage';

export interface AutoSaveOptions {
  interval: number; // Auto-save interval in milliseconds
  filename: string; // Default filename to save to
  enabled: boolean; // Whether auto-save is enabled
  showStatus: boolean; // Whether to show save status
}

export class AutoSave {
  private editor: Editor;
  private fileStorage: FileStorage;
  private options: AutoSaveOptions;
  private saveTimer: NodeJS.Timeout | null = null;
  private lastSaveTime: Date | null = null;
  private hasUnsavedChanges = false;
  private isInitialized = false;

  constructor(editor: Editor, fileStorage: FileStorage, options: Partial<AutoSaveOptions> = {}) {
    this.editor = editor;
    this.fileStorage = fileStorage;
    
    this.options = {
      interval: 30000, // 30 seconds
      filename: 'current.json',
      enabled: true,
      showStatus: true,
      ...options
    };

    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Listen for editor changes
    window.addEventListener('editorChange', this.handleEditorChange.bind(this));

    // Listen for page visibility changes to save before user leaves
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Listen for beforeunload to save before page closes
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    // Start auto-save timer if enabled
    if (this.options.enabled) {
      this.startAutoSave();
    }

    this.isInitialized = true;
    console.log('AutoSave initialized');
  }

  private handleEditorChange(): void {
    this.hasUnsavedChanges = true;
    
    // Reset the auto-save timer
    if (this.options.enabled) {
      this.restartAutoSave();
    }

    // Update UI to show unsaved changes
    if (this.options.showStatus) {
      this.updateSaveStatus('unsaved');
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden && this.hasUnsavedChanges) {
      // Page is being hidden, save immediately
      this.saveNow();
    }
  }

  private handleBeforeUnload(event: BeforeUnloadEvent): string | undefined {
    if (this.hasUnsavedChanges) {
      // Save before page unloads
      this.saveNow();
      
      // Show warning to user
      const message = 'You have unsaved changes. Are you sure you want to leave?';
      event.returnValue = message;
      return message;
    }
    return undefined;
  }

  private startAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    this.saveTimer = setInterval(() => {
      if (this.hasUnsavedChanges) {
        this.saveNow();
      }
    }, this.options.interval);
  }

  private restartAutoSave(): void {
    if (this.options.enabled) {
      this.startAutoSave();
    }
  }

  public async saveNow(): Promise<void> {
    if (!this.hasUnsavedChanges) {
      return;
    }

    try {
      if (this.options.showStatus) {
        this.updateSaveStatus('saving');
      }

      const editorState = this.editor.getState();
      await this.fileStorage.save(this.options.filename, editorState);
      
      this.hasUnsavedChanges = false;
      this.lastSaveTime = new Date();

      if (this.options.showStatus) {
        this.updateSaveStatus('saved');
      }

      console.log(`Auto-saved at ${this.lastSaveTime.toLocaleTimeString()}`);
    } catch (error) {
      console.error('Auto-save failed:', error);
      
      if (this.options.showStatus) {
        this.updateSaveStatus('error');
      }
    }
  }

  public enable(): void {
    this.options.enabled = true;
    this.startAutoSave();
    console.log('Auto-save enabled');
  }

  public disable(): void {
    this.options.enabled = false;
    
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    
    console.log('Auto-save disabled');
  }

  public setInterval(interval: number): void {
    this.options.interval = interval;
    
    if (this.options.enabled) {
      this.restartAutoSave();
    }
    
    console.log(`Auto-save interval set to ${interval}ms`);
  }

  public setFilename(filename: string): void {
    this.options.filename = filename;
    console.log(`Auto-save filename set to ${filename}`);
  }

  public getStatus(): {
    enabled: boolean;
    interval: number;
    filename: string;
    lastSaveTime: Date | null;
    hasUnsavedChanges: boolean;
  } {
    return {
      enabled: this.options.enabled,
      interval: this.options.interval,
      filename: this.options.filename,
      lastSaveTime: this.lastSaveTime,
      hasUnsavedChanges: this.hasUnsavedChanges
    };
  }

  private updateSaveStatus(status: 'saved' | 'saving' | 'unsaved' | 'error'): void {
    // Remove existing status
    const existingStatus = document.querySelector('.auto-save-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    // Create status element
    const statusEl = document.createElement('div');
    statusEl.className = 'auto-save-status';
    statusEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      transition: opacity 0.3s;
    `;

    switch (status) {
      case 'saved':
        statusEl.style.background = '#4caf50';
        statusEl.style.color = 'white';
        statusEl.textContent = `✓ Saved at ${new Date().toLocaleTimeString()}`;
        break;
      
      case 'saving':
        statusEl.style.background = '#2196f3';
        statusEl.style.color = 'white';
        statusEl.textContent = '💾 Saving...';
        break;
      
      case 'unsaved':
        statusEl.style.background = '#ff9800';
        statusEl.style.color = 'white';
        statusEl.textContent = '● Unsaved changes';
        break;
      
      case 'error':
        statusEl.style.background = '#f44336';
        statusEl.style.color = 'white';
        statusEl.textContent = '❌ Save failed';
        break;
    }

    document.body.appendChild(statusEl);

    // Auto-hide success/error messages
    if (status === 'saved' || status === 'error') {
      setTimeout(() => {
        statusEl.style.opacity = '0';
        setTimeout(() => {
          statusEl.remove();
        }, 300);
      }, 3000);
    }
  }

  public destroy(): void {
    // Clean up event listeners
    window.removeEventListener('editorChange', this.handleEditorChange.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    // Clear timer
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }

    // Save any unsaved changes before destroying
    if (this.hasUnsavedChanges) {
      this.saveNow();
    }

    this.isInitialized = false;
    console.log('AutoSave destroyed');
  }

  // Manual save method for user-triggered saves
  public async manualSave(filename?: string): Promise<void> {
    const saveFilename = filename || this.options.filename;
    
    try {
      if (this.options.showStatus) {
        this.updateSaveStatus('saving');
      }

      const editorState = this.editor.getState();
      await this.fileStorage.save(saveFilename, editorState);
      
      this.hasUnsavedChanges = false;
      this.lastSaveTime = new Date();

      if (this.options.showStatus) {
        this.updateSaveStatus('saved');
      }

      console.log(`Manually saved to ${saveFilename} at ${this.lastSaveTime.toLocaleTimeString()}`);
    } catch (error) {
      console.error('Manual save failed:', error);
      
      if (this.options.showStatus) {
        this.updateSaveStatus('error');
      }
      
      throw error;
    }
  }
}