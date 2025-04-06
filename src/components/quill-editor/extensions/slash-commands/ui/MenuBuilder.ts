// Menu building utility for slash commands
import { CommandOption } from '../interfaces';

export class MenuBuilder {
  /**
   * Creates a menu with command options
   */
  static buildCommandMenu(
    container: HTMLElement, 
    commands: CommandOption[], 
    executeCommand: (command: CommandOption) => void
  ): void {
    // Clear existing content
    container.innerHTML = '';
    
    console.log('Populating menu with commands', { 
      commandCount: commands.length,
      commands: commands.map((cmd: CommandOption) => ({
        label: cmd.label,
        hasHandler: !!cmd.handler,
        className: cmd.className
      }))
    });
    
    // Add PDF Upload Command if not already in options
    const hasPdfUploadCommand = commands.some((cmd: CommandOption) => 
      cmd.label.toLowerCase() === 'upload pdf'
    );
    
    if (!hasPdfUploadCommand) {
      // Add the PDF upload command to the beginning of commands if handlePdfUpload is defined
      const pdfUploadCmd = {
        label: 'Upload PDF',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-6"></path><path d="M9 15h6"></path></svg>',
        description: 'Upload and process a PDF document',
        className: 'ai-command',
        handler: (quill: any, range: any) => {
          // This is a placeholder handler, the actual handler is provided
          // by the SlashCommands class when it creates the menu
          console.log('PDF upload handler invoked');
        }
      };
      
      commands.unshift(pdfUploadCmd);
    }
    
    // Create menu items
    commands.forEach((command: CommandOption, index: number) => {
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

        try {
          executeCommand(command);
        } catch (error) {
          console.error('Error handling menu item click:', error);
        }
      });
      
      // Append to container
      container.appendChild(item);
    });
  }
  
  /**
   * Filter menu items based on search query
   */
  static filterMenu(container: HTMLElement, query: string): boolean {
    if (!container) return false;
    
    // Filter menu items based on the query
    const items = container.querySelectorAll('.ql-slash-command-item');
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
    
    return hasVisibleItems;
  }
} 