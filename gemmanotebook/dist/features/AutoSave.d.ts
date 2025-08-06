import { Editor } from '@/editor/Editor';
import { FileStorage } from '@/storage/FileStorage';
export interface AutoSaveOptions {
    interval: number;
    filename: string;
    enabled: boolean;
    showStatus: boolean;
}
export declare class AutoSave {
    private editor;
    private fileStorage;
    private options;
    private saveTimer;
    private lastSaveTime;
    private hasUnsavedChanges;
    private isInitialized;
    constructor(editor: Editor, fileStorage: FileStorage, options?: Partial<AutoSaveOptions>);
    private initialize;
    private handleEditorChange;
    private handleVisibilityChange;
    private handleBeforeUnload;
    private startAutoSave;
    private restartAutoSave;
    saveNow(): Promise<void>;
    enable(): void;
    disable(): void;
    setInterval(interval: number): void;
    setFilename(filename: string): void;
    getStatus(): {
        enabled: boolean;
        interval: number;
        filename: string;
        lastSaveTime: Date | null;
        hasUnsavedChanges: boolean;
    };
    private updateSaveStatus;
    destroy(): void;
    manualSave(filename?: string): Promise<void>;
}
