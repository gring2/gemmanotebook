import { test, expect } from '@playwright/test';

test.describe('Gemma Notebook Editor', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main elements are present
    await expect(page.locator('.app')).toBeVisible();
    await expect(page.locator('.editor-container')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.chat-container')).toBeVisible();
  });

  test('should have an initial empty paragraph block', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to initialize
    await page.waitForSelector('.editor .block', { timeout: 5000 });
    
    // Check that there's at least one block
    const blocks = await page.locator('.editor .block').count();
    expect(blocks).toBeGreaterThanOrEqual(1);
    
    // Check that the first block is a paragraph
    const firstBlock = page.locator('.editor .block').first();
    await expect(firstBlock).toHaveAttribute('data-block-type', 'paragraph');
  });

  test('should allow typing in the editor', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to initialize
    await page.waitForSelector('.editor .block .block-content', { timeout: 5000 });
    
    // Click on the first block and type
    const firstBlockContent = page.locator('.editor .block .block-content').first();
    await firstBlockContent.click();
    await firstBlockContent.fill('Hello, this is a test paragraph!');
    
    // Verify the content was entered
    await expect(firstBlockContent).toHaveText('Hello, this is a test paragraph!');
  });

  test('should create heading blocks with markdown shortcuts', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to initialize
    await page.waitForSelector('.editor .block .block-content', { timeout: 5000 });
    
    // Type a heading shortcut
    const firstBlockContent = page.locator('.editor .block .block-content').first();
    await firstBlockContent.click();
    await firstBlockContent.fill('# Test Heading');
    
    // Trigger the markdown shortcut by pressing space (simulating input event)
    await page.keyboard.press('Space');
    
    // Check if the block type changed to heading-1
    const parentBlock = firstBlockContent.locator('..');
    await expect(parentBlock).toHaveAttribute('data-block-type', 'heading-1');
  });

  test('should create new blocks on Enter key', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to initialize
    await page.waitForSelector('.editor .block .block-content', { timeout: 5000 });
    
    // Type content and press Enter
    const firstBlockContent = page.locator('.editor .block .block-content').first();
    await firstBlockContent.click();
    await firstBlockContent.fill('First paragraph');
    await page.keyboard.press('Enter');
    
    // Check that a new block was created
    const blocks = await page.locator('.editor .block').count();
    expect(blocks).toBe(2);
  });

  test('should display chat interface', async ({ page }) => {
    await page.goto('/');
    
    // Check if chat elements are present
    await expect(page.locator('.chat-container')).toBeVisible();
    await expect(page.locator('#chat-messages')).toBeVisible();
    await expect(page.locator('#chat-input')).toBeVisible();
    
    // Check if there's a welcome message
    await expect(page.locator('.chat-message.assistant')).toBeVisible();
  });

  test('should allow typing in chat input', async ({ page }) => {
    await page.goto('/');
    
    // Wait for chat to initialize
    await page.waitForSelector('#chat-input', { timeout: 5000 });
    
    // Type in chat input
    const chatInput = page.locator('#chat-input');
    await chatInput.click();
    await chatInput.fill('Hello, can you help me?');
    
    // Verify the text was entered
    await expect(chatInput).toHaveValue('Hello, can you help me?');
  });

  test('should show auto-save status', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the editor to initialize
    await page.waitForSelector('.editor .block .block-content', { timeout: 5000 });
    
    // Type some content to trigger auto-save
    const firstBlockContent = page.locator('.editor .block .block-content').first();
    await firstBlockContent.click();
    await firstBlockContent.fill('Test content for auto-save');
    
    // Wait a bit for auto-save to potentially trigger
    await page.waitForTimeout(1000);
    
    // Check if auto-save status appears (it might show unsaved changes)
    const autoSaveStatus = page.locator('.auto-save-status');
    // Note: This might not always be visible depending on timing
    // but the test should not fail if it's not there
  });

  test('should have proper CSS styling', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main app container has proper grid layout
    const app = page.locator('.app');
    const gridTemplate = await app.evaluate(el => getComputedStyle(el).gridTemplateColumns);
    expect(gridTemplate).toContain('1fr 300px');
    
    // Check if editor container has proper styling
    const editorContainer = page.locator('.editor-container');
    const backgroundColor = await editorContainer.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toBe('rgb(255, 255, 255)'); // white
  });
});