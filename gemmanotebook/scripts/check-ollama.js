#!/usr/bin/env node

/**
 * Check if Ollama is running and Gemma3:27b model is available
 */

const http = require('http');

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL_NAME = 'gemma3:27b';

function checkOllamaService() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${OLLAMA_BASE_URL}/api/tags`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error('Failed to parse Ollama response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Failed to connect to Ollama: ${error.message}`));
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Ollama connection timeout'));
    });
  });
}

async function main() {
  console.log('🔍 Checking Ollama setup...\n');

  try {
    // Check if Ollama is running
    console.log('1. Checking Ollama service...');
    const response = await checkOllamaService();
    console.log('   ✅ Ollama is running');

    // Check if models are available
    console.log('2. Checking available models...');
    if (!response.models || response.models.length === 0) {
      console.log('   ❌ No models found');
      console.log('   💡 Please install Gemma3:27b with: ollama pull gemma3:27b');
      process.exit(1);
    }

    console.log(`   📦 Found ${response.models.length} model(s):`);
    response.models.forEach(model => {
      console.log(`      - ${model.name}`);
    });

    // Check for Gemma3:27b specifically
    console.log('3. Checking for Gemma3:27b model...');
    const hasGemma = response.models.some(model => 
      model.name === MODEL_NAME || model.name.startsWith('gemma3:27b')
    );

    if (hasGemma) {
      console.log('   ✅ Gemma3:27b model is available');
      console.log('\n🎉 Everything looks good! You can start the application.');
    } else {
      console.log('   ❌ Gemma3:27b model not found');
      console.log('   💡 Please install it with: ollama pull gemma3:27b');
      process.exit(1);
    }

  } catch (error) {
    console.log('   ❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure Ollama is installed: https://ollama.ai/');
    console.log('   2. Start Ollama service: ollama serve');
    console.log('   3. Install Gemma3:27b: ollama pull gemma3:27b');
    process.exit(1);
  }
}

// Add the check-ollama script to package.json
const fs = require('fs');
const path = require('path');

try {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts['check-ollama']) {
    packageJson.scripts['check-ollama'] = 'node scripts/check-ollama.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Added check-ollama script to package.json');
  }
} catch (error) {
  // Ignore if we can't update package.json
}

main();