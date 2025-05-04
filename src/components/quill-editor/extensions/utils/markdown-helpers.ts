/**
 * Helper functions for dealing with markdown and Quill editor
 */

/**
 * Execute a callback with markdown temporarily disabled to prevent unintended parsing
 * This is especially important when manipulating content that might contain markdown syntax
 */
export function withDisabledMarkdown(quill: any, callback: () => void) {
  // Store reference to markdown module if it exists
  let markdownModule;
  try {
    markdownModule = quill.getModule('markdown');
  } catch (err) {
    // Markdown module might not be available
  }
  
  // If found, temporarily disable it
  if (markdownModule && typeof markdownModule.disable === 'function') {
    markdownModule.disable();
  }
  
  // Execute the callback
  try {
    callback();
  } finally {
    // Re-enable markdown module if it was disabled
    if (markdownModule && typeof markdownModule.enable === 'function') {
      markdownModule.enable();
    }
  }
}