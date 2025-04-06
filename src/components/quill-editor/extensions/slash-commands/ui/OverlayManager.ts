// UI management for overlays and loading indicators
import { OverlayControls } from '../interfaces';

export class OverlayManager {
  private static aiOperationAborted = false;
  
  /**
   * Shows a processing overlay with loading animation
   */
  static showProcessingOverlay(message: string): OverlayControls {
    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'pdf-processing-overlay quill-processing-overlay';
    
    // Set timestamp for tracking
    overlayContainer.setAttribute('data-start-time', new Date().getTime().toString());
    
    const processingBox = document.createElement('div');
    processingBox.className = 'pdf-processing-container';
    
    const spinner = document.createElement('div');
    spinner.className = 'pdf-processing-spinner';
    
    const heading = document.createElement('div');
    heading.className = 'pdf-processing-heading';
    heading.textContent = 'Processing...';
    
    const messageEl = document.createElement('div');
    messageEl.className = 'pdf-processing-text';
    messageEl.textContent = message;
    
    const progress = document.createElement('div');
    progress.className = 'pdf-processing-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'pdf-processing-progress-bar';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'pdf-cancel-button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
      console.log('User cancelled processing');
      OverlayManager.aiOperationAborted = true;
      
      // Change button text
      cancelBtn.textContent = 'Cancelling...';
      cancelBtn.disabled = true;
      
      // Allow a moment for operations to respond to the abort flag
      setTimeout(() => {
        if (overlayContainer.parentNode) {
          overlayContainer.parentNode.removeChild(overlayContainer);
        }
      }, 500);
    };
    
    // Assemble the processing box
    progress.appendChild(progressBar);
    processingBox.appendChild(spinner);
    processingBox.appendChild(heading);
    processingBox.appendChild(messageEl);
    processingBox.appendChild(progress);
    processingBox.appendChild(cancelBtn);
    
    overlayContainer.appendChild(processingBox);
    document.body.appendChild(overlayContainer);
    
    // Create helper functions
    const update = (newMessage: string) => {
      messageEl.textContent = newMessage;
    };
    
    const close = () => {
      if (overlayContainer.parentNode) {
        overlayContainer.parentNode.removeChild(overlayContainer);
      }
    };
    
    return { update, close };
  }
  
  /**
   * Clears all processing overlays from the document
   */
  static clearAllProcessingOverlays(quill?: any) {
    console.log('Clearing all processing overlays');
    
    // Get all overlays - use both class names to ensure we catch all types
    const pdfOverlays = document.querySelectorAll('.pdf-processing-overlay');
    const quillOverlays = document.querySelectorAll('.quill-processing-overlay');
    
    // Remove PDF processing overlays
    pdfOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    // Remove Quill processing overlays
    quillOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    // Reset abortion flag
    OverlayManager.aiOperationAborted = false;
    
    console.log('All processing overlays cleared');
  }
  
  /**
   * Gets the current state of the abort flag
   */
  static isOperationAborted(): boolean {
    return OverlayManager.aiOperationAborted;
  }
  
  /**
   * Sets the abort flag
   */
  static setOperationAborted(value: boolean): void {
    OverlayManager.aiOperationAborted = value;
  }
} 