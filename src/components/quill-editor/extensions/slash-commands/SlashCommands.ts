// Main SlashCommands class for Quill editor
import { CommandOption, Dialog } from './interfaces';
import { MenuBuilder } from './ui/MenuBuilder';
import { PdfProcessor } from './pdf-processing/PdfProcessor';
import { OverlayManager } from './ui/OverlayManager';
import { ContentFormatter } from './ai-helpers/ContentFormatter';

export default class SlashCommands {
  quill: any;
  options: any;
  container: HTMLElement | null = null;
  isOpen: boolean = false;
  dialog: Dialog | null = null;
  
  constructor(quill: any, options: any) {
    console.log('SlashCommands constructor initialized', { options });
    this.quill = quill;
    this.options = options;
    
    // Ensure AI generate command is available
    if (this.options.commands) {
      // Check if AI generate command already exists
      const hasAiCommand = this.options.commands.some((cmd: CommandOption) => 
        cmd.label.toLowerCase().includes('ai') || 
        cmd.label.toLowerCase().includes('generate')
      );
      
      // If no AI command exists, add it
      if (!hasAiCommand) {
        console.log('Adding AI generate command to options');
        this.options.commands.push({
          label: 'AI Generate',
          icon: '✨',
          description: 'Generate content using AI',
          handler: (quill: any, range: any) => {
            console.log('AI Generate command executed', { range });
            
            // Ensure we have a valid range
            if (!range) {
              console.warn('No range provided for AI generate command');
              range = { index: quill.getLength() - 1, length: 0 };
            }
            
            // Dispatch AI generate event
            const event = new CustomEvent('ai-generate', {
              detail: { quill, range }
            });
            document.dispatchEvent(event);
          }
        });
      }
    }
    
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
            OverlayManager.setOperationAborted(true);
            OverlayManager.clearAllProcessingOverlays();
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
    
    // Add an animation for visibility
    // this.container.style.animation = 'none';
    void this.container.offsetWidth; // Trigger reflow
    this.container.style.animation = 'fadeIn 0.2s ease-in-out';
    
    // Make sure the menu is in front of everything
    this.container.style.zIndex = '9999';
  }
  
  populateMenu() {
    if (!this.container) {
      console.error('populateMenu: Container is null');
      return;
    }
    
    // Get command options and modify the PDF upload command to use our handler
    const commands = [...(this.options.commands || [])];
    
    // Log all available commands to verify AI command exists
    console.log('Available commands:', commands.map(cmd => ({
      label: cmd.label,
      hasHandler: !!cmd.handler,
      isAiCommand: cmd.label.toLowerCase().includes('ai') || cmd.label.toLowerCase().includes('generate')
    })));
    
    // Create a function to execute commands with context
    const executeCommand = (command: CommandOption) => {
      // Special logging for AI-related commands
      if (command.label.toLowerCase().includes('ai') || command.label.toLowerCase().includes('generate')) {
        console.log('AI COMMAND SELECTED:', {
          label: command.label,
          hasHandler: !!command.handler,
          handlerType: typeof command.handler,
          selection: this.quill.getSelection()
        });
      }
      this.executeCommand(command);
    };
    
    // Use the menu builder utility
    MenuBuilder.buildCommandMenu(this.container, commands, executeCommand);
  }
  
  filterMenu(query: string) {
    if (!this.container) return;
    
    // Use the menu builder utility
    const hasVisibleItems = MenuBuilder.filterMenu(this.container, query);
    
    // If no items match, close the menu
    if (!hasVisibleItems) {
      this.closeMenu();
    }
  }
  
  executeCommand(command: CommandOption) {
    // Special detailed logging for AI commands
    const isAiCommand = command.label.toLowerCase().includes('ai') || command.label.toLowerCase().includes('generate');
    
    console.log('Executing command:', {
      commandLabel: command.label,
      hasHandler: !!command.handler,
      isAiCommand,
      handlerType: typeof command.handler,
      handlerString: isAiCommand ? command.handler.toString().slice(0, 100) + '...' : null
    });

    // Store the current selection before any DOM changes
    let selection = this.quill.getSelection();
    
    if (isAiCommand) {
      console.log('AI COMMAND EXECUTION - Initial selection:', selection);
      console.log('AI COMMAND - Quill state:', {
        hasFocus: document.activeElement === this.quill.root,
        editorEmpty: this.quill.getLength() <= 1,
        editorContent: this.quill.getText().slice(0, 50) + (this.quill.getText().length > 50 ? '...' : '')
      });
      
      // Special case for AI generate command - always ensure we have an insertion point
      if (selection && selection.length === 0) {
        // For zero-length selections (just cursor position), ensure we have content 
        // to work with for AI by inserting a placeholder if editor is empty
        if (this.quill.getText().trim().length === 0) {
          console.log('AI COMMAND - Empty editor, inserting placeholder');
          this.quill.insertText(0, ' ', 'user');
          this.quill.setSelection(0, 0);
          selection = this.quill.getSelection();
        }
      }
    }
    
    // Handle case when selection is null
    if (!selection) {
      console.warn('No selection found when executing command, using fallback selection');
      // Set a fallback selection at the end of the document
      const length = this.quill.getLength();
      this.quill.setSelection(length - 1, 0, 'api');
      
      // Get the selection again after setting it
      selection = this.quill.getSelection();
      
      if (isAiCommand) {
        console.log('AI COMMAND - After first fallback attempt:', { 
          hasSelection: !!selection,
          selection
        });
      }
      
      // If still no selection after our attempt to set one, try one more approach
      if (!selection) {
        console.warn('Still no selection after setting fallback, trying focus');
        this.quill.focus();
        
        // One last attempt to get the selection
        selection = this.quill.getSelection();
        
        if (isAiCommand) {
          console.log('AI COMMAND - After focus attempt:', { 
            hasSelection: !!selection,
            selection,
            activeElement: document.activeElement === this.quill.root ? 'quill-root' : document.activeElement?.tagName
          });
        }
        
        // If still no selection, create a synthetic one at the end of the document
        if (!selection) {
          console.warn('Creating synthetic selection object');
          selection = { index: this.quill.getLength() - 1, length: 0 };
          
          if (isAiCommand) {
            console.log('AI COMMAND - Using synthetic selection:', selection);
          }
        }
      }
    }

    console.log('Current selection:', selection);

    // Get the line and offset before any changes
    try {
      const [line, offset] = this.quill.getLine(selection.index);
      if (!line || !line.domNode) {
        console.error('Could not get line information');
        if (isAiCommand) {
          console.log('AI COMMAND - Failed to get line information:', {
            selectionIndex: selection.index,
            quillLength: this.quill.getLength(),
            line,
            offset
          });
        }
        return;
      }

      const text = line.domNode.textContent;
      const slashIndex = text.lastIndexOf('/');
      
      if (isAiCommand) {
        console.log('AI COMMAND - Line info:', {
          text,
          slashIndex,
          lineLength: text.length,
          offset,
          hasSlash: slashIndex !== -1
        });
      }

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

        try {
          console.log('Executing command handler with range:', {
            index: newIndex,
            length: 0
          });

          // Special case for PDF upload
          if (command.label.toLowerCase() === 'upload pdf') {
            PdfProcessor.handlePdfUpload(this.quill, { index: newIndex, length: 0 });
          } else {
            // Pre-execute logging for AI commands
            if (isAiCommand) {
              console.log('AI COMMAND - About to execute handler:', {
                handlerExists: !!command.handler,
                handlerType: typeof command.handler,
                newIndex,
                quillState: {
                  hasFocus: document.activeElement === this.quill.root,
                  currentSelection: this.quill.getSelection()
                }
              });
            }
            
            // Execute the command handler
            command.handler(this.quill, { index: newIndex, length: 0 });
            
            // Post-execute logging for AI commands
            if (isAiCommand) {
              console.log('AI COMMAND - Handler executed successfully');
            }
          }

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
            
            if (isAiCommand) {
              console.log('AI COMMAND - Post-execution focus state:', {
                hasFocus: document.activeElement === this.quill.root,
                currentSelection: this.quill.getSelection()
              });
            }
          }, 0);

        } catch (error: any) {
          console.error('Error executing command handler:', error);
          
          if (isAiCommand) {
            console.log('AI COMMAND - Handler error details:', {
              errorName: error.name,
              errorMessage: error.message,
              errorStack: error.stack,
              commandLabel: command.label
            });
          }
          
          // Attempt to recover by inserting a newline
          this.quill.insertText(newIndex, '\n', 'user');
        }
      } else {
        // No slash found, just execute the command at the current position
        try {
          console.log('No slash found, executing command at current position:', selection.index);
          
          if (isAiCommand) {
            console.log('AI COMMAND - No slash execution path:', {
              selectionIndex: selection.index,
              quillHasFocus: document.activeElement === this.quill.root
            });
          }
          
          // Special case for PDF upload
          if (command.label.toLowerCase() === 'upload pdf') {
            PdfProcessor.handlePdfUpload(this.quill, { index: selection.index, length: 0 });
          } else {
            // Pre-execute logging for AI commands
            if (isAiCommand) {
              console.log('AI COMMAND (no slash) - About to execute handler:', {
                handlerExists: !!command.handler,
                handlerType: typeof command.handler,
                index: selection.index
              });
            }
            
            // Execute the command handler
            command.handler(this.quill, { index: selection.index, length: 0 });
            
            // Post-execute logging for AI commands
            if (isAiCommand) {
              console.log('AI COMMAND (no slash) - Handler executed successfully');
            }
          }
        } catch (error: any) {
          console.error('Error executing command without slash:', error);
          
          if (isAiCommand) {
            console.log('AI COMMAND (no slash) - Handler error details:', {
              errorName: error.name,
              errorMessage: error.message,
              errorStack: error.stack,
              commandLabel: command.label
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error in executeCommand:', error);
      
      if (isAiCommand) {
        console.log('AI COMMAND - Critical error in command execution:', {
          error: error.toString(),
          errorStack: error.stack,
          command: command.label,
          selectionIndex: selection?.index,
          quillLength: this.quill.getLength()
        });
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
  
  // Add destroy method to clean up
  destroy() {
    // Close any open dialogs
    if (this.dialog) {
      this.dialog.hide();
      this.dialog = null;
    }
    
    // Remove any processing overlays
    OverlayManager.clearAllProcessingOverlays(this.quill);
    
    // Close menu if open
    this.closeMenu();
    
    // Remove container if it exists
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
    
    console.log('SlashCommands module cleaned up');
  }
} 