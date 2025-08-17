# Test Assets

This directory contains test files used by the test suites.

## Files

- `test-image.png` - Small PNG test image for upload testing
- `test-image.jpg` - JPEG version for compatibility testing  
- `test-image1.png` - First image for multi-upload tests
- `test-image2.jpg` - Second image for multi-upload tests

## Usage

These files are referenced by:
- End-to-end tests in `tests/image-upload.spec.ts`
- Integration tests for file handling
- Manual testing workflows

The actual image files can be created by the test setup or mocked as needed.