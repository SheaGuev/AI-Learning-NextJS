import { useEffect } from 'react';

export const useKeyboardHandlers = (quill: any) => {
  useEffect(() => {
    if (!quill) return;
    
    // Direct test for keyboard input
    const keydownHandler = (e: KeyboardEvent) => {
      console.log('Keydown in editor:', e.key);
      if (e.key === '/') {
        console.log('SLASH KEY DETECTED via direct event listener!');
        
        // Attempt to show menu after a short delay to allow slash to be inserted
        setTimeout(() => {
          try {
            const slashModule = quill.getModule('slashCommands');
            if (slashModule) {
              const selection = quill.getSelection();
              if (selection) {
                console.log('Manually opening slash commands menu after keypress');
                slashModule.openMenu(selection);
              }
            }
          } catch (err) {
            console.error('Error opening slash menu from keydown handler:', err);
          }
        }, 10);
      }
    };
    
    // Add a global keyboard handler as a backup
    const globalSlashHandler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement === quill.root) {
        console.log('Global slash key handler triggered');
        // Wait a moment to ensure the slash is inserted
        setTimeout(() => {
          const slashModule = quill.getModule('slashCommands');
          if (slashModule) {
            const selection = quill.getSelection();
            if (selection) {
              slashModule.openMenu(selection);
            }
          }
        }, 10);
      }
    };
    
    // Global Enter key handler that takes precedence over everything else
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      // Only handle Enter key, let all other keys (including arrow keys) pass through
      if (e.key === 'Enter') {
        // Check if slash menu is visibly open by looking for the actual DOM element
        const slashMenu = document.querySelector('.ql-slash-commands:not(.hidden)');
        
        if (slashMenu) {
          console.log('Global Enter handler detected slash menu is open');
          
          // Find the selected item
          const selectedItem = slashMenu.querySelector('.ql-slash-command-item.selected') as HTMLElement;
          
          if (selectedItem) {
            console.log('Selected item found, triggering click');
            e.preventDefault();
            e.stopPropagation();
            
            // Trigger click on the selected item
            selectedItem.click();
            return false;
          }
          
          // If no selected item, try the first item
          const firstItem = slashMenu.querySelector('.ql-slash-command-item') as HTMLElement;
          if (firstItem) {
            console.log('No selected item, clicking first item');
            e.preventDefault();
            e.stopPropagation();
            
            firstItem.click();
            return false;
          }
        }
      }
      
      // Let all other key events pass through unmodified
      return true;
    };
    
    // Add all keyboard event listeners
    quill.root.addEventListener('keydown', keydownHandler);
    document.addEventListener('keydown', globalSlashHandler);
    document.addEventListener('keydown', handleGlobalKeydown, true);
    
    // Test slash commands module
    try {
      const slashCommandsModule = quill.getModule('slashCommands');
      console.log('QuillEditor: Slash commands module check:', { 
        exists: !!slashCommandsModule,
        methods: slashCommandsModule ? Object.getOwnPropertyNames(slashCommandsModule) : []
      });
    } catch (err) {
      console.error('QuillEditor: Error checking slash commands module', err);
    }
    
    // Cleanup
    return () => {
      quill.root.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keydown', globalSlashHandler);
      document.removeEventListener('keydown', handleGlobalKeydown, true);
    };
  }, [quill]);
}; 