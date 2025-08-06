export interface ReferenceDocument {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'markdown';
  uploadedAt: Date;
  size: number;
}

export interface ReferenceStorage {
  documents: ReferenceDocument[];
  lastUpdated: Date;
}

export class ReferenceManager {
  private readonly STORAGE_KEY = 'gemma-notebook-references';
  private documents: ReferenceDocument[] = [];
  private documentIdCounter = 0;

  constructor() {
    this.loadReferences();
  }

  public async uploadFile(file: File): Promise<ReferenceDocument> {
    // Validate file type
    if (!this.isValidFileType(file)) {
      throw new Error('Invalid file type. Only .txt and .md files are supported.');
    }

    // Validate file size (max 1MB)
    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 1MB.');
    }

    try {
      // Read file content
      const content = await this.readFileContent(file);
      
      // Create reference document
      const document: ReferenceDocument = {
        id: `ref-${++this.documentIdCounter}`,
        name: file.name,
        content: content.trim(),
        type: this.getFileType(file.name),
        uploadedAt: new Date(),
        size: file.size
      };

      // Add to documents list
      this.documents.push(document);
      
      // Save to storage
      this.saveReferences();
      
      return document;
    } catch (error) {
      console.error('Failed to upload reference file:', error);
      throw new Error(`Failed to upload file: ${file.name}`);
    }
  }

  public removeDocument(documentId: string): boolean {
    const index = this.documents.findIndex(doc => doc.id === documentId);
    if (index !== -1) {
      this.documents.splice(index, 1);
      this.saveReferences();
      return true;
    }
    return false;
  }

  public getDocument(documentId: string): ReferenceDocument | undefined {
    return this.documents.find(doc => doc.id === documentId);
  }

  public getAllDocuments(): ReferenceDocument[] {
    return [...this.documents];
  }

  public getDocumentsContent(): string {
    if (this.documents.length === 0) {
      return '';
    }

    const separator = '\n\n--- Reference Document ---\n\n';
    return this.documents
      .map(doc => `### ${doc.name}\n\n${doc.content}`)
      .join(separator);
  }

  public getDocumentsSummary(): string {
    if (this.documents.length === 0) {
      return 'No reference documents available.';
    }

    return `Reference documents available:\n${this.documents
      .map(doc => `- ${doc.name} (${doc.type}, ${this.formatFileSize(doc.size)})`)
      .join('\n')}`;
  }

  public clearAllDocuments(): void {
    this.documents = [];
    this.saveReferences();
  }

  public getStats(): {
    totalDocuments: number;
    totalSize: number;
    types: { text: number; markdown: number };
  } {
    return {
      totalDocuments: this.documents.length,
      totalSize: this.documents.reduce((sum, doc) => sum + doc.size, 0),
      types: {
        text: this.documents.filter(doc => doc.type === 'text').length,
        markdown: this.documents.filter(doc => doc.type === 'markdown').length
      }
    };
  }

  private isValidFileType(file: File): boolean {
    const validExtensions = ['.txt', '.md', '.markdown'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  private getFileType(fileName: string): 'text' | 'markdown' {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
      return 'markdown';
    }
    return 'text';
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }

  private loadReferences(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data: ReferenceStorage = JSON.parse(stored);
        this.documents = data.documents.map(doc => ({
          ...doc,
          uploadedAt: new Date(doc.uploadedAt)
        }));
        
        // Update counter to avoid ID conflicts
        this.documentIdCounter = Math.max(
          ...this.documents.map(doc => parseInt(doc.id.split('-')[1]) || 0),
          0
        );
      }
    } catch (error) {
      console.error('Failed to load references:', error);
      this.documents = [];
    }
  }

  private saveReferences(): void {
    try {
      const data: ReferenceStorage = {
        documents: this.documents,
        lastUpdated: new Date()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save references:', error);
      throw new Error('Failed to save reference documents');
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  // Search within reference documents
  public searchReferences(query: string): {
    document: ReferenceDocument;
    matchingLines: { lineNumber: number; content: string }[];
  }[] {
    const results: {
      document: ReferenceDocument;
      matchingLines: { lineNumber: number; content: string }[];
    }[] = [];

    const searchTerm = query.toLowerCase();

    this.documents.forEach(doc => {
      const lines = doc.content.split('\n');
      const matchingLines: { lineNumber: number; content: string }[] = [];

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(searchTerm)) {
          matchingLines.push({
            lineNumber: index + 1,
            content: line.trim()
          });
        }
      });

      if (matchingLines.length > 0) {
        results.push({ document: doc, matchingLines });
      }
    });

    return results;
  }

  // Get context-relevant content from references
  public getRelevantContent(contextKeywords: string[], maxLength: number = 2000): string {
    if (this.documents.length === 0) return '';

    // Simple relevance scoring based on keyword matches
    const relevantSections: { content: string; score: number; source: string }[] = [];

    this.documents.forEach(doc => {
      const paragraphs = doc.content.split('\n\n').filter(p => p.trim());
      
      paragraphs.forEach(paragraph => {
        let score = 0;
        const lowerParagraph = paragraph.toLowerCase();
        
        contextKeywords.forEach(keyword => {
          const keywordLower = keyword.toLowerCase();
          const matches = (lowerParagraph.match(new RegExp(keywordLower, 'g')) || []).length;
          score += matches * keyword.length; // Weight longer keywords more
        });

        if (score > 0) {
          relevantSections.push({
            content: paragraph.trim(),
            score,
            source: doc.name
          });
        }
      });
    });

    // Sort by relevance and take top sections within length limit
    relevantSections.sort((a, b) => b.score - a.score);

    let result = '';
    for (const section of relevantSections) {
      const addition = `[From ${section.source}]\n${section.content}\n\n`;
      if (result.length + addition.length <= maxLength) {
        result += addition;
      } else {
        break;
      }
    }

    return result.trim();
  }
}