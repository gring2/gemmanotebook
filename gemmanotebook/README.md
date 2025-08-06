# Gemma Notebook

A WYSIWYG note-taking application with AI assistance powered by Gemma3 SLM via Ollama.

## Features

### 📝 Block-Based Editor
- **Notion-like block system** with drag & drop support
- **Markdown shortcuts** for quick formatting
- **Rich text formatting**: Bold, italic, strikethrough, inline code, links
- **Multiple block types**:
  - Headings (H1-H6)
  - Paragraphs
  - Quotes/Blockquotes
  - Code blocks with syntax highlighting
  - Bullet lists
  - Numbered lists
  - Checklists with interactive checkboxes
  - Horizontal rules

### 🤖 AI Integration
- **Gemma3:27b model** via local Ollama installation
- **GitHub Copilot-style inline suggestions** - gray text appears as you type (Tab to accept, Esc to dismiss)
- **Context-aware auto-completion** based on document content
- **AI Chat interface** for assistance and guidance
- **Document composer** with human-in-the-loop feedback
- **Real-time writing assistance** with intelligent suggestions

### 💾 Local Storage
- **Auto-save functionality** with configurable intervals
- **Local file storage** using browser localStorage
- **Export/Import** support for JSON, Markdown, and plain text formats
- **Backup creation** and file management
- **No server required** - fully client-side application

### 🎨 User Experience
- **Clean, modern interface** with responsive design
- **Real-time collaboration** with AI
- **Keyboard shortcuts** for efficient editing
- **Status indicators** for save states and AI activity
- **Sidebar chat** for continuous AI assistance

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Ollama** installed and running
3. **Gemma3:27b model** pulled in Ollama

### Installing Ollama and Gemma3

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull Gemma3:27b model
ollama pull gemma3:27b

# Start Ollama service (runs on localhost:11434)
ollama serve
```

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd gemmanotebook
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open your browser** and navigate to `http://localhost:3000`

## Usage

### Basic Editing

1. **Create blocks**: Start typing in the editor to create paragraph blocks
2. **Use markdown shortcuts**:
   - `# Text` → Heading 1
   - `## Text` → Heading 2
   - `> Text` → Quote
   - ``` `Text` ``` → Code block
   - `- Text` → Bullet list
   - `1. Text` → Numbered list
   - `- [ ] Text` → Checklist
   - `---` → Horizontal rule

3. **Format text**:
   - `**bold**` → **bold**
   - `*italic*` → *italic*
   - `~~strikethrough~~` → ~~strikethrough~~
   - `` `code` `` → `code`
   - `[text](url)` → [link](url)

### AI Features

1. **Inline suggestions**: Start typing - gray suggestions appear automatically
   - Press **Tab** to accept the suggestion
   - Press **Esc** to dismiss the suggestion
   - Suggestions appear after you stop typing for a moment

2. **Chat with AI**: Use the sidebar chat to ask questions or request help
3. **Document composition**: Ask AI to generate content with phrases like:
   - "Write a paragraph about..."
   - "Generate a list of..."
   - "Help me create..."

4. **AI Command Palette**: Press **Ctrl+/** (or **Cmd+/**) for quick AI commands

### File Management

- **Auto-save**: Documents are automatically saved every 30 seconds
- **Manual save**: Press `Ctrl+S` (or `Cmd+S` on Mac)
- **Export**: Use the file storage API to export in different formats
- **Import**: Import existing markdown or text files

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
```

## Testing

### Unit Tests
```bash
npm run test
```

### End-to-End Tests (Playwright)
```bash
npx playwright test
```

## Project Structure

```
src/
├── editor/           # Block-based editor implementation
│   ├── Editor.ts     # Main editor class
│   ├── BlockFactory.ts  # Block creation and management
│   ├── BlockRenderer.ts # Block rendering to HTML
│   └── types.ts      # TypeScript type definitions
├── ai/               # AI integration
│   └── GemmaService.ts  # Ollama/Gemma3 API client
├── storage/          # Local file storage
│   └── FileStorage.ts   # localStorage-based file system
├── features/         # Feature implementations
│   └── AutoSave.ts   # Auto-save functionality
├── chat/             # AI chat interface
│   └── ChatInterface.ts # Chat UI and message handling
└── index.ts          # Application entry point
```

## Configuration

### Auto-save Settings
```typescript
const autoSaveOptions = {
  interval: 30000,      // 30 seconds
  filename: 'current.json',
  enabled: true,
  showStatus: true
};
```

### Gemma Service Settings
```typescript
const gemmaConfig = {
  baseUrl: 'http://localhost:11434/api',
  modelName: 'gemma3:27b',
  maxTokens: 512,
  temperature: 0.7
};
```

## Troubleshooting

### Common Issues

1. **Ollama not accessible**
   - Ensure Ollama is running: `ollama serve`
   - Check if the model is installed: `ollama list`
   - Verify the API is accessible: `curl http://localhost:11434/api/tags`

2. **Build errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript: `npm run type-check`

3. **Tests failing**
   - Update snapshots: `npm test -- --updateSnapshot`
   - Check browser compatibility for Playwright tests

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with TypeScript, Webpack, and Jest
- AI powered by Gemma3 via Ollama
- Inspired by Notion's block-based editing paradigm
- Tested with Playwright for end-to-end reliability