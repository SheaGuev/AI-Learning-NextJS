// Sections dialog for PDF processing
import { Dialog, ProcessedSection } from '../interfaces';

export default class SectionsDialog {
  private static dialog: Dialog | null = null;
  
  /**
   * Shows a dialog with PDF sections for processing
   */
  static showSectionsDialog(quill: any, sections: string[], range: any): void {
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
    
    // Enhanced formatting toggle
    const enhancedFormatContainer = document.createElement('div');
    enhancedFormatContainer.style.display = 'flex';
    enhancedFormatContainer.style.alignItems = 'center';
    
    const enhancedFormatCheckbox = document.createElement('input');
    enhancedFormatCheckbox.type = 'checkbox';
    enhancedFormatCheckbox.id = 'enhanced-format';
    enhancedFormatCheckbox.className = 'pdf-section-checkbox';
    enhancedFormatCheckbox.style.marginRight = '8px';
    enhancedFormatCheckbox.checked = true; // Enable by default
    
    const enhancedFormatLabel = document.createElement('label');
    enhancedFormatLabel.htmlFor = 'enhanced-format';
    enhancedFormatLabel.textContent = 'Enhanced Formatting';
    enhancedFormatLabel.style.color = '#fff';
    enhancedFormatLabel.style.cursor = 'pointer';
    
    // Add tooltip or info icon
    const infoIcon = document.createElement('span');
    infoIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    infoIcon.style.marginLeft = '4px';
    infoIcon.style.color = '#0ea5e9';
    infoIcon.style.cursor = 'help';
    infoIcon.title = 'Use AI to improve readability and formatting (takes longer but produces better results)';
    
    enhancedFormatContainer.appendChild(enhancedFormatCheckbox);
    enhancedFormatContainer.appendChild(enhancedFormatLabel);
    enhancedFormatContainer.appendChild(infoIcon);
    
    // Add elements to left controls
    leftControls.appendChild(selectAllContainer);
    leftControls.appendChild(enhancedFormatContainer);
    
    // Insert All button
    const insertAllBtn = document.createElement('button');
    insertAllBtn.textContent = 'Insert All Selected';
    insertAllBtn.className = 'pdf-section-button primary';
    insertAllBtn.disabled = true; // Disabled until sections are loaded
    
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
      loadingIndicator.textContent = 'Analyzing...';
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
      
      const insertBtn = document.createElement('button');
      insertBtn.textContent = 'Insert Content';
      insertBtn.className = 'pdf-section-button';
      insertBtn.style.backgroundColor = '#4b5563';
      insertBtn.style.color = '#fff';
      insertBtn.style.border = 'none';
      insertBtn.style.borderRadius = '4px';
      insertBtn.style.padding = '8px 12px';
      insertBtn.style.cursor = 'pointer';
      insertBtn.style.fontSize = '14px';
      
      const insertWithSummaryBtn = document.createElement('button');
      insertWithSummaryBtn.textContent = 'Insert with Summary';
      insertWithSummaryBtn.className = 'pdf-section-button primary';
      insertWithSummaryBtn.style.backgroundColor = '#6d28d9';
      insertWithSummaryBtn.style.color = '#fff';
      insertWithSummaryBtn.style.border = 'none';
      insertWithSummaryBtn.style.borderRadius = '4px';
      insertWithSummaryBtn.style.padding = '8px 12px';
      insertWithSummaryBtn.style.cursor = 'pointer';
      insertWithSummaryBtn.style.fontSize = '14px';
      
      // Disable buttons until analysis is complete
      insertBtn.disabled = true;
      insertWithSummaryBtn.disabled = true;
      
      buttonsContainer.appendChild(insertBtn);
      buttonsContainer.appendChild(insertWithSummaryBtn);
      
      // Assemble section
      sectionEl.appendChild(sectionHeader);
      sectionEl.appendChild(contentContainer);
      sectionEl.appendChild(buttonsContainer);
      
      sectionsContainer.appendChild(sectionEl);
      
      // Store section information for later processing
      processedSections.push({
        element: sectionEl,
        contentContainer,
        loadingIndicator,
        insertBtn,
        insertWithSummaryBtn,
        checkbox,
        content: section,
        heading: '',
        summary: '',
        selected: false
      });
    }
    
    dialog.appendChild(sectionsContainer);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1999';
    overlay.setAttribute('data-start-time', new Date().getTime().toString());
    
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
      insertAllBtn.disabled = !isChecked;
    });
    
    // Handle insert all button
    insertAllBtn.addEventListener('click', () => {
      const selectedSections = processedSections.filter(s => s.selected);
      if (selectedSections.length === 0) return;
      
      // Dispatch custom event instead of calling PdfProcessor directly
      const event = new CustomEvent('pdf-insert-sections', {
        detail: {
          sections: selectedSections,
          range,
          enhanced: enhancedFormatCheckbox.checked
        }
      });
      document.dispatchEvent(event);
      
      // Close dialog
      SectionsDialog.closeSectionsDialog();
    });
    
    // Start processing sections with AI
    const processSections = () => {
      // Dispatch event instead of calling PdfProcessor directly
      const event = new CustomEvent('pdf-process-sections', {
        detail: {
          sections: processedSections,
          range,
          insertAllBtn,
          selectAllCheckbox
        }
      });
      document.dispatchEvent(event);
    };
    
    // Start processing sections with AI after a short delay
    setTimeout(processSections, 100);
    
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