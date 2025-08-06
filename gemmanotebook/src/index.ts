import { Editor } from '@/editor/Editor';
import { FileStorage } from '@/storage/FileStorage';
import { GemmaService } from '@/ai/GemmaService';
import { ChatInterface } from '@/chat/ChatInterface';
import { AutoSave } from '@/features/AutoSave';
import { ReferenceManager } from '@/references/ReferenceManager';
import { ReferenceUI } from '@/references/ReferenceUI';

class App {
  private editor!: Editor;
  private fileStorage!: FileStorage;
  private gemmaService!: GemmaService;
  private chatInterface!: ChatInterface;
  private autoSave!: AutoSave;
  private referenceManager!: ReferenceManager;
  private referenceUI!: ReferenceUI;

  constructor() {
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      // Initialize core services
      this.fileStorage = new FileStorage();
      this.gemmaService = new GemmaService();
      this.referenceManager = new ReferenceManager();
      
      // Initialize editor
      const editorContainer = document.querySelector('.editor-container') as HTMLElement;
      this.editor = new Editor(editorContainer, this.gemmaService, this.referenceManager);
      
      // Initialize chat interface
      const chatContainer = document.querySelector('.chat-container') as HTMLElement;
      this.chatInterface = new ChatInterface(chatContainer, this.gemmaService, this.editor, this.referenceManager);
      
      // Initialize reference UI
      const referenceContainer = document.getElementById('reference-container') as HTMLElement;
      this.referenceUI = new ReferenceUI(referenceContainer, this.referenceManager);
      
      // Initialize auto-save
      this.autoSave = new AutoSave(this.editor, this.fileStorage);
      
      // Connect services
      await this.gemmaService.initialize();
      
      // Load existing document if available
      await this.loadDocument();
      
      this.showStatus('App initialized successfully', 'success');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showStatus('Failed to initialize app', 'error');
    }
  }

  private async loadDocument(): Promise<void> {
    try {
      const content = await this.fileStorage.load('current.json');
      if (content) {
        this.editor.loadContent(content);
      }
    } catch (error) {
      console.warn('No existing document found, starting with empty editor');
    }
  }

  private showStatus(message: string, type: 'success' | 'error' = 'success'): void {
    const existing = document.querySelector('.status');
    if (existing) {
      existing.remove();
    }

    const status = document.createElement('div');
    status.className = `status ${type}`;
    status.textContent = message;
    document.body.appendChild(status);

    setTimeout(() => {
      status.remove();
    }, 3000);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create app structure
  const appDiv = document.getElementById('app');
  if (appDiv) {
    appDiv.innerHTML = `
      <div class="app">
        <div class="editor-container">
          <div class="editor" id="editor"></div>
        </div>
        <div class="sidebar">
          <div class="reference-section">
            <h3>📚 Reference Documents</h3>
            <div class="reference-container" id="reference-container">
              <!-- Reference UI will be inserted here -->
            </div>
          </div>
          <div class="chat-section">
            <h3>🤖 AI Chat</h3>
            <div class="chat-container">
              <div class="chat-messages" id="chat-messages"></div>
              <div class="chat-input">
                <input type="text" id="chat-input" placeholder="Ask AI anything...">
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="ai-help" title="AI Features:&#10;• Type to get inline suggestions (Tab to accept)&#10;• Press Ctrl+/ for AI command palette&#10;• Chat with AI in the sidebar&#10;• Upload reference documents for context">
        🤖 AI Helper
      </div>
    `;
  }

  // Initialize the app
  new App();
});