import { useEffect, useState } from 'react';
// import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { TOOLBAR_OPTIONS } from '../types';
import SlashCommands from '../extensions/slash-commands';
import * as CustomBlocks from '../extensions/blocks/custom-blocks';
// import { registerFlashcardBlot } from '../extensions/flashcard-blot';
import '../styles/slash-commands.css';
import '../styles/checkbox.css';
import '../styles/flashcard.css';
import '../styles/quiz.css';
import '../styles/markdown-table.css';
// import QuillMarkdown from 'quilljs-markdown';
import MarkdownTable, { registerMarkdownTable } from '../extensions/formats/markdown-table';

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
  checkbox: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-square"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
  aiGenerate: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
  flashcard: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-stack"><path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><rect width="8" height="8" x="14" y="14" rx="2"></rect></svg>`,
  quiz: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-checks"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>`,
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
          // Import markdown module
          const QuillMarkdown = (await import('quilljs-markdown')).default;
          
          // Register modules before creating the editor instance
          console.log('Registering Quill modules...');
          
          // Register cursors module
          Quill.register('modules/cursors', QuillCursors);
          
          // Register slash commands module
          Quill.register('modules/slashCommands', SlashCommands);
          
          // Register custom blocks using the namespace
          CustomBlocks.registerCustomBlocks(Quill);
          
          // Register markdown table module and get the blot for reference
          const TableBlot = registerMarkdownTable(Quill);
          Quill.register('modules/markdownTable', MarkdownTable);
          // Also register the TableBlot directly with Quill to make sure it's available
          Quill.register(TableBlot);
          
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
                  // AI commands at the top
                  {
                    label: 'AI Generate',
                    icon: ICONS.aiGenerate,
                    description: 'Generate text using AI',
                    className: 'ai-command',
                    handler: (quill: any, range: any) => {
                      console.log('AI Generate handler called with range:', range);
                      
                      // Get the current text for context
                      const currentContent = quill.getText();
                      
                      // Dispatch a custom event with the quill instance and range
                      const aiGenerateEvent = new CustomEvent('ai-generate', {
                        detail: { 
                          quill, 
                          range,
                          currentContent 
                        },
                        bubbles: true
                      });
                      
                      quill.root.dispatchEvent(aiGenerateEvent);
                    }
                  },
                  {
                    label: 'Flashcard',
                    icon: ICONS.flashcard,
                    description: 'Insert a flashcard for study notes',
                    className: 'ai-command',
                    handler: (quill: any, range: any) => {
                      console.log('Flashcard handler called with range:', range);
                      
                      // Create a modal to ask for the number of flashcards
                      const askForCardCount = () => {
                        return new Promise<number>((resolve) => {
                          // Create modal element
                          const modal = document.createElement('div');
                          modal.className = 'flashcard-modal';
                          modal.style.position = 'fixed';
                          modal.style.top = '0';
                          modal.style.left = '0';
                          modal.style.width = '100%';
                          modal.style.height = '100%';
                          modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                          modal.style.display = 'flex';
                          modal.style.justifyContent = 'center';
                          modal.style.alignItems = 'center';
                          modal.style.zIndex = '1000';
                          
                          // Create modal content
                          const content = document.createElement('div');
                          content.style.backgroundColor = '#1e1e2e';
                          content.style.padding = '20px';
                          content.style.borderRadius = '10px';
                          content.style.width = '320px';
                          content.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                          content.style.border = '2px solid #6d28d9';
                          
                          // Add title
                          const title = document.createElement('h3');
                          title.textContent = 'Flashcard Stack';
                          title.style.margin = '0 0 15px 0';
                          title.style.color = '#f8f8f2';
                          title.style.fontSize = '18px';
                          
                          // Add description
                          const desc = document.createElement('p');
                          desc.textContent = 'How many flashcards do you want to create?';
                          desc.style.margin = '0 0 15px 0';
                          desc.style.color = '#7c3aed';
                          desc.style.fontSize = '14px';
                          
                          // Add input with pre-made options
                          const options = document.createElement('div');
                          options.style.display = 'flex';
                          options.style.justifyContent = 'space-between';
                          options.style.marginBottom = '15px';
                          
                          const createOption = (value: number) => {
                            const option = document.createElement('button');
                            option.textContent = value.toString();
                            option.style.backgroundColor = '#2d2d3a';
                            option.style.color = '#f8f8f2';
                            option.style.border = '1px solid #44475a';
                            option.style.borderRadius = '6px';
                            option.style.padding = '8px 16px';
                            option.style.cursor = 'pointer';
                            option.style.fontSize = '14px';
                            option.style.transition = 'all 0.2s';
                            
                            option.addEventListener('mouseover', () => {
                              option.style.backgroundColor = '#3d3d4d';
                              option.style.transform = 'translateY(-2px)';
                            });
                            
                            option.addEventListener('mouseout', () => {
                              option.style.backgroundColor = '#2d2d3a';
                              option.style.transform = 'translateY(0)';
                            });
                            
                            option.addEventListener('click', () => {
                              document.body.removeChild(modal);
                              resolve(value);
                            });
                            
                            return option;
                          };
                          
                          // Add options for 1, 3, 5, 10 cards
                          [1, 3, 5, 10].forEach(value => {
                            options.appendChild(createOption(value));
                          });
                          
                          // Add buttons
                          const buttons = document.createElement('div');
                          buttons.style.display = 'flex';
                          buttons.style.justifyContent = 'flex-end';
                          
                          const cancelButton = document.createElement('button');
                          cancelButton.textContent = 'Cancel';
                          cancelButton.style.backgroundColor = 'transparent';
                          cancelButton.style.color = '#f8f8f2';
                          cancelButton.style.border = '1px solid #44475a';
                          cancelButton.style.borderRadius = '6px';
                          cancelButton.style.padding = '8px 16px';
                          cancelButton.style.marginRight = '10px';
                          cancelButton.style.cursor = 'pointer';
                          
                          cancelButton.addEventListener('click', () => {
                            document.body.removeChild(modal);
                            resolve(0); // 0 means cancelled
                          });
                          
                          const customButton = document.createElement('button');
                          customButton.textContent = 'Custom';
                          customButton.style.background = 'linear-gradient(to right, #4c1d95, #6d28d9)';
                          customButton.style.color = 'white';
                          customButton.style.border = 'none';
                          customButton.style.borderRadius = '6px';
                          customButton.style.padding = '8px 16px';
                          customButton.style.cursor = 'pointer';
                          
                          customButton.addEventListener('mouseover', () => {
                            customButton.style.background = 'linear-gradient(to right, #5b21b6, #7c3aed)';
                            customButton.style.transform = 'translateY(-2px)';
                            customButton.style.boxShadow = '0 3px 6px rgba(124, 58, 237, 0.4)';
                          });
                          
                          customButton.addEventListener('mouseout', () => {
                            customButton.style.background = 'linear-gradient(to right, #4c1d95, #6d28d9)';
                            customButton.style.transform = 'translateY(0)';
                            customButton.style.boxShadow = 'none';
                          });
                          
                          customButton.addEventListener('click', () => {
                            const customValue = prompt('Enter number of flashcards (1-20):', '3');
                            if (customValue === null) {
                              // User cancelled prompt, but keep dialog open
                              return;
                            }
                            
                            const numValue = parseInt(customValue);
                            if (isNaN(numValue) || numValue < 1 || numValue > 20) {
                              alert('Please enter a number between 1 and 20');
                              return;
                            }
                            
                            document.body.removeChild(modal);
                            resolve(numValue);
                          });
                          
                          // Assemble modal
                          buttons.appendChild(cancelButton);
                          buttons.appendChild(customButton);
                          
                          content.appendChild(title);
                          content.appendChild(desc);
                          content.appendChild(options);
                          content.appendChild(buttons);
                          
                          modal.appendChild(content);
                          document.body.appendChild(modal);
                          
                          // Close if clicking outside content
                          modal.addEventListener('click', (e) => {
                            if (e.target === modal) {
                              document.body.removeChild(modal);
                              resolve(0); // 0 means cancelled
                            }
                          });
                        });
                      };
                      
                      // Use the modal to get card count, then create flashcards
                      askForCardCount().then(cardCount => {
                        if (cardCount === 0) {
                          // User cancelled
                          return;
                        }
                        
                        // Insert a line break if we're not at the beginning of a line
                        const [line, offset] = quill.getLine(range.index);
                        if (offset > 0) {
                          quill.insertText(range.index, '\n', 'user');
                          range.index += 1;
                        }
                        
                        try {
                          // Create an array of empty flashcard content
                          const cards = Array(cardCount).fill(null).map((_, i) => ({
                            front: i === 0 ? 'Enter your question here...' : `Question ${i + 1}`,
                            back: i === 0 ? 'Write the answer here...' : `Answer ${i + 1}`
                          }));
                          
                          // Insert the flashcard stack
                          quill.insertEmbed(range.index, 'flashcard', {
                            cards,
                            currentIndex: 0,
                            isFlipped: false
                          }, 'user');
                          
                          // Add a line break after
                          quill.insertText(range.index + 1, '\n', 'user');
                          
                          // Set selection after the flashcard
                          quill.setSelection(range.index + 2, 0, 'silent');
                          
                          console.log(`Flashcard stack with ${cardCount} cards inserted successfully at position`, range.index);
                        } catch (error) {
                          console.error('Error inserting flashcard:', error);
                        }
                      });
                    }
                  },
                  {
                    label: 'Quiz',
                    icon: ICONS.quiz,
                    description: 'Insert a multiple-choice quiz',
                    className: 'ai-command',
                    handler: (quill: any, range: any) => {
                      console.log('Quiz handler called with range:', range);
                      
                      // Insert a line break if we're not at the beginning of a line
                      const [line, offset] = quill.getLine(range.index);
                      if (offset > 0) {
                        quill.insertText(range.index, '\n', 'user');
                        range.index += 1;
                      }
                      
                      try {
                        // Create a default quiz with one question
                        const defaultQuiz = {
                          questions: [{
                            question: 'Enter your question here...',
                            options: [
                              { text: 'Option 1', isCorrect: true },
                              { text: 'Option 2', isCorrect: false },
                              { text: 'Option 3', isCorrect: false },
                              { text: 'Option 4', isCorrect: false }
                            ]
                          }],
                          currentIndex: 0
                        };
                        
                        // Insert the quiz
                        quill.insertEmbed(range.index, 'quiz', defaultQuiz, 'user');
                        
                        // Add a line break after
                        quill.insertText(range.index + 1, '\n', 'user');
                        
                        // Set selection after the quiz
                        quill.setSelection(range.index + 2, 0, 'silent');
                        
                        console.log('Quiz inserted successfully at position', range.index);
                      } catch (error) {
                        console.error('Error inserting quiz:', error);
                      }
                    }
                  },
                  // Regular formatting commands
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
                  {
                    label: 'Checkbox',
                    icon: ICONS.checkbox,
                    description: 'Insert a checkbox for to-do items',
                    handler: (quill: any, range: any) => {
                      console.log('Checkbox handler called with range:', range);
                      
                      const index = range.index;
                      
                      try {
                        // Use Quill's built-in list format for checkboxes
                        // Ensure we are at the start of a line or insert a newline
                        const [line, offset] = quill.getLine(index);
                        if (offset > 0) {
                          quill.insertText(index, '\n', 'user');
                          // Format the *new* line as a checkbox list item
                          quill.formatLine(index + 1, 1, 'list', 'unchecked', 'user');
                          // Move cursor to the beginning of the formatted line
                          quill.setSelection(index + 1, 0, 'silent');
                        } else {
                          // Format the current line as a checkbox list item
                          quill.formatLine(index, 1, 'list', 'unchecked', 'user');
                          // Cursor should already be at the start or handled by formatLine
                          quill.setSelection(index, 0, 'silent'); 
                        }
                        
                        console.log('Checkbox list item created successfully at index', index);
                      } catch (error) {
                        console.error('Error creating checkbox list item:', error);
                      }
                    }
                  },
                  {
                    label: 'Table',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>`,
                    description: 'Insert a table',
                    handler: (quill: any, range: any) => {
                      // Insert a simple 2x2 table template
                      const tableTemplate = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`;
                      
                      // Insert a newline first if not at the beginning of a line
                      const currentPosition = range.index;
                      const currentText = quill.getText(currentPosition - 1, 1);
                      
                      if (currentPosition > 0 && currentText !== '\n') {
                        quill.insertText(currentPosition, '\n', 'user');
                        quill.insertText(currentPosition + 1, tableTemplate, 'user');
                        quill.setSelection(currentPosition + tableTemplate.length + 1, 0);
                      } else {
                        quill.insertText(currentPosition, tableTemplate, 'user');
                        quill.setSelection(currentPosition + tableTemplate.length, 0);
                      }
                      
                      // Process the markdown
                      try {
                        const markdownModule = quill.getModule('markdown');
                        if (markdownModule && typeof markdownModule.process === 'function') {
                          setTimeout(() => {
                            markdownModule.process();
                          }, 100);
                        }
                        
                        // Also process tables
                        const tableModule = quill.getModule('markdownTable');
                        if (tableModule && typeof tableModule.detectAndRenderTables === 'function') {
                          setTimeout(() => {
                            tableModule.detectAndRenderTables();
                          }, 200);
                        }
                      } catch (err) {
                        console.error('Error processing markdown for table:', err);
                      }
                    }
                  },
                ]
              },
              // Add markdown table support
              markdownTable: {},
              markdown: false
            },
            placeholder: 'Start writing or type "/" for commands...',
            formats: [
              'bold', 'italic', 'underline', 'strike', 
              'header', 'list', 'blockquote', 'code-block', 
              'hr', 'callout', 'script', 'indent', 'direction', 
              'size', 'color', 'background', 'font', 'align',
              'checkbox', 'flashcard', 'quiz', 'markdown-table'  // Add markdown-table to allowed formats
            ],
          });
          
          // RE-ADD Initialization of external quilljs-markdown library
          // Initialize markdown support
          const markdownOptions = {
            ignoreTags: ['pre', 'strikethrough'],
            matchVisual: false,
            // Add support for tables and better list handling
            tables: true,
            breaks: true,
            indentedCodeBlock: true,
            linkify: true,
            typographer: true
          };
          
          // Create and initialize the markdown module
          const markdownModule = new QuillMarkdown(q, markdownOptions);
          
          // Store module reference in Quill instance for easy access
          (q as any).markdownModule = markdownModule;
          
          // Force an initial markdown processing pass when content is loaded
          q.on('editor-change', (eventName: string) => {
            if (eventName === 'text-change') {
              // Debounce to avoid excessive processing
              clearTimeout((q as any).markdownTimeout);
              (q as any).markdownTimeout = setTimeout(() => {
                try {
                  // Check if the module instance still exists
                  const currentMarkdownModule = (q as any).markdownModule;
                  if (currentMarkdownModule && typeof currentMarkdownModule.process === 'function') {
                    console.log('Processing markdown via editor-change listener...');
                    currentMarkdownModule.process();
                  }
                } catch (err) {
                  console.error('Error in markdown processing listener:', err);
                }
              }, 200); // Adjusted debounce time slightly
            }
          });
          
          // Initialize checkbox support
          
          // Add custom handler for markdown-style checkboxes
          q.keyboard.addBinding({
            key: ' ',
            prefix: /\[(x|X|\s|_|-)?]$/,
            handler: function(range: any, context: any) {
              // Remove the markdown checkbox characters
              const cursorPosition = range.index;
              const [line] = this.quill.getLine(cursorPosition);
              
              // Check if line exists
              if (!line || !line.domNode) return true;
              
              const lineText = line.domNode.textContent || '';
              
              // Find the bracket position
              const bracketPos = lineText.lastIndexOf('[');
              if (bracketPos < 0) return true;
              
              // Get position in the editor of the start of [x] or [ ]
              const startPos = cursorPosition - (lineText.length - bracketPos);
              
              // Check if it's a checked or unchecked checkbox
              const isChecked = lineText.substring(bracketPos + 1, bracketPos + 2).toLowerCase() === 'x';
              
              // Delete the markdown syntax
              this.quill.deleteText(startPos, 3, 'user');
              
              // Insert checkbox
              this.quill.insertEmbed(startPos, 'checkbox', isChecked, 'user');
              
              // Move cursor after checkbox
              this.quill.setSelection(startPos + 1, 0, 'silent');
              
              return false;
            }
          });
          
          // Add custom handler for triple backtick code blocks
          q.keyboard.addBinding({
            key: 'enter',
            shiftKey: false,
            prefix: /^```(\w+)?$/,
            handler: function(range, context) {
              // Get the current line
              const [line] = this.quill.getLine(range.index);
              if (!line || !line.domNode) return true;
              
              const lineText = line.domNode.textContent;
              if (!lineText) return true;
              
              // Check if this is a code block start
              if (lineText.trim().startsWith('```')) {
                // Extract language if specified
                const lang = lineText.trim().substring(3);
                
                // Delete the current line with backticks
                this.quill.deleteText(range.index - lineText.length, lineText.length);
                
                // Insert a blank line with code-block format
                this.quill.insertText(range.index - lineText.length, '\n', { 'code-block': true });
                
                // Set the cursor position properly
                this.quill.setSelection(range.index - lineText.length + 1, 0);
                
                return false; // Prevent default
              }
              return true; // Allow default behavior for other cases
            }
          });
          
          // Add handler for closing code blocks with triple backticks
          q.keyboard.addBinding({
            key: 'enter',
            shiftKey: false,
            suffix: /```$/,
            handler: function(range, context) {
              // If we detect a closing triple backtick, exit the code block
              const currentFormat = this.quill.getFormat(range.index);
              
              if (currentFormat['code-block']) {
                // Delete the closing backticks
                this.quill.deleteText(range.index - 3, 3);
                
                // Insert a newline to exit the code block
                this.quill.insertText(range.index - 3, '\n\n');
                
                // Move to the new line
                this.quill.setSelection(range.index - 1, 0);
                
                return false; // Prevent default
              }
              return true; // Allow default behavior for other cases
            }
          });
          
          // Add another handler to detect when user manually types triple backticks
          q.keyboard.addBinding({
            key: '`',
            handler: function(range, context) {
              // Insert the backtick character first
              this.quill.insertText(range.index, '`', 'user');
              
              // Get the current line after insertion
              const [line] = this.quill.getLine(range.index + 1);
              if (!line || !line.domNode) return true;
              
              const lineText = line.domNode.textContent;
              if (!lineText) return true;
              
              // Check if we just completed typing three backticks at the start of a line
              if (lineText.trim() === '```') {
                // Replace the triple backticks with a code block
                this.quill.deleteText(range.index - 2, 3);
                this.quill.insertText(range.index - 2, '\n', { 'code-block': true });
                this.quill.setSelection(range.index - 1, 0);
                return false;
              }
              
              return true;
            }
          });
          
          // Add protection for embedded components like flashcards
          q.keyboard.addBinding({
            key: 'backspace',
            collapsed: true,
            handler: function(range, context) {
              // Get the current position and check what's before it
              const [line, offset] = this.quill.getLine(range.index);
              
              // If we're at position 0, nothing to check before
              if (range.index === 0) return true;
              
              // Check if we're right after a flashcard
              const formats = this.quill.getFormat(range.index - 1, 1);
              const prevFormats = this.quill.getFormat(Math.max(0, range.index - 2), 1);
              
              // More comprehensive check for any part of a flashcard
              if (formats.flashcard || prevFormats.flashcard || 
                  (offset === 0 && this.quill.getText(range.index - 2, 2).trim() === '')) {
                
                // If flashcard is detected, prevent deletion
                console.log('Prevented Backspace from deleting flashcard');
                return false;
              }
              
              // Also check for elements with flashcard class
              const leafAndOffset = this.quill.getLeaf(range.index - 1);
              if (leafAndOffset && leafAndOffset[0] && leafAndOffset[0].domNode) {
                const prevNode = leafAndOffset[0].domNode as HTMLElement;
                const isOrHasFlashcard = 
                  (prevNode as any).closest && (
                    (prevNode as HTMLElement).closest('.ql-flashcard') || 
                    ((prevNode as HTMLElement).previousElementSibling && 
                     (prevNode as HTMLElement).previousElementSibling?.classList?.contains('ql-flashcard'))
                  );
                
                if (isOrHasFlashcard) {
                  console.log('Prevented Backspace from deleting flashcard (DOM check)');
                  return false;
                }
              }
              
              return true;
            }
          });
          
          // Enhanced protection for Delete key
          q.keyboard.addBinding({
            key: 'delete', 
            collapsed: true,
            handler: function(range, context) {
              // Get the length of the document
              const length = this.quill.getLength();
              
              // If we're at the end of the document, nothing to check after
              if (range.index >= length - 1) return true;
              
              // Check if the next element is a flashcard
              const formats = this.quill.getFormat(range.index, 1);
              const nextFormats = this.quill.getFormat(Math.min(length - 1, range.index + 1), 1);
              const nextNextFormats = this.quill.getFormat(Math.min(length - 1, range.index + 2), 1);
              
              // More comprehensive check for any part of a flashcard
              if (formats.flashcard || nextFormats.flashcard || nextNextFormats.flashcard) {
                console.log('Prevented Delete from deleting flashcard');
                return false;
              }
              
              // Using DOM to check if the next element is a flashcard
              const leafAndOffset = this.quill.getLeaf(range.index + 1);
              if (leafAndOffset && leafAndOffset[0] && leafAndOffset[0].domNode) {
                const nextNode = leafAndOffset[0].domNode as HTMLElement;
                const isOrHasFlashcard = 
                  (nextNode as any).closest && (
                    (nextNode as HTMLElement).closest('.ql-flashcard') || 
                    ((nextNode as HTMLElement).nextElementSibling && 
                     (nextNode as HTMLElement).nextElementSibling?.classList?.contains('ql-flashcard'))
                  );
                
                if (isOrHasFlashcard) {
                  console.log('Prevented Delete from deleting flashcard (DOM check)');
                  return false;
                }
              }
              
              // Also check if the next character starts a flashcard block
              const nextText = this.quill.getText(range.index, 3);
              if (nextText.includes('\n') && this.quill.getFormat(range.index + nextText.indexOf('\n') + 1, 1).flashcard) {
                console.log('Prevented Delete from deleting flashcard (newline check)');
                return false;
              }
              
              return true;
            }
          });
          
          // Verify modules are loaded
          const cursorsModule = q.getModule('cursors');
          const slashCommandsModule = q.getModule('slashCommands');
          
          console.log('Module verification:', {
            cursors: !!cursorsModule,
            slashCommands: !!slashCommandsModule,
            markdown: 'initialized'
          });
          
          // Initialize the editor
          setQuill(q);
          console.log('Quill editor setup complete');
        }
        catch (error) {
          console.error('Error setting up Quill editor:', error);
        }
      };
      
      setupQuill();
    }
  }, [wrapperRef]);
  
  return { quill };
};