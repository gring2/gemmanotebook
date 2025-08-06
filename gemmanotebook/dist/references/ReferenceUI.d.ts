import { ReferenceManager } from './ReferenceManager';
export declare class ReferenceUI {
    private referenceManager;
    private container;
    private isExpanded;
    constructor(container: HTMLElement, referenceManager: ReferenceManager);
    private createUI;
    private setupEventListeners;
    private toggleExpanded;
    private handleFileUpload;
    private updateUI;
    private updateReferencesList;
    private createDocumentElement;
    private updateStats;
    private updateCount;
    private removeDocument;
    private showDocumentPreview;
    private showNotification;
    private formatFileSize;
    refresh(): void;
    expandSection(): void;
    getReferencesCount(): number;
}
