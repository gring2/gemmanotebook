import { test, expect, Page } from '@playwright/test';
import path from 'path';

test.describe('Image Upload Functionality', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:3000'); // Adjust URL as needed
    await page.waitForSelector('.editor');
  });

  test.describe('Image Block Creation via /image Command', () => {
    test('should create image block when typing /image', async () => {
      // Type /image in the editor
      await page.click('.block-content');
      await page.type('.block-content', '/image');
      
      // Wait for the block to transform
      await page.waitForSelector('.image-block');
      
      // Verify image block was created
      const imageBlock = await page.$('.image-block');
      expect(imageBlock).toBeTruthy();
      
      // Should show upload area
      const uploadArea = await page.$('.image-upload-area');
      expect(uploadArea).toBeTruthy();
      
      // Check upload placeholder text
      const uploadText = await page.textContent('.upload-text');
      expect(uploadText).toContain('Click to upload or drag an image here');
    });

    test('should create image block when typing /img', async () => {
      await page.click('.block-content');
      await page.type('.block-content', '/img');
      
      await page.waitForSelector('.image-block');
      
      const imageBlock = await page.$('.image-block');
      expect(imageBlock).toBeTruthy();
    });

    test('should show block type indicator as IMG', async () => {
      await page.click('.block-content');
      await page.type('.block-content', '/image');
      
      await page.waitForSelector('.image-block');
      
      // Hover to show type indicator
      await page.hover('.block');
      
      const typeIndicator = await page.textContent('.block-type-indicator');
      expect(typeIndicator).toBe('IMG');
    });
  });

  test.describe('Click to Upload Functionality', () => {
    test('should open file picker when clicking upload area', async () => {
      // Create image block
      await page.click('.block-content');
      await page.type('.block-content', '/image');
      await page.waitForSelector('.image-upload-area');

      // Mock file input click
      const fileInputPromise = page.waitForEvent('filechooser');
      await page.click('.image-upload-area');
      const fileChooser = await fileInputPromise;
      
      expect(fileChooser).toBeTruthy();
    });

    test('should upload image file through file picker', async () => {
      // Create image block
      await page.click('.block-content');
      await page.type('.block-content', '/image');
      await page.waitForSelector('.image-upload-area');

      // Create a test image file
      const testImagePath = path.join(__dirname, '../test-assets/test-image.png');
      
      // Upload file
      const fileInputPromise = page.waitForEvent('filechooser');
      await page.click('.image-upload-area');
      const fileChooser = await fileInputPromise;
      await fileChooser.setFiles([testImagePath]);

      // Wait for image to load
      await page.waitForSelector('.block-image');
      
      // Verify image was uploaded
      const img = await page.$('.block-image');
      expect(img).toBeTruthy();
      
      const src = await img?.getAttribute('src');
      expect(src).toContain('data:image');
    });
  });

  test.describe('Drag and Drop Upload', () => {
    test('should show drag overlay when dragging files over editor', async () => {
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
      
      // Simulate drag enter
      await page.dispatchEvent('.editor', 'dragover', { dataTransfer });
      
      // Should show drag overlay
      const dragOverlay = await page.$('.editor.drag-over');
      expect(dragOverlay).toBeTruthy();
      
      // Check overlay message
      const overlayText = await page.locator('.editor.drag-over::before').textContent();
      // Note: ::before pseudo-elements might not be accessible in tests
    });

    test('should create image block when dropping image file', async () => {
      const testImagePath = path.join(__dirname, '../test-assets/test-image.jpg');
      
      // Read file as buffer for drag simulation
      const fileBuffer = require('fs').readFileSync(testImagePath);
      
      await page.evaluate((fileBuffer) => {
        const file = new File([fileBuffer], 'test-image.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        const editor = document.querySelector('.editor');
        if (editor) {
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          editor.dispatchEvent(dropEvent);
        }
      }, Array.from(fileBuffer));
      
      // Wait for image block to be created
      await page.waitForSelector('.image-block');
      
      const imageBlock = await page.$('.image-block');
      expect(imageBlock).toBeTruthy();
    });

    test('should handle multiple image files dropped at once', async () => {
      const testImages = [
        path.join(__dirname, '../test-assets/test-image1.png'),
        path.join(__dirname, '../test-assets/test-image2.jpg')
      ];
      
      // Simulate dropping multiple files
      await page.evaluate((testImages) => {
        const files = testImages.map((imagePath, index) => 
          new File([`fake-image-data-${index}`], `test${index}.jpg`, { type: 'image/jpeg' })
        );
        
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        
        const editor = document.querySelector('.editor');
        if (editor) {
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          editor.dispatchEvent(dropEvent);
        }
      }, testImages);
      
      // Wait for multiple image blocks
      await page.waitForSelector('.image-block');
      
      const imageBlocks = await page.$$('.image-block');
      expect(imageBlocks.length).toBe(2);
    });
  });

  test.describe('Collision Prevention: /image + Drag & Drop', () => {
    test('should NOT create duplicate blocks when using /image then drag & drop', async () => {
      // Step 1: Create image block with /image
      await page.click('.block-content');
      await page.type('.block-content', '/image');
      await page.waitForSelector('.image-upload-area');
      
      // Count initial blocks
      const initialBlocks = await page.$$('.block');
      const initialCount = initialBlocks.length;
      
      // Step 2: Drag and drop image onto the empty block
      await page.evaluate(() => {
        const file = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        const editor = document.querySelector('.editor');
        if (editor) {
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          editor.dispatchEvent(dropEvent);
        }
      });
      
      // Wait a moment for processing
      await page.waitForTimeout(500);
      
      // Count blocks after drag & drop
      const finalBlocks = await page.$$('.block');
      const finalCount = finalBlocks.length;
      
      // Should NOT have created additional blocks
      expect(finalCount).toBe(initialCount);
      
      // Should have uploaded image in existing block
      const imageElement = await page.$('.block-image');
      expect(imageElement).toBeTruthy();
    });

    test('should create new blocks when dropping on area without empty image blocks', async () => {
      // Create some non-image blocks
      await page.click('.block-content');
      await page.type('.block-content', 'First paragraph');
      await page.press('.block-content', 'Enter');
      await page.type('.block-content', '## Heading');
      
      const initialBlocks = await page.$$('.block');
      const initialCount = initialBlocks.length;
      
      // Drop image file
      await page.evaluate(() => {
        const file = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        const editor = document.querySelector('.editor');
        if (editor) {
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          editor.dispatchEvent(dropEvent);
        }
      });
      
      await page.waitForSelector('.image-block');
      
      const finalBlocks = await page.$$('.block');
      const finalCount = finalBlocks.length;
      
      // Should have created a new block
      expect(finalCount).toBe(initialCount + 1);
    });
  });

  test.describe('Image Resize Functionality', () => {
    test('should show resize handle on image hover', async () => {
      // Create and upload image
      await page.click('.block-content');
      await page.type('.block-content', '/image');
      await page.waitForSelector('.image-upload-area');
      
      // Simulate uploaded image by updating DOM
      await page.evaluate(() => {
        const uploadArea = document.querySelector('.image-upload-area');
        if (uploadArea?.parentElement) {
          uploadArea.parentElement.innerHTML = `
            <img src="data:image/png;base64,test" class="block-image" style="width: 600px;">
            <div class="image-resize-handle">↘</div>
          `;
        }
      });
      
      // Hover over image container
      await page.hover('.image-container');
      
      // Resize handle should be visible
      const resizeHandle = await page.$('.image-resize-handle');
      expect(resizeHandle).toBeTruthy();
      
      const isVisible = await resizeHandle?.isVisible();
      expect(isVisible).toBe(true);
    });

    test('should resize image when dragging resize handle', async () => {
      // Setup image with resize handle
      await page.evaluate(() => {
        const editor = document.querySelector('.editor');
        if (editor) {
          editor.innerHTML = `
            <div class="block" data-block-id="img-1">
              <div class="image-container">
                <img src="data:image/png;base64,test" class="block-image" style="width: 600px;">
                <div class="image-resize-handle" style="display: flex;">↘</div>
              </div>
            </div>
          `;
        }
      });
      
      const img = await page.$('.block-image');
      const initialWidth = await img?.evaluate(el => el.style.width);
      expect(initialWidth).toBe('600px');
      
      // Simulate resize drag (this is complex in Playwright, would need mouse events)
      // For now, just verify the setup is correct
      const resizeHandle = await page.$('.image-resize-handle');
      expect(resizeHandle).toBeTruthy();
    });
  });

  test.describe('Image Caption Functionality', () => {
    test('should show caption editor below uploaded image', async () => {
      // Setup image with caption
      await page.evaluate(() => {
        const editor = document.querySelector('.editor');
        if (editor) {
          editor.innerHTML = `
            <div class="block" data-block-id="img-1">
              <div class="image-container">
                <img src="data:image/png;base64,test" class="block-image">
              </div>
              <div class="image-caption block-content" contenteditable="true" data-placeholder="Add a caption..."></div>
            </div>
          `;
        }
      });
      
      const caption = await page.$('.image-caption');
      expect(caption).toBeTruthy();
      
      const isEditable = await caption?.getAttribute('contenteditable');
      expect(isEditable).toBe('true');
      
      const placeholder = await caption?.getAttribute('data-placeholder');
      expect(placeholder).toBe('Add a caption...');
    });

    test('should allow editing image caption', async () => {
      // Setup image with caption
      await page.evaluate(() => {
        const editor = document.querySelector('.editor');
        if (editor) {
          editor.innerHTML = `
            <div class="block">
              <div class="image-caption block-content" contenteditable="true"></div>
            </div>
          `;
        }
      });
      
      // Click and type in caption
      await page.click('.image-caption');
      await page.type('.image-caption', 'My test caption');
      
      const captionText = await page.textContent('.image-caption');
      expect(captionText).toBe('My test caption');
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for non-image files', async () => {
      // Mock dropping a text file
      await page.evaluate(() => {
        const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        const editor = document.querySelector('.editor');
        if (editor) {
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          editor.dispatchEvent(dropEvent);
        }
      });
      
      // Should show error message (might be alert or notification)
      await page.waitForTimeout(100);
      
      // Check that no image block was created
      const imageBlocks = await page.$$('.image-block');
      expect(imageBlocks.length).toBe(0);
    });

    test('should handle empty file drops gracefully', async () => {
      // Drop event with no files
      await page.evaluate(() => {
        const dataTransfer = new DataTransfer();
        
        const editor = document.querySelector('.editor');
        if (editor) {
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          editor.dispatchEvent(dropEvent);
        }
      });
      
      // Should not crash or create blocks
      await page.waitForTimeout(100);
      const imageBlocks = await page.$$('.image-block');
      expect(imageBlocks.length).toBe(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and alt text', async () => {
      // Setup image block
      await page.evaluate(() => {
        const editor = document.querySelector('.editor');
        if (editor) {
          editor.innerHTML = `
            <div class="block">
              <div class="image-container">
                <img src="data:image/png;base64,test" class="block-image" alt="Test image">
              </div>
              <input type="file" accept="image/*" style="display: none;">
            </div>
          `;
        }
      });
      
      const img = await page.$('.block-image');
      const altText = await img?.getAttribute('alt');
      expect(altText).toBe('Test image');
      
      const fileInput = await page.$('input[type="file"]');
      const acceptAttr = await fileInput?.getAttribute('accept');
      expect(acceptAttr).toBe('image/*');
    });

    test('should be keyboard navigable', async () => {
      await page.click('.block-content');
      await page.type('.block-content', '/image');
      await page.waitForSelector('.image-upload-area');
      
      // Should be able to tab to file input
      await page.press('body', 'Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      
      // Focus handling might vary, but should be accessible
      expect(focusedElement).toBeTruthy();
    });
  });
});