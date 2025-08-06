import { ReferenceManager, ReferenceDocument } from './ReferenceManager';

export class ReferenceUI {
  private referenceManager: ReferenceManager;
  private container: HTMLElement;
  private isExpanded = false;

  constructor(container: HTMLElement, referenceManager: ReferenceManager) {
    this.container = container;
    this.referenceManager = referenceManager;
    this.createUI();
    this.setupEventListeners();
  }

  private createUI(): void {
    const referencesSection = document.createElement('div');
    referencesSection.className = 'references-section';
    referencesSection.innerHTML = `
      <div class="references-header" style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #eee;
        margin-bottom: 10px;
        cursor: pointer;
      ">
        <h4 style="margin: 0; color: #333; font-size: 14px;">
          📚 References <span class="ref-count">(0)</span>
        </h4>
        <span class="expand-icon" style="
          transform: rotate(0deg);
          transition: transform 0.2s;
          font-size: 12px;
          color: #666;
        ">▼</span>
      </div>
      
      <div class="references-content" style="
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      ">
        <div class="upload-area" style="
          border: 2px dashed #ddd;
          border-radius: 6px;
          padding: 20px;
          text-align: center;
          margin-bottom: 15px;
          cursor: pointer;
          transition: all 0.2s;
        ">
          <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
            📁 Drop files here or click to upload
          </div>
          <div style="color: #999; font-size: 12px;">
            Supports .txt and .md files (max 1MB each)
          </div>
          <input type="file" multiple accept=".txt,.md,.markdown" style="display: none;" class="file-input">
        </div>
        
        <div class="references-list" style="
          max-height: 200px;
          overflow-y: auto;
        "></div>
        
        <div class="references-stats" style="
          font-size: 12px;
          color: #666;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #eee;
        "></div>
      </div>
    `;

    this.container.appendChild(referencesSection);
    this.updateUI();
  }

  private setupEventListeners(): void {
    // Toggle expand/collapse
    const header = this.container.querySelector('.references-header') as HTMLElement;
    header.addEventListener('click', () => {
      this.toggleExpanded();
    });

    // File upload
    const uploadArea = this.container.querySelector('.upload-area') as HTMLElement;
    const fileInput = this.container.querySelector('.file-input') as HTMLInputElement;

    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#2196f3';
      uploadArea.style.backgroundColor = '#f8f9ff';
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '#ddd';
      uploadArea.style.backgroundColor = 'transparent';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#ddd';
      uploadArea.style.backgroundColor = 'transparent';
      
      const files = Array.from(e.dataTransfer?.files || []);
      this.handleFileUpload(files);
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      this.handleFileUpload(files);
    });
  }

  private toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    const content = this.container.querySelector('.references-content') as HTMLElement;
    const icon = this.container.querySelector('.expand-icon') as HTMLElement;

    if (this.isExpanded) {
      content.style.maxHeight = '400px';
      icon.style.transform = 'rotate(180deg)';
    } else {
      content.style.maxHeight = '0';
      icon.style.transform = 'rotate(0deg)';
    }
  }

  private async handleFileUpload(files: File[]): Promise<void> {
    const uploadPromises = files.map(async (file) => {
      try {
        await this.referenceManager.uploadFile(file);
        this.showNotification(`✅ Uploaded: ${file.name}`, 'success');
      } catch (error) {
        console.error('Upload failed:', error);
        this.showNotification(`❌ Failed: ${file.name} - ${(error as Error).message}`, 'error');
      }
    });

    await Promise.all(uploadPromises);
    this.updateUI();

    // Expand if collapsed and files were uploaded
    if (!this.isExpanded && files.length > 0) {
      this.toggleExpanded();
    }
  }

  private updateUI(): void {
    this.updateReferencesList();
    this.updateStats();
    this.updateCount();
  }

  private updateReferencesList(): void {
    const listContainer = this.container.querySelector('.references-list') as HTMLElement;
    const documents = this.referenceManager.getAllDocuments();

    if (documents.length === 0) {
      listContainer.innerHTML = `
        <div style="
          text-align: center;
          color: #999;
          font-size: 13px;
          padding: 20px;
        ">
          No reference documents uploaded yet
        </div>
      `;
      return;
    }

    listContainer.innerHTML = documents
      .map(doc => this.createDocumentElement(doc))
      .join('');

    // Add event listeners for remove buttons
    listContainer.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const docId = (btn as HTMLElement).dataset.docId;
        if (docId) {
          this.removeDocument(docId);
        }
      });
    });

    // Add event listeners for document items
    listContainer.querySelectorAll('.reference-item').forEach(item => {
      item.addEventListener('click', () => {
        const docId = (item as HTMLElement).dataset.docId;
        if (docId) {
          this.showDocumentPreview(docId);
        }
      });
    });
  }

  private createDocumentElement(doc: ReferenceDocument): string {
    const icon = doc.type === 'markdown' ? '📝' : '📄';
    const truncatedContent = doc.content.length > 100 
      ? doc.content.substring(0, 100) + '...' 
      : doc.content;

    return `
      <div class="reference-item" data-doc-id="${doc.id}" style="
        padding: 8px;
        margin-bottom: 6px;
        background: #f8f9fa;
        border-radius: 4px;
        cursor: pointer;
        position: relative;
        transition: background-color 0.2s;
      " onmouseover="this.style.backgroundColor='#f0f0f0'" 
         onmouseout="this.style.backgroundColor='#f8f9fa'">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-size: 13px;
              font-weight: 500;
              color: #333;
              margin-bottom: 2px;
              display: flex;
              align-items: center;
              gap: 6px;
            ">
              <span>${icon}</span>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${doc.name}
              </span>
            </div>
            <div style="
              font-size: 11px;
              color: #666;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">
              ${truncatedContent}
            </div>
          </div>
          <button class="remove-btn" data-doc-id="${doc.id}" style="
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 2px 6px;
            font-size: 10px;
            cursor: pointer;
            margin-left: 8px;
            opacity: 0.7;
          " onmouseover="this.style.opacity='1'" 
             onmouseout="this.style.opacity='0.7'">×</button>
        </div>
      </div>
    `;
  }

  private updateStats(): void {
    const statsContainer = this.container.querySelector('.references-stats') as HTMLElement;
    const stats = this.referenceManager.getStats();

    if (stats.totalDocuments === 0) {
      statsContainer.innerHTML = '';
      return;
    }

    const sizeFormatted = this.formatFileSize(stats.totalSize);
    statsContainer.innerHTML = `
      📊 ${stats.totalDocuments} document${stats.totalDocuments > 1 ? 's' : ''} 
      • ${sizeFormatted} total
      ${stats.types.markdown > 0 ? `• ${stats.types.markdown} markdown` : ''}
      ${stats.types.text > 0 ? `• ${stats.types.text} text` : ''}
    `;
  }

  private updateCount(): void {
    const countElement = this.container.querySelector('.ref-count') as HTMLElement;
    const count = this.referenceManager.getAllDocuments().length;
    countElement.textContent = `(${count})`;
  }

  private removeDocument(docId: string): void {
    const doc = this.referenceManager.getDocument(docId);
    if (doc && confirm(`Remove "${doc.name}" from references?`)) {
      this.referenceManager.removeDocument(docId);
      this.updateUI();
      this.showNotification(`🗑️ Removed: ${doc.name}`, 'info');
    }
  }

  private showDocumentPreview(docId: string): void {
    const doc = this.referenceManager.getDocument(docId);
    if (!doc) return;

    const modal = document.createElement('div');
    modal.className = 'document-preview-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 600px;
      max-height: 80vh;
      overflow: auto;
      position: relative;
    `;

    content.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      ">
        <h3 style="margin: 0; color: #333;">
          ${doc.type === 'markdown' ? '📝' : '📄'} ${doc.name}
        </h3>
        <button class="close-btn" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 5px;
        ">×</button>
      </div>
      <div style="
        font-size: 12px;
        color: #666;
        margin-bottom: 15px;
      ">
        Uploaded: ${doc.uploadedAt.toLocaleDateString()} • 
        Size: ${this.formatFileSize(doc.size)} • 
        Type: ${doc.type}
      </div>
      <pre style="
        white-space: pre-wrap;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        margin: 0;
        background: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        max-height: 400px;
        overflow-y: auto;
      ">${doc.content}</pre>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => modal.remove();
    content.querySelector('.close-btn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 13px;
      z-index: 1001;
      max-width: 300px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ${type === 'success' ? 'background: #4caf50; color: white;' : ''}
      ${type === 'error' ? 'background: #f44336; color: white;' : ''}
      ${type === 'info' ? 'background: #2196f3; color: white;' : ''}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  public refresh(): void {
    this.updateUI();
  }

  public expandSection(): void {
    if (!this.isExpanded) {
      this.toggleExpanded();
    }
  }

  public getReferencesCount(): number {
    return this.referenceManager.getAllDocuments().length;
  }
}