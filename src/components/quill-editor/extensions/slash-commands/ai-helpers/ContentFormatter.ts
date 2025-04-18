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
4. For nested lists, indent with 1 space (not tabs) before the * or number
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
   * Safe text insertion with improved markdown handling
   */
  static safeInsertText(quill: any, index: number, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!quill) {
        reject(new Error('Quill not available'));
        return;
      }
      
      // Get markdown module and track its state
      const markdownModule = quill.getModule('markdown');
      const wasEnabled = markdownModule?.options?.enabled || false;
      
      try {
        // Temporarily disable markdown processing to prevent premature processing
        if (markdownModule && markdownModule.options) {
          markdownModule.options.enabled = false;
        }
        
        // Ensure proper line breaks for lists to improve markdown parsing
        let processedText = text;
        
        // Insert with adequate delay to ensure DOM has settled
        setTimeout(() => {
          try {
            // Check if the editor is still valid
            if (!quill || !quill.root) {
              console.error('Quill editor is no longer valid');
              reject(new Error('Quill editor not available'));
              return;
            }
            
            // Ensure the index is valid
            const length = quill.getLength();
            if (index < 0 || index > length) {
              console.warn(`Invalid insertion index: ${index}, adjusting to valid range`);
              index = Math.max(0, Math.min(index, length));
            }
            
            // Preserve and save the selection
            const originalRange = quill.getSelection();
            
            // Insert the processed text
            quill.insertText(index, processedText, 'user');
            
            // Focus the editor
            quill.focus();
            
            // Set selection after the inserted text
            const targetIndex = Math.min(index + processedText.length, quill.getLength());
            quill.setSelection(targetIndex, 0);
            
            // Re-enable markdown processing (if it was disabled - which it isn't currently)
            if (markdownModule && markdownModule.options && wasEnabled) {
              markdownModule.options.enabled = true;
            }
            
            // Markdown processing is handled by the editor-change listener setup in use-editor-setup
            // No need to call ensureMarkdownProcessed here
            /*
            setTimeout(() => {
              // Process markdown - REMOVED
              // ContentFormatter.ensureMarkdownProcessed(quill);
              
              // Restore selection if needed
              if (originalRange) {
                // Ensure the index is still valid before setting selection
                const currentLength = quill.getLength();
                const targetIndex = Math.min(index + processedText.length, currentLength);
                quill.setSelection(targetIndex, 0);
              }
              
              // Mark as complete
              console.log('Text insertion and markdown processing completed');
              resolve();
            }, 150); // Single processing delay
            */
           
            // Resolve immediately after insertion
            console.log('Text insertion completed. Markdown processing handled by listener.');
            resolve();
            
          } catch (error) {
            console.error('Error in text insertion:', error);
            
            // Try a fallback insertion method
            try {
              console.log('Attempting fallback insertion method');
              
              // Re-enable markdown (if it was disabled)
              if (markdownModule && markdownModule.options && wasEnabled) {
                markdownModule.options.enabled = true;
              }
              
              // Get the current selection
              const range = quill.getSelection();
              if (range) {
                // Insert at current selection
                quill.insertText(range.index, processedText, 'user');
                quill.setSelection(range.index + processedText.length, 0);
              } else {
                // Insert at beginning
                quill.insertText(0, processedText, 'user');
                quill.setSelection(processedText.length, 0);
              }
              
              // Markdown processing is handled by the editor-change listener
              // No need for explicit calls here
              /*
              ContentFormatter.ensureMarkdownProcessed(quill);
              setTimeout(() => {
                ContentFormatter.ensureMarkdownProcessed(quill);
                resolve();
              }, 100);
              */
             
              console.log('Fallback insertion completed. Markdown processing handled by listener.');
              resolve(); // Resolve after successful fallback insertion
              
            } catch (fallbackError) {
              console.error('Fallback insertion also failed:', fallbackError);
              reject(fallbackError);
            }
          }
        }, 100); // Initial insertion delay
      } catch (error) {
        console.error('Error in safeInsertText setup:', error);
        
        // Re-enable markdown processing if it was enabled
        if (markdownModule && markdownModule.options) {
          markdownModule.options.enabled = wasEnabled;
        }
        
        reject(error);
      }
    });
  }
} 