// PDF processing utilities
import { ContentFormatter } from '../ai-helpers/ContentFormatter';
import { ProcessedSection, OverlayControls } from '../interfaces';
import { OverlayManager } from '../ui/OverlayManager';

export class PdfProcessor {
  // Initialize event listeners for the PDF processing events
  static initializeEventListeners() {
    // Listen for section processing request
    document.addEventListener('pdf-process-sections', (event: any) => {
      const { sections, range, insertAllBtn, selectAllCheckbox } = event.detail;
      this.processSectionsWithAI(event.detail.quill, sections, range, insertAllBtn, selectAllCheckbox);
    });
    
    // Listen for content insertion request
    document.addEventListener('pdf-insert-content', (event: any) => {
      const { content, range, quill } = event.detail;
      this.insertSectionContent(quill, content, range);
    });
    
    // Listen for content with summary insertion request
    document.addEventListener('pdf-insert-with-summary', (event: any) => {
      const { heading, summary, content, range, quill } = event.detail;
      this.insertSectionWithSummary(quill, heading, summary, content, range);
    });
    
    // Listen for enhanced content insertion request
    document.addEventListener('pdf-insert-enhanced', (event: any) => {
      const { heading, summary, content, range, quill, button } = event.detail;
      this.insertEnhancedContent(quill, heading, summary, content, range)
        .then(() => {
          if (button) {
            button.textContent = 'Enhanced Format';
            button.disabled = false;
          }
        });
    });
    
    // Listen for multiple sections insertion request
    document.addEventListener('pdf-insert-sections', (event: any) => {
      const { sections, range, enhanced, quill } = event.detail;
      if (enhanced) {
        this.insertMultipleSectionsEnhanced(quill, sections, range);
      } else {
        this.insertMultipleSectionsStandard(quill, sections, range);
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
        script.onload = () => resolve();
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
    const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
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
    
    // Split the text into sections of approximately 1000 words each
    const words = extractedText.split(/\s+/);
    const wordsPerSection = 1000;
    const sections = [];
    
    for (let i = 0; i < words.length; i += wordsPerSection) {
      sections.push(words.slice(i, i + wordsPerSection).join(' '));
    }
    
    console.log(`Text divided into ${sections.length} sections`);
    
    // Create and show sections dialog directly rather than using the SectionsDialog class
    // This will create a custom event that the SectionsDialog class will listen for
    const event = new CustomEvent('show-sections-dialog', {
      detail: {
        quill,
        sections,
        range
      }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Process sections with AI to generate summaries and headings
   */
  static async processSectionsWithAI(
    quill: any,
    sections: ProcessedSection[], 
    range: any, 
    insertAllBtn?: HTMLButtonElement, 
    selectAllCheckbox?: HTMLInputElement
  ): Promise<void> {
    // Initialize counter for completed sections
    let completedSections = 0;
    
    // Process each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      try {
        // Generate title and summary
        const { heading, summary } = await ContentFormatter.generateTitleAndSummary(quill, section.content);
        section.heading = heading;
        section.summary = summary;
        
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
        
        // Enable buttons
        section.insertBtn.disabled = false;
        section.insertWithSummaryBtn.disabled = false;
        
        // Add third button for enhanced formatting
        const enhancedFormatBtn = document.createElement('button');
        enhancedFormatBtn.textContent = 'Enhanced Format';
        enhancedFormatBtn.className = 'pdf-section-button special';
        enhancedFormatBtn.style.backgroundColor = '#0ea5e9'; // Sky blue color
        enhancedFormatBtn.style.color = '#fff';
        enhancedFormatBtn.style.border = 'none';
        enhancedFormatBtn.style.borderRadius = '4px';
        enhancedFormatBtn.style.padding = '8px 12px';
        enhancedFormatBtn.style.cursor = 'pointer';
        enhancedFormatBtn.style.fontSize = '14px';
        section.enhancedFormatBtn = enhancedFormatBtn;
        
        // Add the button to the buttons container
        if (section.element) {
          const buttonsContainer = section.element.querySelector('.pdf-section-buttons');
          if (buttonsContainer) {
            buttonsContainer.appendChild(enhancedFormatBtn);
          }
        }
        
        // Add click handlers for buttons
        section.insertBtn.onclick = () => {
          PdfProcessor.insertSectionContent(quill, section.content, range);
        };
        
        section.insertWithSummaryBtn.onclick = () => {
          PdfProcessor.insertSectionWithSummary(quill, section.heading, section.summary, section.content, range);
        };
        
        section.enhancedFormatBtn.onclick = async () => {
          enhancedFormatBtn.textContent = 'Formatting...';
          enhancedFormatBtn.disabled = true;
          await PdfProcessor.insertEnhancedContent(quill, section.heading, section.summary, section.content, range);
          enhancedFormatBtn.textContent = 'Enhanced Format';
          enhancedFormatBtn.disabled = false;
        };
        
        // Add checkbox change handler
        section.checkbox.addEventListener('change', () => {
          section.selected = section.checkbox.checked;
          
          // Update insert all button state
          if (insertAllBtn) {
            const anySelected = sections.some(s => s.selected);
            insertAllBtn.disabled = !anySelected;
          }
          
          // Update select all checkbox
          if (selectAllCheckbox) {
            const allSelected = sections.every(s => s.selected);
            selectAllCheckbox.checked = allSelected;
          }
        });
        
        // Increment completed counter
        completedSections++;
        
      } catch (error) {
        console.error(`Error processing section ${i + 1}:`, error);
        
        section.loadingIndicator.textContent = 'Analysis failed';
        section.loadingIndicator.className = 'pdf-loading-indicator error';
        section.loadingIndicator.style.color = '#ef4444';
        
        // Enable insert content button as fallback
        section.insertBtn.disabled = false;
        section.insertBtn.onclick = () => {
          PdfProcessor.insertSectionContent(quill, section.content, range);
        };
        
        // Increment completed counter
        completedSections++;
      }
      
      // Enable the insert all button once all sections are processed
      if (insertAllBtn && completedSections === sections.length) {
        insertAllBtn.disabled = false;
      }
    }
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
  static insertSectionWithSummary(quill: any, heading: string, summary: string, content: string, range: any): void {
    if (!quill) return;
    
    // Format the content with heading and summary
    const formattedContent = `## ${heading}\n\n*${summary}*\n\n${content}\n\n`;
    
    // Close the dialog first
    this.closeSectionsDialog();
    
    // Force cleanup of all overlays
    OverlayManager.clearAllProcessingOverlays();
    
    // Insert at cursor position with safety debounce
    ContentFormatter.safeInsertText(quill, range.index, formattedContent);
  }
  
  /**
   * Insert AI-enhanced content
   */
  static async insertEnhancedContent(quill: any, heading: string, summary: string, content: string, range: any): Promise<void> {
    if (!quill) return;
    
    try {
      // Format the content with AI
      const formattedContent = await ContentFormatter.formatContentWithAI(quill, content, heading);
      
      // Check if operation was aborted
      if (OverlayManager.isOperationAborted()) {
        console.log('Enhanced formatting was cancelled');
        return;
      }
      
      // Build the formatted section
      const formattedSection = `## ${heading}\n\n*${summary}*\n\n${formattedContent}\n\n`;
      
      // Close the dialog first
      this.closeSectionsDialog();
      
      // Force cleanup of all overlays
      OverlayManager.clearAllProcessingOverlays();
      
      // Insert the formatted content with safety debounce
      ContentFormatter.safeInsertText(quill, range.index, formattedSection);
    } catch (error) {
      console.error('Error inserting enhanced content:', error);
      
      // If the operation was cancelled, don't do anything else
      if (error instanceof Error && error.message === 'Operation cancelled by user') {
        return;
      }
      
      // Fallback to regular insertion with summary if enhanced formatting fails for other reasons
      PdfProcessor.insertSectionWithSummary(quill, heading, summary, content, range);
    } finally {
      // Ensure the dialog is closed
      this.closeSectionsDialog();
      
      // Force cleanup of all overlays
      OverlayManager.clearAllProcessingOverlays();
    }
  }
  
  /**
   * Insert multiple sections with standard formatting
   */
  static insertMultipleSectionsStandard(quill: any, sections: ProcessedSection[], range: any): void {
    if (!quill) return;
    
    let combinedContent = '';
    
    // Insert each section with heading and summary
    sections.forEach((section, index) => {
      const formattedContent = `## ${section.heading}\n\n*${section.summary}*\n\n${section.content}\n\n`;
      combinedContent += formattedContent;
      
      // Add a separator between sections (except for the last one)
      if (index < sections.length - 1) {
        combinedContent += '\n\n---\n\n';
      }
    });
    
    // Close the dialog safely first
    this.closeSectionsDialog();
    
    // Force cleanup of all overlays
    OverlayManager.clearAllProcessingOverlays();
    
    // Insert the combined content with safety debounce
    ContentFormatter.safeInsertText(quill, range.index, combinedContent);
  }
  
  /**
   * Insert multiple sections with enhanced AI formatting
   */
  static async insertMultipleSectionsEnhanced(quill: any, sections: ProcessedSection[], range: any): Promise<void> {
    if (!quill) return;
    
    // Reset abortion flag
    OverlayManager.setOperationAborted(false);
    
    // Get markdown module and save its state
    const markdownModule = quill.getModule('markdown');
    const wasMarkdownEnabled = markdownModule?.options?.enabled || false;
    
    // Temporarily disable markdown processing during bulk operations
    if (markdownModule && markdownModule.options) {
      markdownModule.options.enabled = false;
    }
    
    // Create a variable to track if we've shown the overlay
    let overlay: OverlayControls | null = null;
    
    try {
      // Show the processing overlay
      overlay = OverlayManager.showProcessingOverlay(`Processing ${sections.length} sections...`);
      
      // Close the dialog early to show progress
      this.closeSectionsDialog();
      
      // Insert at cursor position
      let combinedContent = '';
      
      // Process each section with enhanced formatting
      for (let i = 0; i < sections.length; i++) {
        // Check if operation was aborted
        if (OverlayManager.isOperationAborted()) {
          console.log('Enhanced formatting was cancelled');
          break;
        }
        
        const section = sections[i];
        if (overlay) {
          overlay.update(`Processing section ${i+1} of ${sections.length}...`);
        }
        
        try {
          // Format the content
          const formattedContent = await ContentFormatter.formatContentWithAI(quill, section.content, section.heading);
          
          // Check if operation was aborted during content formatting
          if (OverlayManager.isOperationAborted()) {
            break;
          }
          
          // Create the formatted section
          const sectionContent = `## ${section.heading}\n\n*${section.summary}*\n\n${formattedContent}\n\n`;
          
          // Add separator if not the last section
          const separator = i < sections.length - 1 ? '\n\n---\n\n' : '';
          
          // Add to combined content
          combinedContent += sectionContent + separator;
          
        } catch (error) {
          console.error(`Error processing section ${i+1} with enhanced formatting:`, error);
          
          // If operation was cancelled, stop processing
          if (error instanceof Error && error.message === 'Operation cancelled by user') {
            break;
          }
          
          // Use regular formatting as fallback
          const fallbackText = `## ${section.heading}\n\n*${section.summary}*\n\n${section.content}\n\n`;
          const separator = i < sections.length - 1 ? '\n\n---\n\n' : '';
          
          // Add to combined content
          combinedContent += fallbackText + separator;
        }
      }
      
      // Close the overlay if it exists
      if (overlay) {
        overlay.close();
      }
      
      // Re-enable markdown if it was enabled
      if (markdownModule && markdownModule.options) {
        markdownModule.options.enabled = wasMarkdownEnabled;
      }
      
      // Insert the combined content if we have any
      if (combinedContent.length > 0) {
        // Use the safe insert method
        ContentFormatter.safeInsertText(quill, range.index, combinedContent);
        
        // Make sure markdown processing is triggered after insertion
        setTimeout(() => {
          ContentFormatter.ensureMarkdownProcessed(quill);
        }, 100);
      }
      
    } catch (error) {
      console.error('Error in multiple sections processing:', error);
      
      // Re-enable markdown if it was enabled 
      if (markdownModule && markdownModule.options) {
        markdownModule.options.enabled = wasMarkdownEnabled;
      }
    } finally {
      // Close the overlay if it exists
      if (overlay) {
        overlay.close();
      }
      
      // Ensure the dialog is closed
      this.closeSectionsDialog();
      
      // Force cleanup of all overlays
      OverlayManager.clearAllProcessingOverlays();
    }
  }
  
  /**
   * Insert multiple sections based on formatting preference
   */
  static insertMultipleSections(quill: any, sections: ProcessedSection[], range: any): void {
    if (!quill) return;
    
    // Check if the toggle was set (if available)
    const enhancedFormatToggle = document.getElementById('enhanced-format') as HTMLInputElement;
    const useEnhanced = enhancedFormatToggle ? enhancedFormatToggle.checked : false;
    
    if (useEnhanced) {
      PdfProcessor.insertMultipleSectionsEnhanced(quill, sections, range);
    } else {
      PdfProcessor.insertMultipleSectionsStandard(quill, sections, range);
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