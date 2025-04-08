// Sections dialog for PDF processing
import { Dialog, ProcessedSection } from '../interfaces';

export default class SectionsDialog {
  private static dialog: Dialog | null = null;
  private static processingQueue: ProcessedSection[] = [];
  private static isProcessing: boolean = false;
  private static processingDelay: number = 2000; // 2 second delay between processing sections
  private static maxConcurrentProcessing: number = 1; // Process one section at a time
  
  // Static initializer to set up event listeners
  static {
    // Set up the event listener for show-sections-dialog
    document.addEventListener('show-sections-dialog', (event: any) => {
      const { quill, sections, range } = event.detail;
      SectionsDialog.showSectionsDialog(quill, sections, range);
    });
    
    console.log('SectionsDialog event listeners initialized');
  }
  
  /**
   * Shows a dialog with PDF sections for processing
   */
  static showSectionsDialog(quill: any, sections: string[], range: any): void {
    // Add a processing state tracker
    const processingStates = new Map();
    
    // Create insert button handler with debounce
    const handleInsertClick = (section: any, button: HTMLButtonElement) => {
      // Prevent multiple clicks
      if (processingStates.get(section)) {
        console.log('Section already being processed, ignoring click');
        return;
      }
      
      // Mark section as processing
      processingStates.set(section, true);
      button.disabled = true;
      button.textContent = 'Inserting...';
      
      // Dispatch insert event
      const event = new CustomEvent('pdf-insert-with-summary', {
        detail: {
          heading: section.heading,
          summary: section.summary,
          content: section.content,
          range,
          quill
        },
        bubbles: true
      });
      
      document.dispatchEvent(event);
      
      // Clean up after processing (whether successful or not)
      setTimeout(() => {
        processingStates.delete(section);
        button.disabled = false;
        button.textContent = 'Insert Section';
      }, 5000); // Reset after 5 seconds in case of failure
    };
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'pdf-sections-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '10%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translateX(-50%)';
    dialog.style.maxWidth = '80%';
    dialog.style.width = '800px';
    dialog.style.maxHeight = '80vh';
    dialog.style.backgroundColor = '#1a1a1a';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.7)';
    dialog.style.zIndex = '2000';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.overflow = 'hidden';
    
    // Add header
    const header = document.createElement('div');
    header.style.padding = '16px';
    header.style.borderBottom = '1px solid #333';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const title = document.createElement('h2');
    title.textContent = 'PDF Content';
    title.style.margin = '0';
    title.style.color = '#fff';
    title.style.fontSize = '18px';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#999';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '0';
    closeBtn.style.lineHeight = '1';
    
    closeBtn.onclick = () => {
      document.body.removeChild(dialog);
      document.body.removeChild(overlay);
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);
    
    // Add controls bar
    const controlsBar = document.createElement('div');
    controlsBar.className = 'pdf-sections-controls';
    controlsBar.style.padding = '12px 16px';
    controlsBar.style.borderBottom = '1px solid #333';
    controlsBar.style.display = 'flex';
    controlsBar.style.justifyContent = 'space-between';
    controlsBar.style.alignItems = 'center';
    
    // Left side controls: Select all checkbox
    const leftControls = document.createElement('div');
    leftControls.style.display = 'flex';
    leftControls.style.alignItems = 'center';
    leftControls.style.gap = '16px';
    
    const selectAllContainer = document.createElement('div');
    selectAllContainer.style.display = 'flex';
    selectAllContainer.style.alignItems = 'center';
    
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'select-all-sections';
    selectAllCheckbox.className = 'pdf-section-checkbox';
    selectAllCheckbox.style.marginRight = '8px';
    
    const selectAllLabel = document.createElement('label');
    selectAllLabel.htmlFor = 'select-all-sections';
    selectAllLabel.textContent = 'Select All Sections';
    selectAllLabel.style.color = '#fff';
    selectAllLabel.style.cursor = 'pointer';
    
    selectAllContainer.appendChild(selectAllCheckbox);
    selectAllContainer.appendChild(selectAllLabel);
    
    // Status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'pdf-processing-status';
    statusIndicator.style.color = '#999';
    statusIndicator.textContent = 'Ready to process sections';
    
    // Add elements to left controls
    leftControls.appendChild(selectAllContainer);
    leftControls.appendChild(statusIndicator);
    
    // Insert All button
    const insertAllBtn = document.createElement('button');
    insertAllBtn.textContent = 'Insert Selected';
    insertAllBtn.className = 'pdf-section-button primary';
    insertAllBtn.style.backgroundColor = '#6d28d9';
    insertAllBtn.style.color = '#fff';
    insertAllBtn.style.border = 'none';
    insertAllBtn.style.borderRadius = '4px';
    insertAllBtn.style.padding = '8px 16px';
    insertAllBtn.style.cursor = 'pointer';
    insertAllBtn.style.fontSize = '14px';
    insertAllBtn.disabled = true; // Disabled until sections are processed
    
    // Add them to controls bar
    controlsBar.appendChild(leftControls);
    controlsBar.appendChild(insertAllBtn);
    
    dialog.appendChild(controlsBar);
    
    // Create sections container
    const sectionsContainer = document.createElement('div');
    sectionsContainer.className = 'pdf-sections-container';
    sectionsContainer.style.overflow = 'auto';
    sectionsContainer.style.padding = '16px';
    sectionsContainer.style.flexGrow = '1';
    
    // Get AI to generate summaries for each section
    const processedSections: ProcessedSection[] = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Create section element
      const sectionEl = document.createElement('div');
      sectionEl.className = 'pdf-section-card';
      sectionEl.style.marginBottom = '24px';
      sectionEl.style.padding = '16px';
      sectionEl.style.backgroundColor = '#2a2a2a';
      sectionEl.style.borderRadius = '4px';
      sectionEl.style.position = 'relative';
      
      // Section header with checkbox
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'pdf-section-header';
      sectionHeader.style.display = 'flex';
      sectionHeader.style.justifyContent = 'space-between';
      sectionHeader.style.marginBottom = '12px';
      
      // Left side with checkbox and section number
      const headerLeft = document.createElement('div');
      headerLeft.style.display = 'flex';
      headerLeft.style.alignItems = 'center';
      
      // Add checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'pdf-section-checkbox';
      checkbox.id = `section-checkbox-${i}`;
      checkbox.style.marginRight = '10px';
      
      // Section number
      const sectionNumber = document.createElement('h3');
      sectionNumber.textContent = `Section ${i + 1}`;
      sectionNumber.style.margin = '0';
      sectionNumber.style.color = '#fff';
      
      headerLeft.appendChild(checkbox);
      headerLeft.appendChild(sectionNumber);
      
      // Loading indicator
      const loadingIndicator = document.createElement('span');
      loadingIndicator.textContent = 'Waiting...';
      loadingIndicator.className = 'pdf-loading-indicator';
      loadingIndicator.style.color = '#999';
      
      sectionHeader.appendChild(headerLeft);
      sectionHeader.appendChild(loadingIndicator);
      
      // Container for content that will be filled later
      const contentContainer = document.createElement('div');
      contentContainer.className = 'pdf-section-content';
      contentContainer.style.color = '#ddd';
      contentContainer.style.fontSize = '14px';
      contentContainer.style.lineHeight = '1.5';
      contentContainer.style.maxHeight = '150px';
      contentContainer.style.overflow = 'hidden';
      contentContainer.style.position = 'relative';
      contentContainer.style.marginBottom = '12px';
      
      // Add gradient fade effect at bottom
      const fadeEffect = document.createElement('div');
      fadeEffect.className = 'pdf-section-fade';
      fadeEffect.style.position = 'absolute';
      fadeEffect.style.bottom = '0';
      fadeEffect.style.left = '0';
      fadeEffect.style.width = '100%';
      fadeEffect.style.height = '50px';
      fadeEffect.style.background = 'linear-gradient(to bottom, rgba(42, 42, 42, 0), rgba(42, 42, 42, 1))';
      contentContainer.appendChild(fadeEffect);
      
      // Add the first few words of content as preview
      const previewText = section.substring(0, 200) + '...';
      const preview = document.createElement('div');
      preview.textContent = previewText;
      contentContainer.appendChild(preview);
      
      // Buttons
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'pdf-section-buttons';
      buttonsContainer.style.display = 'flex';
      buttonsContainer.style.justifyContent = 'flex-end';
      buttonsContainer.style.gap = '8px';
      
      // Single Insert button
      const insertBtn = document.createElement('button');
      insertBtn.textContent = 'Insert Section';
      insertBtn.className = 'pdf-section-button';
      insertBtn.style.backgroundColor = '#4b5563';
      insertBtn.style.color = '#fff';
      insertBtn.style.border = 'none';
      insertBtn.style.borderRadius = '4px';
      insertBtn.style.padding = '8px 12px';
      insertBtn.style.cursor = 'pointer';
      insertBtn.style.fontSize = '14px';
      insertBtn.disabled = true; // Disabled until processed
      
      // Add buttons to container
      buttonsContainer.appendChild(insertBtn);
      
      // Add elements to the section
      sectionEl.appendChild(sectionHeader);
      sectionEl.appendChild(contentContainer);
      sectionEl.appendChild(buttonsContainer);
      
      // Add to sections container
      sectionsContainer.appendChild(sectionEl);
      
      // Create processed section object and add to array
      const processedSection: ProcessedSection = {
        content: section,
        element: sectionEl,
        heading: '',
        summary: '',
        selected: false,
        checkbox,
        loadingIndicator,
        contentContainer,
        insertBtn,
        insertWithSummaryBtn: insertBtn // For compatibility
      };
      
      processedSections.push(processedSection);
    }
    
    dialog.appendChild(sectionsContainer);
    
    // Create overlay background
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1999';
    
    // Add to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // Handle select all checkbox
    selectAllCheckbox.addEventListener('change', () => {
      const isChecked = selectAllCheckbox.checked;
      
      // Update all section checkboxes
      processedSections.forEach(section => {
        section.checkbox.checked = isChecked;
        section.selected = isChecked;
      });
      
      // Update insert all button state
      insertAllBtn.disabled = !isChecked && processedSections.every(s => !s.selected);
    });
    
    // Handle insert all button
    insertAllBtn.addEventListener('click', () => {
      const selectedSections = processedSections.filter(s => s.selected && s.heading);
      if (selectedSections.length === 0) return;
      
      // Build combined content
      let combinedContent = '';
      
      // Insert each section with heading and summary
      selectedSections.forEach((section, index) => {
        const formattedContent = `## ${section.heading}\n\n*${section.summary}*\n\n${section.content}\n\n`;
        combinedContent += formattedContent;
        
        // Add a separator between sections (except for the last one)
        if (index < selectedSections.length - 1) {
          combinedContent += '\n\n---\n\n';
        }
      });
      
      // Dispatch event to insert content
      const event = new CustomEvent('pdf-insert-content', {
        detail: {
          content: combinedContent,
          range,
          quill
        }
      });
      document.dispatchEvent(event);
      
      // Close dialog
      SectionsDialog.closeSectionsDialog();
    });
    
    // Setup the processing queue to process one section at a time
    SectionsDialog.processingQueue = [...processedSections];
    SectionsDialog.isProcessing = false;
    
    // Start processing sections sequentially
    setTimeout(() => {
      SectionsDialog.processNextSection(quill, range);
    }, 100);
    
    // Set dialog property for outside click handling
    SectionsDialog.dialog = {
      containerEl: dialog,
      hide: () => {
        if (dialog && dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
          
          // Clear any overlays
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }
        SectionsDialog.dialog = null;
      }
    };
    
    // Add document click handler to close dialog when clicking outside
    document.addEventListener('click', SectionsDialog.handleOutsideClick);
  }
  
  /**
   * Process the next section in the queue
   */
  static processNextSection(quill: any, range: any): void {
    // If already processing or queue is empty, return
    if (SectionsDialog.isProcessing || SectionsDialog.processingQueue.length === 0) {
      // If we've completed all processing, update status
      if (SectionsDialog.processingQueue.length === 0) {
        const statusEl = document.getElementById('pdf-processing-status');
        if (statusEl) {
          statusEl.textContent = 'All sections processed';
          statusEl.style.color = '#4ade80';
        }
      }
      return;
    }
    
    // Mark as processing
    SectionsDialog.isProcessing = true;
    
    // Get the status indicator
    const statusEl = document.getElementById('pdf-processing-status');
    if (statusEl) {
      statusEl.textContent = `Processing: ${SectionsDialog.processingQueue.length} sections remaining`;
    }
    
    // Get the next section
    const section = SectionsDialog.processingQueue.shift();
    if (!section) {
      SectionsDialog.isProcessing = false;
      return;
    }
    
    // Update loading status
    section.loadingIndicator.textContent = 'Processing...';
    
    // Dispatch event for AI processing
    const event = new CustomEvent('pdf-process-section', {
      detail: {
        section,
        quill,
        range,
        onComplete: () => {
          // Once processing is complete, enable the button
          section.insertBtn.disabled = false;
          
          // Add click handlers for button
          section.insertBtn.onclick = () => {
            const event = new CustomEvent('pdf-insert-with-summary', {
              detail: {
                heading: section.heading,
                summary: section.summary,
                content: section.content,
                range,
                quill
              }
            });
            document.dispatchEvent(event);
            SectionsDialog.closeSectionsDialog();
          };
          
          // Add checkbox change handler
          section.checkbox.addEventListener('change', () => {
            section.selected = section.checkbox.checked;
            
            // Get all sections (not just processed ones)
            const allCheckboxes = document.querySelectorAll('.pdf-section-checkbox');
            const allSections = Array.from(document.querySelectorAll('.pdf-section-card')).length - 1; // Minus the header
            
            // Update insert all button state
            const insertAllBtn = document.querySelector('.pdf-section-button.primary') as HTMLButtonElement;
            if (insertAllBtn) {
              const anySelected = Array.from(allCheckboxes).some(cb => (cb as HTMLInputElement).checked);
              insertAllBtn.disabled = !anySelected;
            }
            
            // Update select all checkbox
            const selectAllCheckbox = document.getElementById('select-all-sections') as HTMLInputElement;
            if (selectAllCheckbox) {
              const checkedCount = Array.from(allCheckboxes).filter(cb => (cb as HTMLInputElement).checked).length - 1; // Minus the "select all" checkbox
              selectAllCheckbox.checked = checkedCount === allSections;
              selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allSections;
            }
          });
          
          // Process the next section after a delay to prevent rate limiting
          setTimeout(() => {
            SectionsDialog.isProcessing = false;
            SectionsDialog.processNextSection(quill, range);
          }, SectionsDialog.processingDelay);
        }
      }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Handles clicks outside the dialog
   */
  static handleOutsideClick(event: MouseEvent): void {
    if (!SectionsDialog.dialog) return;
    
    // Check if clicking outside the dialog
    const target = event.target as HTMLElement;
    const isClickOutside = SectionsDialog.dialog && 
      SectionsDialog.dialog.containerEl && 
      !SectionsDialog.dialog.containerEl.contains(target);
    
    // Handle processing overlay clicks
    const processingOverlay = document.querySelector('.quill-processing-overlay') as HTMLElement;
    if (processingOverlay && processingOverlay.contains(target)) {
      // Prevent handling clicks on the processing overlay as outside clicks
      return;
    }
    
    // Check if we have any active processing overlay
    const hasActiveOverlay = document.querySelector('.quill-processing-overlay');
    
    // Only close dialog if clicking outside and we don't have active processing
    if (isClickOutside && !hasActiveOverlay) {
      SectionsDialog.closeSectionsDialog();
    }
  }
  
  /**
   * Safely closes the sections dialog
   */
  static closeSectionsDialog(): void {
    // Close the dialog
    if (SectionsDialog.dialog) {
      SectionsDialog.dialog.hide();
      return;
    }
    
    // Fallback to DOM querying if dialog property is not set
    const dialog = document.querySelector('.pdf-sections-dialog');
    const overlay = document.querySelector('.pdf-sections-dialog + div');
    
    if (dialog && dialog.parentNode && dialog.parentNode.contains(dialog)) {
      dialog.parentNode.removeChild(dialog);
    }
    
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    
    // Remove document click handler
    document.removeEventListener('click', SectionsDialog.handleOutsideClick);
  }
} 