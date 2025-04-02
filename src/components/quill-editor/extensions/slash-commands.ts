// Slash Commands module for Quill
export default class SlashCommands {
  quill: any;
  options: any;
  container: HTMLElement | null = null;
  isOpen: boolean = false;
  
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
      
      // Only close if click is outside both the container and the editor
      if (this.isOpen && 
          this.container && 
          !this.container.contains(e.target as Node) && 
          e.target !== this.container &&
          !this.quill.root.contains(e.target as Node)) {
        console.log('Click outside both menu and editor, closing');
        this.closeMenu();
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
    if (!this.isOpen || !this.container) return false;
    
    const items = Array.from(this.container.querySelectorAll('.ql-slash-command-item:not([style*="display: none"])'));
    const selectedItem = this.container.querySelector('.selected');
    
    if (items.length === 0) return false;
    
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
    
    return false; // Prevent default
  }
  
  handleArrowDown() {
    if (!this.isOpen || !this.container) return false;
    
    const items = Array.from(this.container.querySelectorAll('.ql-slash-command-item:not([style*="display: none"])'));
    const selectedItem = this.container.querySelector('.selected');
    
    if (items.length === 0) return false;
    
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
    
    return false; // Prevent default
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
}

interface CommandOption {
  label: string;
  icon?: string;
  description?: string;
  className?: string;
  handler: (quill: any, range: any) => void;
} 