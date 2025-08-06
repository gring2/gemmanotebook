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
export declare class ReferenceManager {
    private readonly STORAGE_KEY;
    private documents;
    private documentIdCounter;
    constructor();
    uploadFile(file: File): Promise<ReferenceDocument>;
    removeDocument(documentId: string): boolean;
    getDocument(documentId: string): ReferenceDocument | undefined;
    getAllDocuments(): ReferenceDocument[];
    getDocumentsContent(): string;
    getDocumentsSummary(): string;
    clearAllDocuments(): void;
    getStats(): {
        totalDocuments: number;
        totalSize: number;
        types: {
            text: number;
            markdown: number;
        };
    };
    private isValidFileType;
    private getFileType;
    private readFileContent;
    private loadReferences;
    private saveReferences;
    private formatFileSize;
    searchReferences(query: string): {
        document: ReferenceDocument;
        matchingLines: {
            lineNumber: number;
            content: string;
        }[];
    }[];
    getRelevantContent(contextKeywords: string[], maxLength?: number): string;
}
