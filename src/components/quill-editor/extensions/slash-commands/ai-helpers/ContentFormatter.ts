// AI-powered content formatting utilities
import { OverlayManager } from '../ui/OverlayManager';

export class ContentFormatter {
  /**
   * Formats content with AI assistance
   */
  static async formatContentWithAI(quill: any, content: string, heading: string): Promise<string> {
    if (!quill) throw new Error('Quill instance not available');
    
    // Get markdown module to manage its state
    const markdownModule = quill.getModule('markdown');
    const wasEnabled = markdownModule?.options?.enabled || false;
    
    // Disable markdown processing during the operation to prevent interference
    if (markdownModule && markdownModule.options) {
      markdownModule.options.enabled = false;
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Reset abort flag
        OverlayManager.setOperationAborted(false);
        
        // Dispatch AI formatting event with the content
        const event = new CustomEvent('ai-format-pdf-content', {
          detail: {
            content,
            heading,
            formattingInstructions: `
Format your response using proper Markdown syntax following these guidelines:
1. Use proper paragraph breaks with a blank line between paragraphs
2. For bullet lists, use * with a space after it, and place each item on a new line
3. For numbered lists, use 1. 2. 3. with a space after the period
4. For nested lists, indent with 2 spaces (not tabs) before the * or number
5. For code blocks, use triple backticks (\`\`\`) on separate lines before and after the code
6. For inline code, surround with single backticks (\`)
7. For headings, use # with a space after it (## for heading 2, ### for heading 3)
8. For emphasis, use *italic* or **bold** without spaces between the asterisks and text
9. For blockquotes, use > with a space after it at the start of each line
10. For tables, follow this format:
| Column 1 | Column 2 |
| -------- | -------- |
| cell 1   | cell 2   |
`
          },
          bubbles: true
        });
        
        // One-time response handler
        const responseHandler = (event: any) => {
          // Remove the event listener first
          document.removeEventListener('ai-formatted-pdf-content-response', responseHandler);
          
          // If operation was aborted, reject
          if (OverlayManager.isOperationAborted()) {
            // Re-enable markdown processing if it was enabled
            if (markdownModule && markdownModule.options) {
              markdownModule.options.enabled = wasEnabled;
            }
            
            reject(new Error('Operation cancelled by user'));
            return;
          }
          
          const { formattedContent } = event.detail;
          
          // Re-enable markdown processing if it was enabled
          if (markdownModule && markdownModule.options) {
            markdownModule.options.enabled = wasEnabled;
          }
          
          resolve(formattedContent || content);
        };
        
        // Listen for the response event
        document.addEventListener('ai-formatted-pdf-content-response', responseHandler);
        
        // Dispatch the event to request processing
        document.dispatchEvent(event);
      } catch (error) {
        console.error('Error in formatContentWithAI:', error);
        
        // Re-enable markdown processing if it was enabled
        if (markdownModule && markdownModule.options) {
          markdownModule.options.enabled = wasEnabled;
        }
        
        reject(error);
      }
    });
  }
  
  /**
   * Generate title and summary for content using AI
   */
  static async generateTitleAndSummary(quill: any, content: string): Promise<{ heading: string, summary: string }> {
    try {
      // Check if we can access the AI generation functionality from the editor's parent component
      const aiGenerateEvent = new CustomEvent('ai-generate-section-summary', {
        detail: { content },
        bubbles: true
      });
      
      // Create a promise that will be resolved when the AI response is received
      const responsePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          document.removeEventListener('ai-section-summary-response', responseHandler);
          reject(new Error('AI response timeout'));
        }, 30000); // 30 second timeout
        
        const responseHandler = (event: any) => {
          clearTimeout(timeout);
          document.removeEventListener('ai-section-summary-response', responseHandler);
          resolve(event.detail);
        };
        
        document.addEventListener('ai-section-summary-response', responseHandler, { once: true });
      });
      
      // Dispatch the event to request AI processing
      quill.root.dispatchEvent(aiGenerateEvent);
      
      // Wait for the response
      const response: any = await responsePromise;
      
      return {
        heading: response.heading || 'Section Heading',
        summary: response.summary || 'Section summary not available.'
      };
    } catch (error) {
      console.error('Error generating title and summary:', error);
      
      // Fallback: Create basic heading and summary
      // Extract first 6-10 words for heading
      const words = content.split(/\s+/);
      const headingWords = words.slice(0, Math.min(8, words.length));
      let heading = headingWords.join(' ');
      
      // Capitalize first letter and add ellipsis if truncated
      heading = heading.charAt(0).toUpperCase() + heading.slice(1);
      if (words.length > 8) heading += '...';
      
      // First 2-3 sentences for summary
      const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      const summaryText = sentences.slice(0, Math.min(2, sentences.length)).join('. ');
      const summary = summaryText.trim() + (sentences.length > 2 ? '...' : '.');
      
      return { heading, summary };
    }
  }
  
  /**
   * Helper to manage Markdown processing and ensure re-rendering
   */
  static ensureMarkdownProcessed(quill: any): void {
    if (!quill) return;
    
    try {
      // Get the markdown module
      const markdownModule = quill.getModule('markdown');
      
      if (!markdownModule) {
        console.log('No markdown module found');
        return;
      }
      
      console.log('Ensuring markdown is processed');
      
      // First, make sure it's enabled
      if (markdownModule.options) {
        markdownModule.options.enabled = true;
      }
      
      // Try to force processing through different approaches
      
      // 1. If the module has a process function, call it
      if (typeof markdownModule.process === 'function') {
        try {
          console.log('Calling markdown process method');
          markdownModule.process();
        } catch (err) {
          console.error('Error calling markdown process method:', err);
        }
      }
      
      // 2. If the module has an activity with an onTextChange method, call it
      if (markdownModule.activity && typeof markdownModule.activity.onTextChange === 'function') {
        try {
          console.log('Calling markdown onTextChange method');
          markdownModule.activity.onTextChange();
        } catch (err) {
          console.error('Error calling markdown onTextChange method:', err);
        }
      }
      
      // 3. Force a small edit and undo it to trigger text-change event
      const range = quill.getSelection();
      if (range) {
        console.log('Triggering text-change with dummy edit');
        
        // Store the original content at this position
        const originalContent = quill.getText(range.index, 1);
        
        // Make a small change
        quill.insertText(range.index, ' ', 'api');
        
        // And undo it right away
        quill.deleteText(range.index, 1, 'api');
        
        // Restore anything we might have overwritten
        if (originalContent) {
          quill.insertText(range.index, originalContent, 'api');
        }
        
        // Reset selection
        quill.setSelection(range.index, 0);
      }
      
      console.log('Markdown processing completed');
    } catch (err) {
      console.error('Error in ensureMarkdownProcessed:', err);
    }
  }
  
  /**
   * Safe text insertion with debouncing
   */
  static safeInsertText(quill: any, index: number, text: string): void {
    if (!quill) return;
    
    // Get markdown module and ensure it's enabled
    const markdownModule = quill.getModule('markdown');
    const wasEnabled = markdownModule?.options?.enabled;
    
    try {
      // Insert with a small delay to make sure DOM has settled
      setTimeout(() => {
        try {
          // Insert the text
          quill.insertText(index, text, 'user');
          
          // Focus the editor
          quill.focus();
          
          // Set selection after the inserted text
          quill.setSelection(index + text.length, 0);
          
          // Add a small delay before processing markdown
          setTimeout(() => {
            // Explicitly trigger markdown processing after insertion
            ContentFormatter.ensureMarkdownProcessed(quill);
          }, 50);
          
          console.log('Text inserted successfully at position', index);
        } catch (error) {
          console.error('Error in delayed text insertion:', error);
        }
      }, 50);
    } catch (error) {
      console.error('Error in safeInsertText:', error);
    }
  }
} 