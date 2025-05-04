// PDF processing utilities
import { ContentFormatter } from '../ai-helpers/ContentFormatter';
import { ProcessedSection, OverlayControls } from '../interfaces';
import { OverlayManager } from '../ui/OverlayManager';
import SectionsDialog from './SectionsDialog';
import { extractFullTextFromFile } from '@/lib/hooks/use-pdf-extractor';

const API_CALL_DELAY = 1000; // 1 second delay between processing sections

export class PdfProcessor {
  // Initialize event listeners for the PDF processing events
  static initializeEventListeners() {
    // Track active insertions to prevent duplicates
    const activeInsertions = new Set();
    
    // Listen for processing a single section (sequential processing)
    document.addEventListener('pdf-process-section', async (event: any) => {
      const { section, quill, range, onComplete } = event.detail;
      
      try {
        section.loadingIndicator.textContent = 'Waiting...';
        section.loadingIndicator.className = 'pdf-loading-indicator queued';
        
        // Add delay before processing
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY));
        
        section.loadingIndicator.textContent = 'Analyzing...';
        section.loadingIndicator.className = 'pdf-loading-indicator processing';
        
        // Limit content size more aggressively
        const contentToProcess = section.content.substring(0, 2000); // Reduced from 3000
        
        // Dispatch the event to be handled by use-event-handlers
        const aiGenerateEvent = new CustomEvent('ai-generate-section-summary', {
          detail: { content: contentToProcess },
          bubbles: true
        });
        
        // Register one-time response handler for the AI event dispatched from use-event-handlers
        const responseHandler = (responseEvent: any) => {
          try {
            // Process the response received from use-event-handlers
            const { heading, summary } = responseEvent.detail;
            section.heading = heading || 'Untitled Section';
            section.summary = summary || 'No summary available';
            
            // Update UI with the results
            section.loadingIndicator.textContent = 'Analysis complete';
            section.loadingIndicator.className = 'pdf-loading-indicator success';
            section.loadingIndicator.style.color = '#4ade80';
            
            // Clear existing content
            while (section.contentContainer.firstChild) {
              section.contentContainer.removeChild(section.contentContainer.firstChild);
            }
            
            // Add heading
            const headingEl = document.createElement('h4');
            headingEl.textContent = heading;
            headingEl.style.margin = '0 0 8px 0';
            headingEl.style.color = '#fff';
            section.contentContainer.appendChild(headingEl);
            
            // Add summary
            const summaryEl = document.createElement('p');
            summaryEl.textContent = summary;
            summaryEl.style.margin = '0 0 8px 0';
            summaryEl.style.color = '#bbb';
            section.contentContainer.appendChild(summaryEl);
            
            // Add content preview
            const contentPreview = document.createElement('div');
            contentPreview.textContent = section.content.substring(0, 150) + '...';
            contentPreview.style.fontSize = '13px';
            contentPreview.style.color = '#999';
            section.contentContainer.appendChild(contentPreview);
            
            // Re-add the fade effect
            const fadeEffect = document.createElement('div');
            fadeEffect.className = 'pdf-section-fade';
            fadeEffect.style.position = 'absolute';
            fadeEffect.style.bottom = '0';
            fadeEffect.style.left = '0';
            fadeEffect.style.width = '100%';
            fadeEffect.style.height = '50px';
            fadeEffect.style.background = 'linear-gradient(to bottom, rgba(42, 42, 42, 0), rgba(42, 42, 42, 1))';
            section.contentContainer.appendChild(fadeEffect);
            
            // Call the completion callback
            if (onComplete) {
              onComplete();
            }
          } catch (error) {
            console.error('Error processing AI response:', error);
            handleProcessingError();
          }
        };
        
        // Setup error fallback
        const handleProcessingError = () => {
          // Create a fallback heading and summary
          const words = section.content.split(/\s+/);
          const headingWords = words.slice(0, Math.min(8, words.length));
          let heading = headingWords.join(' ');
          
          // Capitalize first letter and add ellipsis if truncated
          heading = heading.charAt(0).toUpperCase() + heading.slice(1);
          if (words.length > 8) heading += '...';
          
          // First 2-3 sentences for summary
          const sentences = section.content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
          const summaryText = sentences.slice(0, Math.min(2, sentences.length)).join('. ');
          const summary = summaryText.trim() + (sentences.length > 2 ? '...' : '.');
          
          // Set the fallback values
          section.heading = heading;
          section.summary = summary;
          
          // Update UI to show completion
          section.loadingIndicator.textContent = 'Using fallback summary';
          section.loadingIndicator.className = 'pdf-loading-indicator warning';
          section.loadingIndicator.style.color = '#f59e0b';
          
          // Clear existing content
          while (section.contentContainer.firstChild) {
            section.contentContainer.removeChild(section.contentContainer.firstChild);
          }
          
          // Add heading
          const headingEl = document.createElement('h4');
          headingEl.textContent = heading;
          headingEl.style.margin = '0 0 8px 0';
          headingEl.style.color = '#fff';
          section.contentContainer.appendChild(headingEl);
          
          // Add summary
          const summaryEl = document.createElement('p');
          summaryEl.textContent = summary;
          summaryEl.style.margin = '0 0 8px 0';
          summaryEl.style.color = '#bbb';
          section.contentContainer.appendChild(summaryEl);
          
          // Add content preview
          const contentPreview = document.createElement('div');
          contentPreview.textContent = section.content.substring(0, 150) + '...';
          contentPreview.style.fontSize = '13px';
          contentPreview.style.color = '#999';
          section.contentContainer.appendChild(contentPreview);
          
          // Re-add the fade effect
          const fadeEffect = document.createElement('div');
          fadeEffect.className = 'pdf-section-fade';
          fadeEffect.style.position = 'absolute';
          fadeEffect.style.bottom = '0';
          fadeEffect.style.left = '0';
          fadeEffect.style.width = '100%';
          fadeEffect.style.height = '50px';
          fadeEffect.style.background = 'linear-gradient(to bottom, rgba(42, 42, 42, 0), rgba(42, 42, 42, 1))';
          section.contentContainer.appendChild(fadeEffect);
          
          // Call the completion callback
          if (onComplete) {
            onComplete();
          }
        };
        
        // Set up timeout to handle AI response failures
        const responseTimeout = setTimeout(() => {
          document.removeEventListener('ai-section-summary-response', responseHandler);
          console.warn('AI response timeout, using fallback');
          handleProcessingError();
        }, 15000);
        
        // Listen once for the response event dispatched by use-event-handlers
        document.addEventListener('ai-section-summary-response', (event) => {
          clearTimeout(responseTimeout);
          responseHandler(event);
        }, { once: true });
        
        // Dispatch the event to trigger the handler in use-event-handlers
        document.dispatchEvent(aiGenerateEvent);
        
      } catch (error) {
        console.error('Error in pdf-process-section:', error);
        section.loadingIndicator.textContent = 'Error';
        section.loadingIndicator.className = 'pdf-loading-indicator error';
        section.loadingIndicator.style.color = '#ef4444';
        
        // Still call completion callback to move the queue forward
        if (onComplete) {
          onComplete();
        }
      }
    });
    
    // Listen for the final insertion request from use-event-handlers
    document.addEventListener('pdf-insert-final-content', (event: any) => {
      const { content, range, quill } = event.detail;
      this.insertSectionContent(quill, content, range); // Use the existing method for actual insertion
    });

    // Listen for content insertion request (handled by insertSectionContent)
    document.addEventListener('pdf-insert-content', (event: any) => {
      const { content, range, quill } = event.detail;
      this.insertSectionContent(quill, content, range);
    });
    
    // REMOVE Deprecated Listeners
    /*
    document.addEventListener('pdf-process-sections', (event: any) => {
      console.warn('pdf-process-sections event is deprecated, use pdf-process-section instead');
    });
    document.addEventListener('pdf-insert-enhanced', (event: any) => {
      const { heading, summary, content, range, quill } = event.detail;
       // We now trigger the new flow via the button's 'pdf-insert-with-summary' dispatch
       // This listener is essentially redundant for new clicks, but kept for potential legacy calls.
       // Ideally, we'd refactor to remove this if no longer needed.
      console.warn('pdf-insert-enhanced is deprecated. Use the section dialog insert button.');
       // Trigger the new handler indirectly if possible (though direct call might be needed if context is lost)
       const insertEvent = new CustomEvent('pdf-insert-with-summary', { detail: event.detail, bubbles: true });
       document.dispatchEvent(insertEvent);
    });
    document.addEventListener('pdf-insert-sections', (event: any) => {
      const { sections, range, quill } = event.detail;
       // This now uses the 'pdf-insert-formatted-combined' flow triggered by the button
       // Kept for legacy, but should ideally be removed.
       console.warn('pdf-insert-sections is deprecated. Use the section dialog insert button.');
       const insertEvent = new CustomEvent('pdf-insert-formatted-combined', { detail: event.detail, bubbles: true });
       document.dispatchEvent(insertEvent);
    });
    */

    console.log('SectionsDialog initialized:', SectionsDialog ? 'Yes' : 'No');
  }
  
  /**
   * Handle PDF upload and processing
   */
  static handlePdfUpload(quill: any, range: any): void {
    // Initialize event listeners if needed
    this.initializeEventListeners();
    
    console.log('Handling PDF upload', { range });
    
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        console.log('No file selected');
        document.body.removeChild(fileInput);
        return;
      }
      
      console.log('PDF file selected:', file);
      
      // Show loading overlay
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'pdf-loading-overlay';
      const spinner = document.createElement('div');
      spinner.className = 'pdf-spinner';
      loadingOverlay.appendChild(spinner);
      document.body.appendChild(loadingOverlay);
      
      try {
        // Process the PDF
        await PdfProcessor.processPdf(quill, file, range);
      } catch (error) {
        console.error('Error processing PDF:', error);
        
        // Show error message to user
        const errorToast = document.createElement('div');
        errorToast.className = 'pdf-error-toast';
        errorToast.textContent = 'Failed to process PDF. Please try again.';
        document.body.appendChild(errorToast);
        
        setTimeout(() => {
          document.body.removeChild(errorToast);
        }, 5000);
      } finally {
        // Remove loading overlay and file input
        document.body.removeChild(loadingOverlay);
        document.body.removeChild(fileInput);
      }
    });
    
    // Trigger the file input
    fileInput.click();
  }
  
  /**
   * Shows the sections dialog directly
   */
  static async processPdf(quill: any, file: File, range: any): Promise<void> {
    console.log('Processing PDF file', { fileName: file.name, fileSize: file.size });
    
    // Note: initializeEventListeners is likely already called by handlePdfUpload
    // this.initializeEventListeners(); // Redundant call removed

    try {
      // Use the standalone function from the hook to extract text
      // It handles PDF.js loading internally.
      const extractedText = await extractFullTextFromFile(file);
      
      console.log('Extracted text length:', extractedText.length);
      
      // Increase words per section to reduce total sections
      const wordsPerSection = 2000; // Increased from 1000
      const sections: string[] = [];
      
      // More aggressive section splitting to reduce total sections
      const paragraphs = extractedText.split(/\n\s*\n/); // Split by double newlines
      let currentSection = '';
      
      for (const paragraph of paragraphs) {
        if ((currentSection + paragraph).split(/\s+/).length > wordsPerSection) {
          if (currentSection) {
            sections.push(currentSection.trim());
          }
          currentSection = paragraph;
        } else {
          currentSection += '\n\n' + paragraph;
        }
      }
      
      if (currentSection) {
        sections.push(currentSection.trim());
      }
  
      console.log(`Text divided into ${sections.length} sections (optimized)`);
      
      // Show warning if too many sections
      if (sections.length > 10) {
        const warning = document.createElement('div');
        warning.className = 'pdf-warning-toast';
        warning.textContent = `This PDF is quite large (${sections.length} sections). Processing may take some time.`;
        // Add styling for visibility
        warning.style.position = 'fixed';
        warning.style.bottom = '20px';
        warning.style.left = '50%';
        warning.style.transform = 'translateX(-50%)';
        warning.style.backgroundColor = '#4b5563';
        warning.style.color = '#fff';
        warning.style.padding = '10px 20px';
        warning.style.borderRadius = '5px';
        warning.style.zIndex = '2000';
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 5000);
      }
  
      SectionsDialog.showSectionsDialog(quill, sections, range);
    } catch (error: any) {
      // Handle errors during extraction or processing
      console.error('Error processing PDF in processPdf:', error);
      // Show fallback UI or rethrow error
       const errorDialog = document.createElement('div');
      errorDialog.className = 'pdf-error-dialog';
      errorDialog.style.position = 'fixed';
      errorDialog.style.top = '50%';
      errorDialog.style.left = '50%';
      errorDialog.style.transform = 'translate(-50%, -50%)';
      errorDialog.style.padding = '20px';
      errorDialog.style.backgroundColor = '#1a1a1a';
      errorDialog.style.color = '#fff';
      errorDialog.style.borderRadius = '8px';
      errorDialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.7)';
      errorDialog.style.zIndex = '2000';
      errorDialog.style.width = '400px';
      errorDialog.style.textAlign = 'center';

      const errorTitle = document.createElement('h3');
      errorTitle.textContent = 'PDF Processing Failed';
      errorTitle.style.margin = '0 0 10px 0';
      errorTitle.style.color = '#ef4444';

      const errorMessage = document.createElement('p');
      errorMessage.textContent = error.message || 'We encountered an issue processing your PDF. This may be due to the PDF format or restrictions.';
      errorMessage.style.margin = '0 0 20px 0';

      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.style.backgroundColor = '#4b5563';
      closeButton.style.color = '#fff';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '4px';
      closeButton.style.padding = '8px 16px';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = () => {
        document.body.removeChild(errorDialog);
      };

      errorDialog.appendChild(errorTitle);
      errorDialog.appendChild(errorMessage);
      errorDialog.appendChild(closeButton);
      document.body.appendChild(errorDialog);

      // Propagate the error to the caller (e.g., handlePdfUpload)
      throw error; // Rethrow the error so handlePdfUpload can catch it
    }
  }
  
  /**
   * Insert plain content
   */
  static async insertSectionContent(quill: any, content: string, range: any): Promise<void> {
    if (!quill) return;
    
    // Close the dialog first
    this.closeSectionsDialog();
    
    // Force cleanup of all overlays
    OverlayManager.clearAllProcessingOverlays();
    
    // Prepare content: ONLY ensure spacing after list markers
    const preparedContent = content
      // .replace(/^(\s*)([*\-+])(?! )/gm, '$1$2 ')
      // .replace(/^(\s*)(\d+\.)(?! )/gm, '$1$2 ');
    
    try {
      // Insert content at the cursor position with enhanced safety
      await ContentFormatter.safeInsertText(quill, range.index, preparedContent);
      
      // Remove redundant explicit call to ensureMarkdownProcessed
      /*
      setTimeout(() => {
        ContentFormatter.ensureMarkdownProcessed(quill);
      }, 200);
      */
    } catch (error) {
      console.error('Error inserting content:', error);
      // Fallback to basic insertion if the enhanced method fails
      quill.insertText(range.index, preparedContent, 'user');
      quill.setSelection(range.index + preparedContent.length, 0);
    }
  }
  
  /**
   * Insert with heading and summary (REMOVED COMPLEX LOGIC)
   * This method is now largely unused as the formatting is handled
   * by use-event-handlers listening for 'pdf-insert-with-summary'.
   * Kept temporarily for potential legacy compatibility or future refactoring.
   */
  static async insertSectionWithSummary(quill: any, heading: string, summary: string, content: string, range: any): Promise<void> {
     console.warn('PdfProcessor.insertSectionWithSummary called directly - this flow is deprecated.');
     // Fallback to inserting basic formatted content directly if this is somehow still called
     const basicFormattedContent = `## ${heading}\n\n*${summary}*\n\n${content}\n\n`;
     try {
       await this.insertSectionContent(quill, basicFormattedContent, range);
     } catch (error) {
        console.error('Error in deprecated insertSectionWithSummary fallback:', error);
     }
  }
  
  /**
   * Utility method to close the sections dialog without direct dependency
   */
  private static closeSectionsDialog(): void {
    // Find and remove dialog by class
    const dialog = document.querySelector('.pdf-sections-dialog');
    if (dialog && dialog.parentNode) {
      dialog.parentNode.removeChild(dialog);
    }
    
    // Find and remove overlay
    const overlay = document.querySelector('div[style*="position: fixed"][style*="background-color: rgba(0, 0, 0, 0.5)"]');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  /**
   * Clean text that might contain markdown or code blocks to extract valid JSON
   */
  private static cleanJsonText(text: string): string {
    // First, try to extract JSON from code blocks with language specifiers
    const jsonCodeBlockRegex = /```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/g;
    const jsonMatches = [...text.matchAll(jsonCodeBlockRegex)];
    
    if (jsonMatches.length > 0) {
      // Use the first match
      const extractedJson = jsonMatches[0][1].trim();
      if (this.isValidJson(extractedJson)) {
        return extractedJson;
      }
    }
    
    // If no valid JSON in code blocks, try to extract JSON-like structures with regex
    const jsonPattern = /\{[\s\S]*?\}/g;
    const matches = text.match(jsonPattern);
    if (matches && matches.length > 0) {
      // Try each match until we find valid JSON
      for (const match of matches) {
        const cleaned = match.trim();
        if (this.isValidJson(cleaned)) {
          return cleaned;
        }
      }
    }
    
    // If still no valid JSON, try to clean the entire text
    let cleaned = text
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove any remaining backticks
      .replace(/`/g, '')
      // Remove any markdown formatting
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      // Trim whitespace
      .trim();
    
    // If the cleaned text is valid JSON, return it
    if (this.isValidJson(cleaned)) {
      return cleaned;
    }
    
    // If all else fails, return the original text
    return text;
  }
  
  /**
   * Check if a string is valid JSON
   */
  private static isValidJson(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch (e) {
      return false;
    }
  }
} 