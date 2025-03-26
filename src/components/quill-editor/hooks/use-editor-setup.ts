import { useEffect, useState } from 'react';
import { TOOLBAR_OPTIONS } from '../types';
import SlashCommands from '../extensions/slash-commands';
import { registerCustomBlocks } from '../extensions/custom-blocks';
import '../styles/slash-commands.css';

// SVG icons for our menu
const ICONS = {
  heading1: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heading-1"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`,
  heading2: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heading-2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,
  bulletList: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
  numberedList: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-ordered"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
  blockquote: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
  codeBlock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  divider: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  callout: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
  table: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`,
};

export const useEditorSetup = (wrapperRef: React.RefObject<HTMLDivElement | null>) => {
  const [quill, setQuill] = useState<any>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && wrapperRef.current) {
      const setupQuill = async () => {
        console.log('Setting up Quill editor...');
        const wrapper = wrapperRef.current;
        if (wrapper === null) {
          console.log('ERROR: Wrapper ref is null, cannot initialize Quill');
          return;
        }
        
        wrapper.innerHTML = '';
        const editor = document.createElement('div');
        wrapper.append(editor);
        
        try {
          // Import Quill and its modules
          const Quill = (await import('quill')).default;
          const QuillCursors = (await import('quill-cursors')).default;
          
          // Register modules before creating the editor instance
          console.log('Registering Quill modules...');
          
          // Register cursors module
          Quill.register('modules/cursors', QuillCursors);
          
          // Register slash commands module
          Quill.register('modules/slashCommands', SlashCommands);
          
          // Register custom blocks
          registerCustomBlocks(Quill);
          
          console.log('All modules registered successfully');
          
          // Create the editor instance with all necessary modules
          const q = new Quill(editor, {
            theme: 'snow',
            modules: {
              toolbar: TOOLBAR_OPTIONS,
              cursors: {
                transformOnTextChange: true,
              },
              slashCommands: {
                commands: [
                  {
                    label: 'Heading 1',
                    icon: ICONS.heading1,
                    description: 'Large section heading',
                    handler: (quill: any, range: any) => {
                      console.log('Executing H1 command', { range });
                      quill.formatLine(range.index, 1, 'header', 1);
                    }
                  },
                  {
                    label: 'Heading 2',
                    icon: ICONS.heading2,
                    description: 'Medium section heading',
                    handler: (quill: any, range: any) => {
                      quill.formatLine(range.index, 1, 'header', 2);
                    }
                  },
                  {
                    label: 'Bulleted List',
                    icon: ICONS.bulletList,
                    description: 'Create a simple bulleted list',
                    handler: (quill: any, range: any) => {
                      quill.formatLine(range.index, 1, 'list', 'bullet');
                    }
                  },
                  {
                    label: 'Numbered List',
                    icon: ICONS.numberedList,
                    description: 'Create a numbered list',
                    handler: (quill: any, range: any) => {
                      quill.formatLine(range.index, 1, 'list', 'ordered');
                    }
                  },
                  {
                    label: 'Quote',
                    icon: ICONS.blockquote,
                    description: 'Insert a quote block',
                    handler: (quill: any, range: any) => {
                      quill.formatLine(range.index, 1, 'blockquote', true);
                    }
                  },
                  {
                    label: 'Code Block',
                    icon: ICONS.codeBlock,
                    description: 'Insert a code block',
                    handler: (quill: any, range: any) => {
                      quill.formatLine(range.index, 1, 'code-block', true);
                    }
                  },
                  {
                    label: 'Divider',
                    icon: ICONS.divider,
                    description: 'Insert a horizontal divider',
                    handler: (quill: any, range: any) => {
                      quill.insertText(range.index, '\n', 'user');
                      quill.insertEmbed(range.index + 1, 'hr', true, 'user');
                      quill.insertText(range.index + 2, '\n', 'user');
                      quill.setSelection(range.index + 3, 0, 'silent');
                    }
                  },
                  {
                    label: 'Callout',
                    icon: ICONS.callout,
                    description: 'Insert an info callout',
                    handler: (quill: any, range: any) => {
                      // Insert a line break if we're not at the beginning of a line
                      const [line, offset] = quill.getLine(range.index);
                      if (offset > 0) {
                        quill.insertText(range.index, '\n', 'user');
                        range.index += 1;
                      }
                      
                      // Insert the callout
                      quill.insertEmbed(range.index, 'callout', {
                        type: 'info',
                        icon: '💡',
                        content: 'Type your callout text here'
                      }, 'user');
                      
                      // Add a line break after
                      quill.insertText(range.index + 1, '\n', 'user');
                      
                      // Set selection inside the callout content
                      // We'd need to find the actual DOM node to focus inside it
                      setTimeout(() => {
                        const callouts = quill.root.querySelectorAll('.ql-callout');
                        if (callouts.length > 0) {
                          const lastCallout = callouts[callouts.length - 1];
                          const content = lastCallout.querySelector('.ql-callout-content');
                          if (content) {
                            content.focus();
                          }
                        }
                      }, 10);
                    }
                  },
                ]
              }
            },
            placeholder: 'Start writing or type "/" for commands...',
            formats: ['header', 'list', 'blockquote', 'code-block', 'hr', 'callout'],
          });
          
          // Verify modules are loaded
          const cursorsModule = q.getModule('cursors');
          const slashCommandsModule = q.getModule('slashCommands');
          
          console.log('Module verification:', {
            cursors: !!cursorsModule,
            slashCommands: !!slashCommandsModule
          });
          
          // Initialize the editor
          setQuill(q);
          return q;
        } catch (err) {
          console.error('Error initializing Quill editor:', err);
        }
      };
      
      setupQuill();
    }
  }, [wrapperRef]);

  return { quill };
}; 