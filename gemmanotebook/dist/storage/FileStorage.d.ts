import { EditorState } from '@/editor/types';
export interface FileMetadata {
    name: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    size: number;
}
export declare class FileStorage {
    private readonly storageKey;
    private readonly metadataKey;
    save(filename: string, content: EditorState): Promise<void>;
    load(filename: string): Promise<EditorState | null>;
    delete(filename: string): Promise<void>;
    exists(filename: string): Promise<boolean>;
    list(): Promise<FileMetadata[]>;
    export(filename: string, format?: 'json' | 'markdown' | 'text'): Promise<string>;
    import(filename: string, data: string, format?: 'json' | 'markdown' | 'text'): Promise<void>;
    private getStorageData;
    private getMetadata;
    private updateMetadata;
    private removeMetadata;
    private convertToMarkdown;
    private convertToText;
    private convertFromMarkdown;
    private convertFromText;
    createBackup(filename: string): Promise<string>;
    getStorageStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        usage: string;
    }>;
}
