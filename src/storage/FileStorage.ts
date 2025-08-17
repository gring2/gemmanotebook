import { EditorState } from '@/editor/types';

export interface FileMetadata {
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
}

export class FileStorage {
  private readonly storageKey = 'gemma-notebook';
  private readonly metadataKey = 'gemma-notebook-metadata';

  async save(filename: string, content: EditorState): Promise<void> {
    try {
      const serializedContent = JSON.stringify(content);
      const storageData = this.getStorageData();
      
      storageData[filename] = serializedContent;
      localStorage.setItem(this.storageKey, JSON.stringify(storageData));
      
      // Update metadata
      this.updateMetadata(filename, serializedContent.length);
      
      console.log(`Document saved: ${filename}`);
    } catch (error) {
      console.error('Failed to save document:', error);
      throw new Error(`Failed to save document: ${filename}`);
    }
  }

  async load(filename: string): Promise<EditorState | null> {
    try {
      const storageData = this.getStorageData();
      const serializedContent = storageData[filename];
      
      if (!serializedContent) {
        return null;
      }
      
      const content = JSON.parse(serializedContent) as EditorState;
      
      // Convert date strings back to Date objects
      content.blocks = content.blocks.map(block => ({
        ...block,
        createdAt: new Date(block.createdAt),
        updatedAt: new Date(block.updatedAt)
      }));
      
      console.log(`Document loaded: ${filename}`);
      return content;
    } catch (error) {
      console.error(`Failed to load document: ${filename}`, error);
      throw new Error(`Failed to load document: ${filename}`);
    }
  }

  async delete(filename: string): Promise<void> {
    try {
      const storageData = this.getStorageData();
      delete storageData[filename];
      
      localStorage.setItem(this.storageKey, JSON.stringify(storageData));
      
      // Remove from metadata
      this.removeMetadata(filename);
      
      console.log(`Document deleted: ${filename}`);
    } catch (error) {
      console.error(`Failed to delete document: ${filename}`, error);
      throw new Error(`Failed to delete document: ${filename}`);
    }
  }

  async exists(filename: string): Promise<boolean> {
    const storageData = this.getStorageData();
    return filename in storageData;
  }

  async list(): Promise<FileMetadata[]> {
    try {
      const metadata = this.getMetadata();
      return Object.values(metadata).sort((a, b) => 
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    } catch (error) {
      console.error('Failed to list documents:', error);
      return [];
    }
  }

  async export(filename: string, format: 'json' | 'markdown' | 'text' = 'json'): Promise<string> {
    const content = await this.load(filename);
    if (!content) {
      throw new Error(`Document not found: ${filename}`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(content, null, 2);
      
      case 'markdown':
        return this.convertToMarkdown(content);
      
      case 'text':
        return this.convertToText(content);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async import(filename: string, data: string, format: 'json' | 'markdown' | 'text' = 'json'): Promise<void> {
    let content: EditorState;

    switch (format) {
      case 'json':
        content = JSON.parse(data);
        break;
      
      case 'markdown':
        content = this.convertFromMarkdown(data);
        break;
      
      case 'text':
        content = this.convertFromText(data);
        break;
      
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    await this.save(filename, content);
  }

  private getStorageData(): Record<string, string> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to parse storage data:', error);
      return {};
    }
  }

  private getMetadata(): Record<string, FileMetadata> {
    try {
      const data = localStorage.getItem(this.metadataKey);
      const metadata = data ? JSON.parse(data) : {};
      
      // Convert date strings back to Date objects
      Object.values(metadata).forEach((file: any) => {
        file.createdAt = new Date(file.createdAt);
        file.updatedAt = new Date(file.updatedAt);
      });
      
      return metadata;
    } catch (error) {
      console.error('Failed to parse metadata:', error);
      return {};
    }
  }

  private updateMetadata(filename: string, size: number): void {
    const metadata = this.getMetadata();
    const now = new Date();
    
    if (metadata[filename]) {
      metadata[filename].updatedAt = now;
      metadata[filename].size = size;
    } else {
      metadata[filename] = {
        name: filename,
        path: filename,
        createdAt: now,
        updatedAt: now,
        size
      };
    }
    
    localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
  }

  private removeMetadata(filename: string): void {
    const metadata = this.getMetadata();
    delete metadata[filename];
    localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
  }

  private convertToMarkdown(content: EditorState): string {
    return content.blocks.map(block => {
      switch (block.type) {
        case 'heading-1':
          return `# ${block.content}`;
        case 'heading-2':
          return `## ${block.content}`;
        case 'heading-3':
          return `### ${block.content}`;
        case 'heading-4':
          return `#### ${block.content}`;
        case 'heading-5':
          return `##### ${block.content}`;
        case 'heading-6':
          return `###### ${block.content}`;
        case 'quote':
          return `> ${block.content}`;
        case 'code':
          const language = block.metadata?.language || '';
          return `\`\`\`${language}\n${block.content}\n\`\`\``;
        case 'bullet-list':
          return `- ${block.content}`;
        case 'numbered-list':
          return `${block.metadata?.number || 1}. ${block.content}`;
        case 'checklist':
          const checked = block.metadata?.checked ? 'x' : ' ';
          return `- [${checked}] ${block.content}`;
        case 'horizontal-rule':
          return '---';
        case 'paragraph':
        default:
          return block.content;
      }
    }).join('\n\n');
  }

  private convertToText(content: EditorState): string {
    return content.blocks.map(block => block.content).join('\n\n');
  }

  private convertFromMarkdown(markdown: string): EditorState {
    const lines = markdown.split('\n');
    const blocks: any[] = [];
    let blockIdCounter = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      const blockId = `block-${++blockIdCounter}`;
      const now = new Date();

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        blocks.push({
          id: blockId,
          type: `heading-${headingMatch[1].length}`,
          content: headingMatch[2],
          metadata: { level: headingMatch[1].length },
          createdAt: now,
          updatedAt: now
        });
        continue;
      }

      // Quote
      if (line.startsWith('> ')) {
        blocks.push({
          id: blockId,
          type: 'quote',
          content: line.substring(2),
          metadata: {},
          createdAt: now,
          updatedAt: now
        });
        continue;
      }

      // Code block start
      if (line.startsWith('```')) {
        const language = line.substring(3).trim() || 'text';
        blocks.push({
          id: blockId,
          type: 'code',
          content: '', // Will be filled by subsequent lines
          metadata: { language },
          createdAt: now,
          updatedAt: now
        });
        continue;
      }

      // Bullet list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        blocks.push({
          id: blockId,
          type: 'bullet-list',
          content: line.substring(2),
          metadata: { level: 0 },
          createdAt: now,
          updatedAt: now
        });
        continue;
      }

      // Numbered list
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        blocks.push({
          id: blockId,
          type: 'numbered-list',
          content: numberedMatch[2],
          metadata: { level: 0, number: parseInt(numberedMatch[1]) },
          createdAt: now,
          updatedAt: now
        });
        continue;
      }

      // Checklist
      const checklistMatch = line.match(/^-\s+\[([x\s])\]\s+(.*)$/);
      if (checklistMatch) {
        blocks.push({
          id: blockId,
          type: 'checklist',
          content: checklistMatch[2],
          metadata: { checked: checklistMatch[1] === 'x', level: 0 },
          createdAt: now,
          updatedAt: now
        });
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        blocks.push({
          id: blockId,
          type: 'horizontal-rule',
          content: '',
          metadata: {},
          createdAt: now,
          updatedAt: now
        });
        continue;
      }

      // Default to paragraph
      blocks.push({
        id: blockId,
        type: 'paragraph',
        content: line,
        metadata: {},
        createdAt: now,
        updatedAt: now
      });
    }

    return {
      blocks,
      currentBlockId: null
    };
  }

  private convertFromText(text: string): EditorState {
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    const blocks: any[] = [];
    let blockIdCounter = 0;

    for (const paragraph of paragraphs) {
      const blockId = `block-${++blockIdCounter}`;
      const now = new Date();

      blocks.push({
        id: blockId,
        type: 'paragraph',
        content: paragraph.trim(),
        metadata: {},
        createdAt: now,
        updatedAt: now
      });
    }

    return {
      blocks,
      currentBlockId: null
    };
  }

  // Utility methods for file management
  async createBackup(filename: string): Promise<string> {
    const content = await this.load(filename);
    if (!content) {
      throw new Error(`Document not found: ${filename}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${filename}.backup.${timestamp}`;
    
    await this.save(backupFilename, content);
    return backupFilename;
  }

  async getStorageStats(): Promise<{ totalFiles: number; totalSize: number; usage: string }> {
    const storageData = this.getStorageData();
    const totalFiles = Object.keys(storageData).length;
    const totalSize = JSON.stringify(storageData).length;
    
    return {
      totalFiles,
      totalSize,
      usage: `${(totalSize / 1024).toFixed(2)} KB`
    };
  }
}