// AI-powered content formatting utilities
import { OverlayManager } from '../ui/OverlayManager';
import { MARKDOWN_FORMATTING_INSTRUCTIONS } from '@/lib/utils/markdown-constants';
import { aiMarkdownToDelta, QuillOp } from '@/components/quill-editor/lib/utils/delta-utils';

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
            formattingInstructions: MARKDOWN_FORMATTING_INSTRUCTIONS
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
      
      const mainMarkdownModule = quill.getModule('markdown');
      const wasMainMarkdownEnabled = mainMarkdownModule?.options?.enabled || false;
      const quillJsMarkdownInstance = (quill as any).markdownModule;
      let originalQuillJsMarkdownProcess: (() => void) | undefined = undefined;
      if (quillJsMarkdownInstance && typeof quillJsMarkdownInstance.process === 'function') {
        originalQuillJsMarkdownProcess = quillJsMarkdownInstance.process;
      }
      
      try {
        // Convert incoming text (expected to be AI-generated Markdown) to Delta
        const deltaToInsert = aiMarkdownToDelta(text, quill);
        console.log('[ContentFormatter.safeInsertText] Raw Markdown for Delta conversion:\n', JSON.stringify(text));
        console.log('[ContentFormatter.safeInsertText] Generated Delta Ops:\n', JSON.stringify(deltaToInsert.ops, null, 2));

        // Prepare the update Delta - this assumes insertion at an index, not replacing a range.
        // If replacement is needed, a `delete` op would be required before `concat`.
        const updateDelta = new (quill.constructor.import('delta'))()
            .retain(index)
            .concat(deltaToInsert);

        // Disable markdown processing to prevent premature processing or interference
        if (mainMarkdownModule && mainMarkdownModule.options) {
          mainMarkdownModule.options.enabled = false;
        }
        if (quillJsMarkdownInstance && originalQuillJsMarkdownProcess) {
          quillJsMarkdownInstance.process = () => {
            console.log('[DIAGNOSTIC] ContentFormatter: (quill as any).markdownModule.process() neutered.');
          };
        }
        
        // Insert with adequate delay to ensure DOM has settled (original logic)
        // We will perform updateContents directly, then handle the rest.
        // setTimeout is problematic for Promise-based function like this.

        quill.updateContents(updateDelta, 'user');

        // Restore markdown processing states
        if (mainMarkdownModule && mainMarkdownModule.options && wasMainMarkdownEnabled) {
          mainMarkdownModule.options.enabled = true;
        }
        if (quillJsMarkdownInstance && originalQuillJsMarkdownProcess) {
          quillJsMarkdownInstance.process = originalQuillJsMarkdownProcess;
        }
            
        // Focus the editor (original logic, might need adjustment after Delta insert)
        quill.focus();
            
        // Set selection after the inserted text
        let insertedTextEquivalentLength = 0;
        deltaToInsert.ops.forEach((op: QuillOp) => { // Use QuillOp type
          if (typeof op.insert === 'string') {
            insertedTextEquivalentLength += op.insert.length;
          } else if (typeof op.insert === 'object') { 
            insertedTextEquivalentLength += 1;
          }
        });
        const targetIndex = Math.min(index + insertedTextEquivalentLength, quill.getLength());
        quill.setSelection(targetIndex, 0);
            
        console.log('[ContentFormatter.safeInsertText] Delta insertion completed. Markdown processing handled by listener.');
        resolve();
            
      } catch (error) {
        console.error('[ContentFormatter.safeInsertText] Error in Delta insertion:', error);
        // Restore markdown modules in case of error before resolve/reject
        if (mainMarkdownModule && mainMarkdownModule.options && wasMainMarkdownEnabled) {
          mainMarkdownModule.options.enabled = true;
        }
        if (quillJsMarkdownInstance && originalQuillJsMarkdownProcess) {
          quillJsMarkdownInstance.process = originalQuillJsMarkdownProcess;
        }
        reject(error);
      } 
      // Original setTimeout structure removed as updateContents is synchronous enough for Delta.
      // The main concern of the original setTimeout was DOM settling for plain text insertion and
      // subsequent markdown processing, which we are now handling more directly.
    });
  }
} 