// Slash Commands module for Quill

// Define interfaces for our data structures
interface ProcessedSection {
  element: HTMLElement;
  contentContainer: HTMLElement;
  loadingIndicator: HTMLElement;
  insertBtn: HTMLButtonElement;
  insertWithSummaryBtn: HTMLButtonElement;
  checkbox: HTMLInputElement;
  enhancedFormatBtn?: HTMLButtonElement;
  content: string;
  heading: string;
  summary: string;
  selected: boolean;
}

export default class SlashCommands {
  quill: any;
  options: any;
  container: HTMLElement | null = null;
  isOpen: boolean = false;
  
  // Add a property to track AI operation cancellation
  private aiOperationAborted = false;
  
  dialog: {
    containerEl: HTMLElement | null;
    hide: () => void;
  } | null;
  
  constructor(quill: any, options: any) {
    console.log('SlashCommands constructor initialized', { options });
    this.quill = quill;
    this.options = options;
    
    // Create container for the menu
    this.container = document.createElement('div');
    this.container.className = 'ql-slash-commands hidden';
    // Add a click handler to prevent clicks inside the container from bubbling
    this.container.addEventListener('click', (e) => {
      console.log('Click inside slash commands container');
      e.stopPropagation();
    });
    
    this.quill.container.appendChild(this.container);
    
    // Initialize events
    this.initializeEvents();
    console.log('SlashCommands initialization complete');
    
    this.aiOperationAborted = false;
    this.dialog = null;
  }
  
  initializeEvents() {
    console.log('SlashCommands.initializeEvents called');
    
    // Add direct keydown handler as backup for slash detection
    this.quill.root.addEventListener('keydown', (e: KeyboardEvent) => {
      console.log('SlashCommands: keydown detected', e.key);
      
      // If '/' is pressed, immediately show the menu
      if (e.key === '/' && !this.isOpen) {
        console.log('SlashCommands: slash key detected directly via keydown');
        
        // Prevent any default behavior that might interfere
        e.preventDefault();
        
        // Get current selection before inserting the slash
        const currentSelection = this.quill.getSelection();
        if (!currentSelection) return;
        
        // Insert the slash manually at the current selection
        this.quill.insertText(currentSelection.index, '/', 'user');
        
        // Update the selection to be after the inserted slash
        const newIndex = currentSelection.index + 1;
        this.quill.setSelection(newIndex, 0);
        
        // Now get the updated selection
        const updatedSelection = this.quill.getSelection();
        if (updatedSelection) {
          console.log('SlashCommands: Opening menu at updated caret position', updatedSelection);
          
          // Open menu with a slight delay to ensure the DOM has updated
          requestAnimationFrame(() => {
            this.openMenu(updatedSelection);
          });
        }
        
        // Prevent event propagation
        e.stopPropagation();
        return false;
      }
      
      // Handle Enter key press - prevent showing menu when Enter is pressed
      if (e.key === 'Enter' && !this.isOpen) {
        // Don't show menu on Enter
        console.log('Enter key pressed, preventing menu from opening');
      }
    });
    
    // Listen for text changes to detect when '/' is typed
    const textChangeHandler = (delta: any, oldDelta: any, source: string) => {
      // Skip processing if not user input or if there's no delta
      if (source !== 'user' || !delta.ops) {
        return;
      }
      
      console.log('Text change event triggered', { 
        source, 
        deltaOps: delta.ops
      });
      
      // Only check for slash character in insert operations
      const hasSlash = delta.ops.some((op: any) => 
        op.insert === '/' // Only exact slash inserts, not text with slash
      );
      
      // If we detected a standalone slash insertion and menu isn't open
      if (hasSlash && !this.isOpen) {
        console.log('SlashCommands: Standalone slash detected in delta ops!');
        
        // Get current selection
        const selection = this.quill.getSelection();
        if (!selection) {
          console.log('No selection found, cannot process slash command');
          return;
        }
        
        // Open the menu
        console.log('Slash command trigger detected, opening menu');
        this.openMenu(selection);
      } 
      // Only filter the menu if it's already open
      else if (this.isOpen) {
        // Get the text before the cursor to check for filtering
        const selection = this.quill.getSelection();
        if (!selection) return;
        
        const [line, offset] = this.quill.getLine(selection.index);
        if (!line || !line.domNode) return;
        
        const text = line.domNode.textContent.slice(0, offset);
        
        // If menu is open, filter based on text after slash
        const match = text.match(/\/([^/\s]*)$/);
        if (match) {
          console.log('Filtering menu with query:', match[1]);
          this.filterMenu(match[1]);
        } else {
          console.log('No filter match, closing menu');
          this.closeMenu();
        }
      }
    };
    
    console.log('Attaching text-change handler to Quill');
    this.quill.on('text-change', textChangeHandler);
    
    // Close menu on selection change - only if selection completely goes away
    const selectionChangeHandler = (range: any, oldRange: any, source: string) => {
      console.log('Selection change detected', { 
        range: !!range, 
        oldRange: !!oldRange,
        isOpen: this.isOpen, 
        source 
      });
      
      // If the menu is not open, don't try to show it on selection changes
      if (!this.isOpen) {
        return;
      }
      
      // Only close if there is no range at all (editor lost focus) and menu is open
      if (range === null) {
        console.log('Selection completely lost, closing menu');
        this.closeMenu();
      }
      
      // Check if this is a selection change due to Enter key
      // (selection moving to next line)
      if (range && oldRange && 
          range.index > oldRange.index && 
          source === 'user') {
        // This could be due to Enter key press, check if it's a newline
        const [newLine] = this.quill.getLine(range.index);
        const [oldLine] = this.quill.getLine(oldRange.index);
        
        if (newLine !== oldLine) {
          console.log('Selection moved to new line, closing menu');
          this.closeMenu();
        }
      }
    };
    
    console.log('Attaching selection-change handler to Quill');
    this.quill.on('selection-change', selectionChangeHandler);
    
    // Add document click handler but with a delay to avoid immediate execution
    let clickInProgress = false;
    const documentClickHandler = (e: MouseEvent) => {
      // Prevent duplicate processing during the same click
      if (clickInProgress) return;
      clickInProgress = true;
      
      console.log('Document click detected', { 
        isOpen: this.isOpen, 
        clickedOnContainer: this.container ? this.container.contains(e.target as Node) : false,
        clickedOnEditor: this.quill.root.contains(e.target as Node)
      });
      
      // Check if click is on a processing overlay
      const clickedOnOverlay = !!document.querySelector('.pdf-processing-overlay') && 
                            (e.target as Element)?.closest('.pdf-processing-overlay');
      
      // Only close if click is outside both the container and the editor
      if (this.isOpen && 
          this.container && 
          !this.container.contains(e.target as Node) && 
          e.target !== this.container &&
          !this.quill.root.contains(e.target as Node)) {
        console.log('Click outside both menu and editor, closing');
        this.closeMenu();
      }
      
      // Check for clicks outside processing overlay
      if (!clickedOnOverlay) {
        // If processing has been going on for too long (more than 60 seconds),
        // allow user to cancel by clicking outside
        const overlays = document.querySelectorAll('.pdf-processing-overlay');
        if (overlays.length > 0) {
          // Check if any overlay has been open for too long
          const currentTime = new Date().getTime();
          const overlayStartTime = parseInt(overlays[0].getAttribute('data-start-time') || '0', 10);
          
          if (currentTime - overlayStartTime > 60000) {
            console.log('Processing taking too long, allowing cancel on outside click');
            this.aiOperationAborted = true;
            this.clearAllProcessingOverlays();
          }
        }
      }
      
      // Reset clickInProgress after a short delay
      setTimeout(() => {
        clickInProgress = false;
      }, 100);
    };
    
    console.log('Attaching click handler to document');
    document.addEventListener('click', documentClickHandler);
    
    // Add keyboard navigation
    try {
      // Make sure Quill keyboard is initialized
      if (!this.quill.keyboard) {
        console.error('Quill keyboard module not available');
        return;
      }
      
      console.log('Adding arrow up binding');
      this.quill.keyboard.addBinding({
        key: 38, // Arrow up
      }, this.handleArrowUp.bind(this));
      
      console.log('Adding arrow down binding');
      this.quill.keyboard.addBinding({
        key: 40, // Arrow down
      }, this.handleArrowDown.bind(this));
      
      console.log('Adding enter binding');
      // Only bind Enter key when the menu is open
      this.quill.keyboard.addBinding({
        key: 13, // Enter
        handler: (range: any, context: any) => {
          // Only handle this binding if menu is open
          if (this.isOpen) {
            return this.handleEnter();
          }
          // Otherwise let default Enter behavior occur
          return true;
        }
      });
      
      console.log('Adding escape binding');
      this.quill.keyboard.addBinding({
        key: 27, // Escape
      }, this.handleEscape.bind(this));
      
      console.log('Keyboard bindings added successfully');
    } catch (error) {
      console.error('Error adding keyboard bindings:', error);
    }
  }
  
  openMenu(selection: any) {
    if (!this.container) {
      console.error('openMenu: Container is null');
      return;
    }
    
    console.log('Opening slash commands menu');
    
    // If already open, don't reopen
    if (this.isOpen) {
      console.log('Menu already open, not reopening');
      return;
    }
    
    this.isOpen = true;
    
    // Get the exact caret position
    const bounds = this.quill.getBounds(selection.index);
    console.log('Caret position (bounds):', bounds);
    
    // Get editor position
    const editorRect = this.quill.container.getBoundingClientRect();
    console.log('Editor position:', editorRect);
    
    // Calculate exact position right next to the caret
    // We use the right edge of the caret, no additional offset
    const caretRight = bounds.left + bounds.width;
    
    // Calculate absolute position in the viewport
    const absoluteTop = editorRect.top + bounds.top + window.scrollY;
    const absoluteLeft = editorRect.left + caretRight + window.scrollX;
    
    console.log('Calculated menu position:', { absoluteTop, absoluteLeft });
    
    // Set position as fixed coordinates
    this.container.style.top = `${absoluteTop}px`;
    this.container.style.left = `${absoluteLeft}px`;
    
    // Make sure we're within the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 350; // our fixed width from CSS
    const menuHeight = 300; // max-height from CSS
    
    // Check if menu would go off right edge
    if (absoluteLeft + menuWidth > viewportWidth) {
      // Position to the left of the caret instead
      const newLeft = editorRect.left + bounds.left - menuWidth + window.scrollX;
      
      // If that would go off the left edge, just stick to the left edge
      this.container.style.left = `${Math.max(5, newLeft)}px`;
      console.log('Adjusted left position to fit viewport:', this.container.style.left);
    }
    
    // Check if menu would go off bottom edge
    if (absoluteTop + menuHeight > viewportHeight + window.scrollY) {
      // Position above the caret instead
      const newTop = editorRect.top + bounds.top - menuHeight + window.scrollY;
      this.container.style.top = `${newTop}px`;
      console.log('Adjusted top position to fit viewport:', this.container.style.top);
    }
    
    // Populate the menu with options
    this.populateMenu();
    
    // Show the menu
    this.container.classList.remove('hidden');
    
    // Set a very large size to make it super visible for debugging
    this.container.style.minHeight = '150px';
    this.container.style.minWidth = '350px';
    
    console.log('Menu should be visible now', {
      isHidden: this.container.classList.contains('hidden'),
      style: {
        top: this.container.style.top,
        left: this.container.style.left,
        display: window.getComputedStyle(this.container).display
      }
    });
    
    // Add an animation for visibility
    // this.container.style.animation = 'none';
    void this.container.offsetWidth; // Trigger reflow
    this.container.style.animation = 'fadeIn 0.2s ease-in-out';
    
    // Make sure the menu is in front of everything
    this.container.style.zIndex = '9999';
    
    // Add a title attribute for easier debugging
    this.container.title = 'Slash Commands Menu';
    
    // Add a fixed label to the top of the menu for debugging
    const debugLabel = document.createElement('div');
    // debugLabel.textContent = 'SLASH COMMANDS MENU';
    // debugLabel.style.padding = '8px';
    // debugLabel.style.background = '#29094b';
    // debugLabel.style.color = 'white';
    // debugLabel.style.fontWeight = 'bold';
    // debugLabel.style.textAlign = 'center';
    this.container.insertBefore(debugLabel, this.container.firstChild);
  }
  
  populateMenu() {
    if (!this.container) {
      console.error('populateMenu: Container is null');
      return;
    }
    
    // Clear existing content
    this.container.innerHTML = '';
    
    // Add menu items based on your options
    const commandOptions = this.options.commands || [];
    console.log('Populating menu with commands', { 
      commandCount: commandOptions.length,
      commands: commandOptions.map((cmd: CommandOption) => ({
        label: cmd.label,
        hasHandler: !!cmd.handler,
        className: cmd.className
      }))
    });
    
    // Add PDF Upload Command if not already in options
    const hasPdfUploadCommand = commandOptions.some((cmd: CommandOption) => 
      cmd.label.toLowerCase() === 'upload pdf'
    );
    
    if (!hasPdfUploadCommand) {
      // Add the PDF upload command to the beginning of commands
      commandOptions.unshift({
        label: 'Upload PDF',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-6"></path><path d="M9 15h6"></path></svg>',
        description: 'Upload and process a PDF document',
        className: 'ai-command',
        handler: (quill: any, range: any) => this.handlePdfUpload(quill, range)
      });
    }
    
    commandOptions.forEach((command: any, index: number) => {
      const item = document.createElement('div');
      item.className = 'ql-slash-command-item';
      
      // Add custom class if provided
      if (command.className) {
        console.log(`Adding custom class ${command.className} to command ${command.label}`);
        item.classList.add(command.className);
      }
      
      item.dataset.command = command.label.toLowerCase().replace(/\s+/g, '-');
      
      // Add icon if available
      if (command.icon) {
        const icon = document.createElement('span');
        icon.className = 'ql-slash-command-icon';
        icon.innerHTML = command.icon;
        item.appendChild(icon);
      }
      
      // Create text container
      const textContainer = document.createElement('div');
      textContainer.className = 'ql-slash-command-text';
      
      // Add label
      const label = document.createElement('div');
      label.className = 'ql-slash-command-label';
      label.textContent = command.label;
      textContainer.appendChild(label);
      
      // Add description if available
      if (command.description) {
        const description = document.createElement('div');
        description.className = 'ql-slash-command-description';
        description.textContent = command.description;
        textContainer.appendChild(description);
      }
      
      item.appendChild(textContainer);
      
      // Add handler for click with error handling
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Menu item clicked:', {
          label: command.label,
          index,
          hasHandler: !!command.handler
        });

        // Ensure editor is focused
        this.quill.focus();

        try {
          this.executeCommand(command);
        } catch (error) {
          console.error('Error handling menu item click:', error);
        }
      });
      
      // Append to container
      if (this.container) {
        this.container.appendChild(item);
      }
    });
  }
  
  filterMenu(query: string) {
    if (!this.container) return;
    
    // Filter menu items based on the query
    const items = this.container.querySelectorAll('.ql-slash-command-item');
    let hasVisibleItems = false;
    
    items.forEach((item) => {
      const label = item.querySelector('.ql-slash-command-label')?.textContent || '';
      
      if (label.toLowerCase().includes(query.toLowerCase())) {
        (item as HTMLElement).style.display = 'flex';
        hasVisibleItems = true;
      } else {
        (item as HTMLElement).style.display = 'none';
      }
    });
    
    // If no items match, close the menu
    if (!hasVisibleItems) {
      this.closeMenu();
    }
  }
  
  executeCommand(command: any) {
    console.log('Executing command:', {
      commandLabel: command.label,
      commandType: command.type,
      commandHandler: !!command.handler
    });

    // Store the current selection before any DOM changes
    const selection = this.quill.getSelection();
    if (!selection) {
      console.error('No selection found when executing command');
      return;
    }

    console.log('Current selection:', selection);

    // Get the line and offset before any changes
    const [line, offset] = this.quill.getLine(selection.index);
    if (!line || !line.domNode) {
      console.error('Could not get line information');
      return;
    }

    const text = line.domNode.textContent;
    const slashIndex = text.lastIndexOf('/');

    if (slashIndex !== -1) {
      const charsToDelete = offset - slashIndex;
      console.log('Deleting slash command text:', {
        startIndex: selection.index - charsToDelete,
        charsToDelete,
        textToDelete: text.slice(slashIndex, offset)
      });

      // Delete the slash command text
      this.quill.deleteText(selection.index - charsToDelete, charsToDelete, 'user');

      // Update selection after deletion
      const newIndex = selection.index - charsToDelete;
      this.quill.setSelection(newIndex, 0, 'user');

      // Run the command with error handling
      try {
        console.log('Executing command handler with range:', {
          index: newIndex,
          length: 0
        });

        // Ensure we're still focused on the editor
        this.quill.focus();

        // Execute the command handler
        command.handler(this.quill, { index: newIndex, length: 0 });

        console.log('Command handler executed successfully');

        // Force a format update based on command type
        if (command.label.toLowerCase().includes('heading')) {
          const level = parseInt(command.label.split(' ')[1]);
          this.quill.formatLine(newIndex, 1, 'header', level, 'user');
        } else if (command.label.toLowerCase().includes('list')) {
          const type = command.label.toLowerCase().includes('bullet') ? 'bullet' : 'ordered';
          this.quill.formatLine(newIndex, 1, 'list', type, 'user');
        } else if (command.label.toLowerCase().includes('quote')) {
          this.quill.formatLine(newIndex, 1, 'blockquote', true, 'user');
        } else if (command.label.toLowerCase().includes('code')) {
          this.quill.formatLine(newIndex, 1, 'code-block', true, 'user');
        }

        // Ensure the editor maintains focus
        setTimeout(() => {
          this.quill.focus();
          this.quill.setSelection(newIndex, 0, 'user');
        }, 0);

      } catch (error) {
        console.error('Error executing command handler:', error);
        // Attempt to recover by inserting a newline
        this.quill.insertText(newIndex, '\n', 'user');
      }
    }

    // Close the menu after a short delay to ensure the command is executed
    setTimeout(() => {
      this.closeMenu();
    }, 100);
  }
  
  handleArrowUp() {
    // Only prevent default and handle arrow keys when menu is open
    if (!this.isOpen || !this.container) return true; // Let default arrow behavior happen when menu is closed
    
    const items = Array.from(this.container.querySelectorAll('.ql-slash-command-item:not([style*="display: none"])'));
    const selectedItem = this.container.querySelector('.selected');
    
    if (items.length === 0) return true; // No items to navigate, let default arrow behavior happen
    
    let index = -1;
    if (selectedItem) {
      index = items.indexOf(selectedItem as Element);
      selectedItem.classList.remove('selected');
      index = (index - 1 + items.length) % items.length;
    } else {
      index = items.length - 1;
    }
    
    const item = items[index] as HTMLElement;
    item.classList.add('selected');
    
    // Ensure the selected item is visible
    item.scrollIntoView({ block: 'nearest' });
    
    return false; // Prevent default only when we've handled the arrow key for the menu
  }
  
  handleArrowDown() {
    // Only prevent default and handle arrow keys when menu is open
    if (!this.isOpen || !this.container) return true; // Let default arrow behavior happen when menu is closed
    
    const items = Array.from(this.container.querySelectorAll('.ql-slash-command-item:not([style*="display: none"])'));
    const selectedItem = this.container.querySelector('.selected');
    
    if (items.length === 0) return true; // No items to navigate, let default arrow behavior happen
    
    let index = -1;
    if (selectedItem) {
      index = items.indexOf(selectedItem as Element);
      selectedItem.classList.remove('selected');
      index = (index + 1) % items.length;
    } else {
      index = 0;
    }
    
    const item = items[index] as HTMLElement;
    item.classList.add('selected');
    
    // Ensure the selected item is visible
    item.scrollIntoView({ block: 'nearest' });
    
    return false; // Prevent default only when we've handled the arrow key for the menu
  }
  
  handleEnter() {
    // Only handle Enter if the menu is already open
    if (!this.isOpen || !this.container) {
      console.log('Enter pressed, but menu not open - taking no action');
      return true; // Allow default behavior (new line)
    }
    
    console.log('Enter key pressed while menu is open');
    const selectedItem = this.container.querySelector('.ql-slash-command-item.selected') as HTMLElement;
    
    if (selectedItem) {
      console.log('Selected item found:', {
        label: selectedItem.querySelector('.ql-slash-command-label')?.textContent,
        command: selectedItem.dataset.command
      });
      // Simulate a click on the selected item
      selectedItem.click();
      return false; // Prevent default
    }
    
    // If no item is selected but menu is open, select the first visible item
    const firstItem = this.container.querySelector('.ql-slash-command-item:not([style*="display: none"])') as HTMLElement;
    if (firstItem) {
      console.log('No selected item, selecting and clicking first item:', {
        label: firstItem.querySelector('.ql-slash-command-label')?.textContent,
        command: firstItem.dataset.command
      });
      firstItem.click();
      return false; // Prevent default
    }
    
    // If no items at all, close the menu
    console.log('No items found in menu, closing');
    this.closeMenu();
    return true; // Allow default behavior (new line)
  }
  
  handleEscape() {
    if (this.isOpen) {
      this.closeMenu();
      return false; // Prevent default
    }
    
    return true; // Let Quill handle it normally
  }
  
  closeMenu() {
    console.log('Closing slash commands menu');
    if (this.container) {
      this.container.classList.add('hidden');
      this.isOpen = false;
    }
  }
  
  // Handle PDF upload
  handlePdfUpload(quill: any, range: any) {
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
        await this.processPdf(file, range);
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
  
  async processPdf(file: File, range: any) {
    console.log('Processing PDF file', { fileName: file.name, fileSize: file.size });
    
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
    
    // Create a dialog to display sections
    this.showSectionsDialog(sections, range);
  }
  
  async showSectionsDialog(sections: string[], range: any) {
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
      // Get all selected sections
      const selectedSections = processedSections.filter(section => section.checkbox.checked);
      
      if (selectedSections.length === 0) {
        return;
      }
      
      // Get enhanced formatting preference
      const useEnhancedFormatting = enhancedFormatCheckbox.checked;
      
      // Insert all selected sections with or without enhanced formatting
      if (useEnhancedFormatting) {
        this.insertMultipleSectionsEnhanced(selectedSections, range);
      } else {
        this.insertMultipleSectionsStandard(selectedSections, range);
      }
      
      // Close the dialog
      const dialog = document.querySelector('.pdf-sections-dialog');
      const overlay = document.querySelector('.pdf-sections-dialog + div');
      
      if (dialog && dialog.parentNode && dialog.parentNode.contains(dialog)) {
        dialog.parentNode.removeChild(dialog);
      }
      
      if (overlay && overlay.parentNode && overlay.parentNode.contains(overlay)) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    // Process sections with AI in the background
    this.processSectionsWithAI(processedSections, range, insertAllBtn, selectAllCheckbox);
    
    // Set dialog property for outside click handling
    this.dialog = {
      containerEl: dialog,
      hide: () => {
        if (dialog && dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
          
          // Clear any overlays
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }
        this.dialog = null;
      }
    };
    
    // Add document click handler to close dialog when clicking outside
    document.addEventListener('click', this.handleOutsideClick);
  }
  
  async processSectionsWithAI(
    sections: ProcessedSection[], 
    range: any, 
    insertAllBtn?: HTMLButtonElement, 
    selectAllCheckbox?: HTMLInputElement
  ) {
    // Function to generate title and summary using the same AI system used for other features
    const generateTitleAndSummary = async (content: string) => {
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
        this.quill.root.dispatchEvent(aiGenerateEvent);
        
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
    };
    
    // Initialize counter for completed sections
    let completedSections = 0;
    
    // Process each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      try {
        // Generate title and summary
        const { heading, summary } = await generateTitleAndSummary(section.content);
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
          this.insertSectionContent(section.content, range);
        };
        
        section.insertWithSummaryBtn.onclick = () => {
          this.insertSectionWithSummary(section.heading, section.summary, section.content, range);
        };
        
        section.enhancedFormatBtn.onclick = async () => {
          enhancedFormatBtn.textContent = 'Formatting...';
          enhancedFormatBtn.disabled = true;
          await this.insertEnhancedContent(section.heading, section.summary, section.content, range);
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
          this.insertSectionContent(section.content, range);
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
  
  // Create an improved loading overlay with cancel button
  showProcessingOverlay(message: string): { update: (newMessage: string) => void, close: () => void } {
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
      this.aiOperationAborted = true;
      
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
      
      // Ensure markdown processing is re-enabled
      if (this.quill) {
        const markdownModule = this.quill.getModule('markdown');
        if (markdownModule && markdownModule.options) {
          markdownModule.options.enabled = true;
        }
      }
    };
    
    return { update, close };
  }
  
  // Modify the formatContentWithAI method to include better markdown formatting instructions that account for proper indentation and structure.
  async formatContentWithAI(content: string, heading: string): Promise<string> {
    if (!this.quill) throw new Error('Quill instance not available');
    
    // Get markdown module to manage its state
    const markdownModule = this.quill.getModule('markdown');
    const wasEnabled = markdownModule?.options?.enabled || false;
    
    // Disable markdown processing during the operation to prevent interference
    if (markdownModule && markdownModule.options) {
      markdownModule.options.enabled = false;
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Reset abort flag
        this.aiOperationAborted = false;
        
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
          if (this.aiOperationAborted) {
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
  
  // Update insertEnhancedContent to better handle clean up
  async insertEnhancedContent(heading: string, summary: string, content: string, range: any) {
    if (!this.quill) return;
    
    try {
      // Format the content with AI
      const formattedContent = await this.formatContentWithAI(content, heading);
      
      // Check if operation was aborted
      if (this.aiOperationAborted) {
        console.log('Enhanced formatting was cancelled');
        return;
      }
      
      // Build the formatted section
      const formattedSection = `## ${heading}\n\n*${summary}*\n\n${formattedContent}\n\n`;
      
      // Close the dialog first
      this.closeSectionsDialog();
      
      // Force cleanup of all overlays
      this.clearAllProcessingOverlays();
      
      // Insert the formatted content with safety debounce
      this.safeInsertText(range.index, formattedSection);
    } catch (error) {
      console.error('Error inserting enhanced content:', error);
      
      // If the operation was cancelled, don't do anything else
      if (error instanceof Error && error.message === 'Operation cancelled by user') {
        return;
      }
      
      // Fallback to regular insertion with summary if enhanced formatting fails for other reasons
      this.insertSectionWithSummary(heading, summary, content, range);
    } finally {
      // Ensure the dialog is closed
      this.closeSectionsDialog();
      
      // Force cleanup of all overlays
      this.clearAllProcessingOverlays();
    }
  }
  
  // Update insertMultipleSectionsStandard to use a better section divider
  insertMultipleSectionsStandard(sections: ProcessedSection[], range: any) {
    if (!this.quill) return;
    
    let combinedContent = '';
    let insertIndex = range.index;
    
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
    this.clearAllProcessingOverlays();
    
    // Insert the combined content with safety debounce
    this.safeInsertText(insertIndex, combinedContent);
  }
  
  // Update insertMultipleSectionsEnhanced to use the same section divider style
  async insertMultipleSectionsEnhanced(sections: ProcessedSection[], range: any) {
    if (!this.quill) return;
    
    // Reset abortion flag
    this.aiOperationAborted = false;
    
    // Get markdown module and save its state
    const markdownModule = this.quill.getModule('markdown');
    const wasMarkdownEnabled = markdownModule?.options?.enabled || false;
    
    // Temporarily disable markdown processing during bulk operations
    if (markdownModule && markdownModule.options) {
      markdownModule.options.enabled = false;
    }
    
    // Create a variable to track if we've shown the overlay
    let overlay: { update: (message: string) => void; close: () => void } | null = null;
    
    try {
      // Show the processing overlay
      overlay = this.showProcessingOverlay(`Processing ${sections.length} sections...`);
      
      // Close the dialog early to show progress
      this.closeSectionsDialog();
      
      // Insert at cursor position
      let combinedContent = '';
      
      // Process each section with enhanced formatting
      for (let i = 0; i < sections.length; i++) {
        // Check if operation was aborted
        if (this.aiOperationAborted) {
          console.log('Enhanced formatting was cancelled');
          break;
        }
        
        const section = sections[i];
        if (overlay) {
          overlay.update(`Processing section ${i+1} of ${sections.length}...`);
        }
        
        try {
          // Format the content
          const formattedContent = await this.formatContentWithAI(section.content, section.heading);
          
          // Check if operation was aborted during content formatting
          if (this.aiOperationAborted) {
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
        this.safeInsertText(range.index, combinedContent);
        
        // Make sure markdown processing is triggered after insertion
        setTimeout(() => {
          this.ensureMarkdownProcessed();
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
      this.clearAllProcessingOverlays();
    }
  }
  
  // Helper method to safely close the dialog
  closeSectionsDialog() {
    // Close the dialog
    if (this.dialog) {
      this.dialog.hide();
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
    document.removeEventListener('click', this.handleOutsideClick);
  }
  
  // Update other methods to use the safelyCloseDialog helper
  insertSectionContent(content: string, range: any) {
    if (!this.quill) return;
    
    // Close the dialog first
    this.closeSectionsDialog();
    
    // Force cleanup of all overlays
    this.clearAllProcessingOverlays();
    
    // Insert content at the cursor position with safety debounce
    this.safeInsertText(range.index, content);
  }
  
  insertSectionWithSummary(heading: string, summary: string, content: string, range: any) {
    if (!this.quill) return;
    
    // Format the content with heading and summary
    const formattedContent = `## ${heading}\n\n*${summary}*\n\n${content}\n\n`;
    
    // Close the dialog first
    this.closeSectionsDialog();
    
    // Force cleanup of all overlays
    this.clearAllProcessingOverlays();
    
    // Insert at cursor position with safety debounce
    this.safeInsertText(range.index, formattedContent);
  }
  
  // Method to handle selecting between standard and enhanced formatting
  insertMultipleSections(sections: ProcessedSection[], range: any) {
    if (!this.quill) return;
    
    // Check if the toggle was set (if available)
    const enhancedFormatToggle = document.getElementById('enhanced-format') as HTMLInputElement;
    const useEnhanced = enhancedFormatToggle ? enhancedFormatToggle.checked : false;
    
    if (useEnhanced) {
      this.insertMultipleSectionsEnhanced(sections, range);
    } else {
      this.insertMultipleSectionsStandard(sections, range);
    }
  }
  
  // Force clear all processing overlays from the document
  clearAllProcessingOverlays() {
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
    this.aiOperationAborted = false;
    
    // Make sure markdown processing is enabled and content is processed
    if (this.quill) {
      // Wait a small amount of time to ensure the DOM has settled
      setTimeout(() => {
        this.ensureMarkdownProcessed();
      }, 50);
    }
    
    console.log('All processing overlays cleared');
  }

  // Safe text insertion with debouncing
  safeInsertText(index: number, text: string) {
    if (!this.quill) return;
    
    // Get markdown module and ensure it's enabled
    const markdownModule = this.quill.getModule('markdown');
    const wasEnabled = markdownModule?.options?.enabled;
    
    try {
      // Insert with a small delay to make sure DOM has settled
      setTimeout(() => {
        try {
          // Insert the text
          this.quill.insertText(index, text, 'user');
          
          // Focus the editor
          this.quill.focus();
          
          // Set selection after the inserted text
          this.quill.setSelection(index + text.length, 0);
          
          // Add a small delay before processing markdown
          setTimeout(() => {
            // Explicitly trigger markdown processing after insertion
            this.ensureMarkdownProcessed();
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

  handleOutsideClick = (event: MouseEvent) => {
    // If no quill editor, do nothing
    if (!this.quill) return;
    
    // Check if clicking outside the dialog
    const target = event.target as HTMLElement;
    const isClickOutside = this.dialog && 
      this.dialog.containerEl && 
      !this.dialog.containerEl.contains(target);
    
    // Handle processing overlay clicks
    const processingOverlay = document.querySelector('.quill-processing-overlay') as HTMLElement;
    if (processingOverlay && processingOverlay.contains(target)) {
      // Check if the processing has been taking too long (60 seconds)
      const startTime = parseInt(processingOverlay.getAttribute('data-start-time') || '0', 10);
      const currentTime = new Date().getTime();
      
      if (currentTime - startTime > 60000) {
        console.log('Processing is taking too long, allowing cancellation on click');
        this.aiOperationAborted = true;
        this.clearAllProcessingOverlays();
      }
      
      // Prevent handling clicks on the processing overlay as outside clicks
      return;
    }
    
    // Check if we have any active processing overlay
    const hasActiveOverlay = document.querySelector('.quill-processing-overlay');
    
    // Only close dialog if clicking outside and we don't have active processing
    if (isClickOutside && !hasActiveOverlay) {
      this.closeSectionsDialog();
    }
    
    // Track active processing for debugging
    if (hasActiveOverlay) {
      console.log('Active processing overlay detected, not closing dialog on outside click');
    }
  }

  // Keep the old method for backward compatibility
  safelyCloseDialog() {
    this.closeSectionsDialog();
  }

  // Add destroy method to clean up
  destroy() {
    // Remove all event listeners
    document.removeEventListener('click', this.handleOutsideClick);
    
    // Close any open dialog
    this.closeSectionsDialog();
    
    // Remove any processing overlays
    this.clearAllProcessingOverlays();
    
    console.log('SlashCommands module cleaned up');
  }

  // Helper to manage Markdown processing and ensure re-rendering
  ensureMarkdownProcessed() {
    if (!this.quill) return;
    
    try {
      // Get the markdown module
      const markdownModule = this.quill.getModule('markdown');
      
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
      const range = this.quill.getSelection();
      if (range) {
        console.log('Triggering text-change with dummy edit');
        
        // Store the original content at this position
        const originalContent = this.quill.getText(range.index, 1);
        
        // Make a small change
        this.quill.insertText(range.index, ' ', 'api');
        
        // And undo it right away
        this.quill.deleteText(range.index, 1, 'api');
        
        // Restore anything we might have overwritten
        if (originalContent) {
          this.quill.insertText(range.index, originalContent, 'api');
        }
        
        // Reset selection
        this.quill.setSelection(range.index, 0);
      }
      
      console.log('Markdown processing completed');
    } catch (err) {
      console.error('Error in ensureMarkdownProcessed:', err);
    }
  }
}

interface CommandOption {
  label: string;
  icon?: string;
  description?: string;
  className?: string;
  handler: (quill: any, range: any) => void;
}

// Add PDF.js type definition for TypeScript
declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (params: { data: Uint8Array }) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNum: number) => Promise<{
            getTextContent: () => Promise<{
              items: Array<{ str: string }>;
            }>;
          }>;
        }>;
      };
    };
  }
} 