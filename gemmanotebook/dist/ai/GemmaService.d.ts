export interface GenerationOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
}
export declare class GemmaService {
    private isConnected;
    private baseUrl;
    private modelName;
    initialize(): Promise<void>;
    generate(prompt: string, options?: GenerationOptions): Promise<string>;
    streamGenerate(prompt: string, callback: (text: string) => void, options?: GenerationOptions): Promise<void>;
    generateCompletion(currentText: string, context: string, referenceContext?: string): Promise<string>;
    generateFromChat(message: string, context?: string, referenceContext?: string): Promise<string>;
    generateStreamFromChat(message: string, callback: (text: string) => void, context?: string, referenceContext?: string): Promise<void>;
    composeDocument(instruction: string, context?: string, referenceContext?: string): Promise<string>;
    streamComposeDocument(instruction: string, callback: (text: string) => void, context?: string, referenceContext?: string): Promise<void>;
    isReady(): boolean;
    getModelInfo(): {
        name: string;
        baseUrl: string;
        connected: boolean;
    };
}
