export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export class GemmaService {
  private isConnected: boolean = false;
  private baseUrl: string = 'http://localhost:11434/api';
  private modelName: string = 'gemma3:12b';

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Gemma service...');
      
      // Check if Ollama is running
      const response = await fetch(`${this.baseUrl}/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API not accessible: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if gemma3:27b model is available
      const modelExists = data.models && data.models.some((model: any) => 
        model.name === this.modelName || model.name.startsWith('gemma3:27b')
      );
      
      if (!modelExists) {
        console.warn(`Model ${this.modelName} not found. Available models:`, data.models?.map((m: any) => m.name));
        throw new Error(`Model ${this.modelName} not found in Ollama. Please install it first with: ollama pull ${this.modelName}`);
      }
      
      this.isConnected = true;
      console.log('Gemma service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemma service:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async generate(prompt: string, options: GenerationOptions = {}): Promise<string> {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: prompt,
          stream: false,
          options: {
            num_predict: options.maxTokens || 256,
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.9,
            stop: options.stopSequences || []
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error('Text generation failed:', error);
      throw error;
    }
  }

  async streamGenerate(
    prompt: string, 
    callback: (text: string) => void, 
    options: GenerationOptions = {}
  ): Promise<void> {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: prompt,
          stream: true,
          options: {
            num_predict: options.maxTokens || 256,
            temperature: options.temperature || 0.7,
            top_p: options.topP || 0.9,
            stop: options.stopSequences || []
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Stream generation failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              callback(data.response);
            }
            if (data.done) {
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Stream generation failed:', error);
      throw error;
    }
  }

  async generateCompletion(currentText: string, context: string, referenceContext: string = ''): Promise<string> {
    // More focused prompt for inline completions like GitHub Copilot
    const fullContext = referenceContext 
      ? `${context}\n\n--- Reference Materials ---\n${referenceContext}`
      : context;

    const prompt = `You are an AI writing assistant. Based on the document context${referenceContext ? ' and reference materials' : ''}, provide a natural, concise continuation.

Document context:
${fullContext}

Current text being written: "${currentText}"

Continue the current text naturally. Provide ONLY the continuation text (no quotes, no repetition of the current text). Keep it to 1-10 words maximum. Be concise and relevant${referenceContext ? '. Use information from reference materials when relevant' : ''}:`;

    try {
      const completion = await this.generate(prompt, {
        maxTokens: 32, // Smaller for inline suggestions
        temperature: 0.2, // Lower temperature for more predictable suggestions
        stopSequences: ['\n', '.', '!', '?', '\r'] // Stop at sentence boundaries
      });

      // Clean up the completion
      let cleanedCompletion = completion.trim();
      
      // Remove any quotes or prefixes
      cleanedCompletion = cleanedCompletion.replace(/^["']|["']$/g, '');
      cleanedCompletion = cleanedCompletion.replace(/^(continue|completion|text):\s*/i, '');
      
      // Ensure it doesn't repeat the current text
      if (cleanedCompletion.toLowerCase().startsWith(currentText.toLowerCase())) {
        cleanedCompletion = cleanedCompletion.substring(currentText.length).trim();
      }

      return cleanedCompletion;
    } catch (error) {
      console.error('Auto-completion failed:', error);
      return '';
    }
  }

  async generateFromChat(message: string, context: string = '', referenceContext: string = ''): Promise<string> {
    const fullContext = context && referenceContext 
      ? `Document context: ${context}\n\nReference materials: ${referenceContext}`
      : context
      ? `Document context: ${context}`
      : referenceContext
      ? `Reference materials: ${referenceContext}`
      : '';

    const prompt = fullContext
      ? `${fullContext}

User message: ${message}

Provide a helpful response using the available context and reference materials:`
      : `User message: ${message}

Provide a helpful response:`;

    try {
      return await this.generate(prompt, {
        maxTokens: 512,
        temperature: 0.7
      });
    } catch (error) {
      console.error('Chat generation failed:', error);
      throw error;
    }
  }

  async generateStreamFromChat(
    message: string, 
    callback: (text: string) => void,
    context: string = '',
    referenceContext: string = ''
  ): Promise<void> {
    const fullContext = context && referenceContext 
      ? `Document context: ${context}\n\nReference materials: ${referenceContext}`
      : context
      ? `Document context: ${context}`
      : referenceContext
      ? `Reference materials: ${referenceContext}`
      : '';

    const prompt = fullContext
      ? `${fullContext}

User message: ${message}

Provide a helpful response using the available context and reference materials:`
      : `User message: ${message}

Provide a helpful response:`;

    try {
      await this.streamGenerate(prompt, callback, {
        maxTokens: 512,
        temperature: 0.7
      });
    } catch (error) {
      console.error('Streaming chat generation failed:', error);
      throw error;
    }
  }

  async composeDocument(instruction: string, context: string = '', referenceContext: string = ''): Promise<string> {
    const fullContext = context && referenceContext 
      ? `Document context: ${context}\n\nReference materials: ${referenceContext}`
      : context
      ? `Document context: ${context}`
      : referenceContext
      ? `Reference materials: ${referenceContext}`
      : '';

    const prompt = fullContext
      ? `${fullContext}

Instruction: ${instruction}

Generate content based on the instruction, incorporating relevant information from the provided context and reference materials:`
      : `Instruction: ${instruction}

Generate content based on the instruction:`;

    try {
      return await this.generate(prompt, {
        maxTokens: 1024,
        temperature: 0.6
      });
    } catch (error) {
      console.error('Document composition failed:', error);
      throw error;
    }
  }

  async streamComposeDocument(
    instruction: string, 
    callback: (text: string) => void,
    context: string = '',
    referenceContext: string = ''
  ): Promise<void> {
    const fullContext = context && referenceContext 
      ? `Document context: ${context}\n\nReference materials: ${referenceContext}`
      : context
      ? `Document context: ${context}`
      : referenceContext
      ? `Reference materials: ${referenceContext}`
      : '';

    const prompt = fullContext
      ? `${fullContext}

Instruction: ${instruction}

Generate content based on the instruction, incorporating relevant information from the provided context and reference materials:`
      : `Instruction: ${instruction}

Generate content based on the instruction:`;

    try {
      await this.streamGenerate(prompt, callback, {
        maxTokens: 1024,
        temperature: 0.6
      });
    } catch (error) {
      console.error('Streaming document composition failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  getModelInfo(): { name: string; baseUrl: string; connected: boolean } {
    return {
      name: this.modelName,
      baseUrl: this.baseUrl,
      connected: this.isConnected
    };
  }
}