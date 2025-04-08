// PDF processing utilities
import { ContentFormatter } from '../ai-helpers/ContentFormatter';
import { ProcessedSection, OverlayControls } from '../interfaces';
import { OverlayManager } from '../ui/OverlayManager';
import SectionsDialog from './SectionsDialog';

const API_CALL_DELAY = 2000; // 2 second delay between API calls
const MAX_RETRIES = 3; // Maximum number of retries for API calls
const RETRY_DELAY = 5000; // 5 second delay between retries

// Create a simple Gemini model interface for direct API calls
const geminiModel = {
  generateContent: async (prompt: string): Promise<{ text: string }> => {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const apiKey = localStorage.getItem('gemini_api_key');
        
        if (!apiKey) {
          throw new Error('Gemini API key not found. Please set your API key in the settings.');
        }
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              topP: 0.95,
              topK: 40,
            },
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
          
          // Check for rate limit errors
          if (response.status === 429 || (errorData.error?.message && errorData.error.message.includes('rate'))) {
            console.warn(`Rate limit hit, retrying (${retries + 1}/${MAX_RETRIES})...`);
            retries++;
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            continue;
          }
          
          throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return { text: generatedText };
      } catch (error) {
        console.error(`Error calling Gemini API (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
        
        // If it's a JSON parsing error, try to extract useful information
        if (error instanceof SyntaxError) {
          console.error('JSON parsing error, retrying...');
          retries++;
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }
    
    // If we've exhausted retries, throw a specific error
    throw new Error(`Failed to call Gemini API after ${MAX_RETRIES} attempts`);
  }
};

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
        
        const aiGenerateEvent = new CustomEvent('ai-generate-section-summary', {
          detail: { content: contentToProcess },
          bubbles: true
        });
        
        // Register one-time response handler for the AI event
        const responseHandler = (responseEvent: any) => {
          try {
            // Process the response
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
        
        // Listen once for response
        document.addEventListener('ai-section-summary-response', (event) => {
          clearTimeout(responseTimeout);
          document.removeEventListener('ai-section-summary-response', responseHandler);
          responseHandler(event);
        }, { once: true });
        
        // Dispatch the event
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
    
    // Listen for content insertion request
    document.addEventListener('pdf-insert-content', (event: any) => {
      const { content, range, quill } = event.detail;
      this.insertSectionContent(quill, content, range);
    });
    
    // Listen for content with summary insertion request
    document.addEventListener('pdf-insert-with-summary', (event: any) => {
      const { heading, summary, content, range, quill } = event.detail;
      
      // Create unique key for this insertion
      const insertionKey = `${heading}-${Date.now()}`;
      
      // Check if already processing
      if (activeInsertions.has(insertionKey)) {
        console.log('Duplicate insertion request ignored');
        return;
      }
      
      // Mark as active
      activeInsertions.add(insertionKey);
      
      // Process the insertion
      this.insertSectionWithSummary(quill, heading, summary, content, range)
        .finally(() => {
          // Clean up after processing
          activeInsertions.delete(insertionKey);
        });
    });
    
    // For compatibility with old code:
    
    // Listen for section processing request (old style batch processing - no longer used)
    document.addEventListener('pdf-process-sections', (event: any) => {
      console.warn('pdf-process-sections event is deprecated, use pdf-process-section instead');
    });
    
    // Listen for enhanced content insertion request (no longer used)
    document.addEventListener('pdf-insert-enhanced', (event: any) => {
      const { heading, summary, content, range, quill } = event.detail;
      // Just use regular insertion instead of enhanced
      this.insertSectionWithSummary(quill, heading, summary, content, range);
    });
    
    // Listen for multiple sections insertion request (no longer used)
    document.addEventListener('pdf-insert-sections', (event: any) => {
      const { sections, range, quill } = event.detail;
      
      // Build combined content
      let combinedContent = '';
      
      // Insert each section with heading and summary
      sections.forEach((section: any, index: number) => {
        const formattedContent = `## ${section.heading}\n\n*${section.summary}*\n\n${section.content}\n\n`;
        combinedContent += formattedContent;
        
        // Add a separator between sections (except for the last one)
        if (index < sections.length - 1) {
          combinedContent += '\n\n---\n\n';
        }
      });
      
      // Insert the combined content
      this.insertSectionContent(quill, combinedContent, range);
    });
    
    // Force loading SectionsDialog to ensure its event listeners are initialized
    console.log('SectionsDialog initialized:', SectionsDialog ? 'Yes' : 'No');

    // Modify the section summary handler to be more efficient
    document.addEventListener('ai-generate-section-summary', async (event: any) => {
      const { content } = event.detail;
      
      try {
        const response = await geminiModel.generateContent(`
          Analyze this text concisely:
          ${content}
          
          Provide only:
          1. A short heading (max 6 words)
          2. A one-sentence summary
          
          Format: {"heading": "heading", "summary": "summary"}
        `);
        
        try {
          // Safely parse the JSON response
          const parsedResponse = JSON.parse(response.text);
          
          // Validate the response structure
          if (!parsedResponse.heading || !parsedResponse.summary) {
            throw new Error('Invalid response format');
          }
          
          document.dispatchEvent(new CustomEvent('ai-section-summary-response', {
            detail: parsedResponse,
            bubbles: true
          }));
        } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError);
          
          // Create a fallback response
          const words = content.split(/\s+/);
          const headingWords = words.slice(0, Math.min(6, words.length));
          let heading = headingWords.join(' ');
          
          // Capitalize first letter and add ellipsis if truncated
          heading = heading.charAt(0).toUpperCase() + heading.slice(1);
          if (words.length > 6) heading += '...';
          
          // First sentence for summary
          const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
          const summary = sentences.length > 0 ? sentences[0].trim() + '.' : 'No summary available.';
          
          document.dispatchEvent(new CustomEvent('ai-section-summary-response', {
            detail: { heading, summary },
            bubbles: true
          }));
        }
      } catch (error) {
        console.error('Gemini API error:', error);
        
        // Create a fallback response
        const words = content.split(/\s+/);
        const headingWords = words.slice(0, Math.min(6, words.length));
        let heading = headingWords.join(' ');
        
        // Capitalize first letter and add ellipsis if truncated
        heading = heading.charAt(0).toUpperCase() + heading.slice(1);
        if (words.length > 6) heading += '...';
        
        // First sentence for summary
        const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
        const summary = sentences.length > 0 ? sentences[0].trim() + '.' : 'No summary available.';
        
        document.dispatchEvent(new CustomEvent('ai-section-summary-response', {
          detail: { heading, summary },
          bubbles: true
        }));
      }
    });

    // In your Gemini event handlers setup
    document.addEventListener('ai-format-content', async (event: any) => {
      const { heading, summary, content, formatKey } = event.detail;
      
      try {
        const response = await geminiModel.generateContent(`
          Format the following content with proper structure and formatting.
          Add appropriate headers, bullet points, and formatting where relevant.
          Preserve the main heading and summary, but enhance the content structure.
          
          Original Heading: ${heading}
          Original Summary: ${summary}
          
          Content to format:
          ${content}
          
          Please format the content with:
          1. Clear hierarchy of headers (using markdown ##, ###, etc.)
          2. Bullet points for lists
          3. Proper paragraph breaks
          4. Emphasis on key points
          5. Block quotes for important quotes if present
          6. Code blocks if technical content is present
          
          Return the fully formatted content in markdown format.
        `);
        
        document.dispatchEvent(new CustomEvent('ai-format-content-response', {
          detail: {
            formattedContent: response.text,
            formatKey
          },
          bubbles: true
        }));
      } catch (error) {
        console.error('Gemini formatting error:', error);
        
        // Create a fallback formatted content
        const fallbackContent = `## ${heading}\n\n*${summary}*\n\n${content}\n\n`;
        
        document.dispatchEvent(new CustomEvent('ai-format-content-response', {
          detail: {
            formattedContent: fallbackContent,
            formatKey
          },
          bubbles: true
        }));
      }
    });
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
    
    // Initialize event listeners
    this.initializeEventListeners();
    
    // Make sure PDF.js is loaded
    if (!window.pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
        script.onload = () => {
          console.log('PDF.js library loaded successfully');
          
          // Set the worker URL using a CDN worker file instead of local
          try {
            if (window.pdfjsLib && 'GlobalWorkerOptions' in (window.pdfjsLib as any)) {
              // Use the CDN version which is properly compiled
              (window.pdfjsLib as any).GlobalWorkerOptions.workerSrc = 
                'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
              console.log('PDF.js worker URL set to CDN version');
            }
          } catch (e) {
            console.error('Error setting PDF.js worker URL:', e);
          }
          
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js'));
        document.head.appendChild(script);
      });
    }
    
    // Check again if PDF.js loaded properly
    if (!window.pdfjsLib) {
      throw new Error('Failed to load PDF.js library');
    }
    
    // Read the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);
    
    // Load the PDF document
    let pdf;
    try {
      const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
      pdf = await loadingTask.promise;
    } catch (error) {
      console.error('Error loading PDF document:', error);
      
      // Show fallback UI to let user know processing failed
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
      errorMessage.textContent = 'We encountered an issue processing your PDF. This may be due to the PDF format or restrictions.';
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
      
      throw new Error('PDF processing failed');
    }
    
    // Extract text from all pages
    let extractedText = '';
    const totalPages = pdf.numPages;
    
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str).join(' ');
      extractedText += textItems + '\n\n';
    }
    
    console.log('Extracted text length:', extractedText.length);
    
    // Increase words per section to reduce total sections
    const wordsPerSection = 2000; // Increased from 1000
    const sections = [];
    
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
      document.body.appendChild(warning);
      setTimeout(() => warning.remove(), 5000);
    }

    SectionsDialog.showSectionsDialog(quill, sections, range);
  }
  
  /**
   * Insert plain content
   */
  static insertSectionContent(quill: any, content: string, range: any): void {
    if (!quill) return;
    
    // Close the dialog first
    this.closeSectionsDialog();
    
    // Force cleanup of all overlays
    OverlayManager.clearAllProcessingOverlays();
    
    // Insert content at the cursor position with safety debounce
    ContentFormatter.safeInsertText(quill, range.index, content);
  }
  
  /**
   * Insert with heading and summary
   */
  static async insertSectionWithSummary(quill: any, heading: string, summary: string, content: string, range: any): Promise<void> {
    if (!quill) return;
    
    // Create unique key for this formatting request
    const formatKey = `format-${Date.now()}`;
    
    try {
      // Show formatting indicator
      const formattingOverlay = document.createElement('div');
      formattingOverlay.className = 'pdf-formatting-overlay';
      formattingOverlay.textContent = 'Formatting content...';
      document.body.appendChild(formattingOverlay);
      
      // Create a formatting request event with the unique key
      const formatEvent = new CustomEvent('ai-format-content', {
        detail: {
          heading,
          summary,
          content,
          formatKey // Include key to track this specific request
        },
        bubbles: true
      });
      
      // Wait for formatted content with key matching
      const formattedContent = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Formatting timeout'));
        }, 15000);
        
        const handleResponse = (response: any) => {
          if (response.detail.formatKey === formatKey) {
            clearTimeout(timeout);
            document.removeEventListener('ai-format-content-response', handleResponse);
            resolve(response.detail.formattedContent);
          }
        };
        
        document.addEventListener('ai-format-content-response', handleResponse);
        document.dispatchEvent(formatEvent);
      });
      
      // Close dialog and insert formatted content
      this.closeSectionsDialog();
      
      // Use a safe insert method that prevents duplicates
      await ContentFormatter.safeInsertText(quill, range.index, formattedContent as string);
      
    } catch (error) {
      console.error('Error formatting content:', error);
      // Fallback to basic formatting
      const basicFormattedContent = `## ${heading}\n\n*${summary}*\n\n${content}\n\n`;
      this.closeSectionsDialog();
      await ContentFormatter.safeInsertText(quill, range.index, basicFormattedContent);
    } finally {
      // Remove formatting overlay
      const overlay = document.querySelector('.pdf-formatting-overlay');
      if (overlay) overlay.remove();
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
} 