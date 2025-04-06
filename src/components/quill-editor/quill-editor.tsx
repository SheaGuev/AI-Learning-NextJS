'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import 'quill/dist/quill.snow.css';
import './styles/slash-commands.css';
import { createBClient } from '@/lib/server-actions/createClient';
import { useAppState } from '@/lib/providers/state-provider';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { useSocket } from '@/lib/providers/socket-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { findUser } from '@/supabase/queries';

// Types
import { QuillEditorProps } from './types';

// Hooks
import { useEditorSetup } from './hooks/use-editor-setup';
import { useDocumentOperations } from './hooks/use-document-operations';
import { useCollaboration } from './hooks/use-collaboration';
import { useContentLoader } from './hooks/use-content-loader';
import { useDocumentDetails } from './hooks/use-document-details';
import { useAIGenerator } from './hooks/use-ai-generator';

// Components
import TrashBanner from './components/TrashBanner';
import EditorHeader from './components/EditorHeader';
import DocumentBanner from './components/DocumentBanner';
import DocumentTitle from './components/DocumentTitle';
import AIPromptDialog, { TextLengthOption } from './extensions/ai-prompt-dialog';
import APIKeyDialog from './extensions/api-key-dialog';

const QuillEditor: React.FC<QuillEditorProps> = ({
  dirDetails,
  dirType,
  fileId,
}) => {
  // Setup refs and basic state
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [localCursors, setLocalCursors] = useState<any>([]);
  
  // AI generation state
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [showAPIKeyDialog, setShowAPIKeyDialog] = useState(false);
  const [currentRange, setCurrentRange] = useState<any>(null);
  
  // Add a new state for PDF section processing
  const [processingPdfSection, setProcessingPdfSection] = useState(false);
  
  // Basic services
  const supabase = createBClient();
  const { user } = useSupabaseUser();
  const { socket } = useSocket();
  const { toast } = useToast();
  
  // Initialize hooks
  const { quill } = useEditorSetup(wrapperRef);
  const { details, breadCrumbs } = useDocumentDetails(dirDetails, dirType, fileId);
  const { 
    saving, 
    deletingBanner,
    quillHandler,
    restoreFileHandler,
    deleteFileHandler,
    iconOnChange,
    deleteBanner,
    getMarkdownContent,
    importMarkdown
  } = useDocumentOperations(quill, fileId, dirType);
  const { collaborators, setupSelectionHandler } = useCollaboration(quill, fileId);
  const { generateText, isGenerating, setApiKey, apiKeyExists } = useAIGenerator();
  
  // Ensure socket room is created when component mounts
  useEffect(() => {
    if (socket && fileId) {
      console.log(`QuillEditor: Creating room for file ${fileId}`);
      socket.emit('create-room', fileId);
    }
  }, [socket, fileId]);
  
  // Load content
  useContentLoader(quill, fileId, dirType);
  
  // AI generation handlers
  const handleAIGenerate = useCallback(async (prompt: string, length: TextLengthOption, pdfText?: string) => {
    if (!quill || !currentRange) return;
    
    try {
      // Get some context from before the insertion point
      const contextContent = pdfText || quill.getText(
        Math.max(0, currentRange.index - 500), 
        Math.min(500, currentRange.index)
      );
      
      // Add length instruction to the prompt
      let lengthInstruction = '';
      switch(length) {
        case 'short':
          lengthInstruction = 'Keep your response brief, about 1-2 sentences.';
          break;
        case 'medium':
          lengthInstruction = 'Write approximately 1 paragraph.';
          break;
        case 'long':
          lengthInstruction = 'Write 2-3 paragraphs for a thorough response.';
          break;
        case 'verylong':
          lengthInstruction = 'Provide a detailed response with 4 or more paragraphs.';
          break;
        case 'custom':
        default:
          // No length restriction
          break;
      }
      
      // Add markdown formatting instructions
      const markdownInstructions = `
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
`;
      
      // Combine prompt with instructions
      const fullPrompt = `${prompt}\n\n${markdownInstructions}\n\n${lengthInstruction || ''}`;
      
      // Generate text with AI
      const generatedText = await generateText(fullPrompt, contextContent);
      
      if (generatedText) {
        // Insert the generated text at cursor position
        quill.insertText(currentRange.index, generatedText, 'user');
        
        // Update cursor position
        quill.setSelection(currentRange.index + generatedText.length, 0);
        
        toast({
          title: 'Text generated',
          description: 'AI-generated text has been added to your document.',
        });
      }
    } catch (error: any) {
      console.error('Error generating text:', error);
      toast({
        title: 'Error generating text',
        description: error.message || 'Something went wrong while generating text.',
        variant: 'destructive',
      });
    } finally {
      setShowAIPrompt(false);
    }
  }, [quill, currentRange, generateText, toast]);
  
  const handleAIPromptCancel = useCallback(() => {
    setShowAIPrompt(false);
  }, []);
  
  const handleAPIKeySubmit = useCallback((apiKey: string) => {
    setApiKey(apiKey);
    setShowAPIKeyDialog(false);
    
    // If we were in the middle of generating text, reopen the prompt
    if (currentRange) {
      setShowAIPrompt(true);
    }
  }, [setApiKey, currentRange]);
  
  const handleAPIKeyCancel = useCallback(() => {
    setShowAPIKeyDialog(false);
  }, []);
  
  // Setup AI generation event listener
  useEffect(() => {
    if (!quill) return;
    
    const handleAIGenerateEvent = (e: any) => {
      const { range } = e.detail;
      
      // Store the current range for later use
      setCurrentRange(range);
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
      } else {
        setShowAIPrompt(true);
      }
    };
    
    // Add event listener to the quill root element
    quill.root.addEventListener('ai-generate', handleAIGenerateEvent);
    
    return () => {
      // Clean up event listener
      quill.root.removeEventListener('ai-generate', handleAIGenerateEvent);
    };
  }, [quill, apiKeyExists]);
  
  // Add an effect to log Quill content when it changes
  useEffect(() => {
    if (quill && quill.getContents) {
      const contentLog = () => {
        const contents = quill.getContents();
        console.log('Current Quill contents:', contents);
        const stringified = JSON.stringify(contents);
        console.log('Stringified content length:', stringified.length);
        console.log('Content sample:', stringified.substring(0, 200) + '...');
      };
      
      // Log once on init
      contentLog();
      
      // And on text-change
      const handler = () => contentLog();
      quill.on('text-change', handler);
      
      return () => {
        quill.off('text-change', handler);
      };
    }
  }, [quill]);
  
  // Setup event handlers
  useEffect(() => {
    console.log('QuillEditor: Setting up event handlers', { quillInitialized: !!quill });
    if (!quill) return;
    
    // Attach text change handler
    quill.on('text-change', quillHandler);
    console.log('QuillEditor: Text change handler attached');
    
    // Add handlers for direct save requests from components
    const handleFlashcardSave = (e: any) => {
      console.log('Handling flashcard save event');
      const { quill: componentQuill } = e.detail;
      
      // Only handle if this is for our quill instance
      if (componentQuill === quill) {
        // Create minimal delta to trigger save
        const delta = {
          ops: [{ retain: quill.getLength() - 1 }]
        };
        const oldDelta = quill.getContents();
        
        // Call the quill handler directly
        quillHandler(delta, oldDelta, 'user');
      }
    };
    
    const handleQuizSave = (e: any) => {
      console.log('Handling quiz save event');
      const { quill: componentQuill } = e.detail;
      
      // Only handle if this is for our quill instance
      if (componentQuill === quill) {
        // Create minimal delta to trigger save
        const delta = {
          ops: [{ retain: quill.getLength() - 1 }]
        };
        const oldDelta = quill.getContents();
        
        // Call the quill handler directly
        quillHandler(delta, oldDelta, 'user');
      }
    };
    
    // Add event listeners for direct save requests
    document.addEventListener('flashcard-save-needed', handleFlashcardSave);
    document.addEventListener('quiz-save-needed', handleQuizSave);
    
    // Add flashcard AI generation handler
    const handleFlashcardAIGenerate = async (e: any) => {
      const { content, cardCount, flashcardNode } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      try {
        // Show a loading message
        toast({
          title: 'Generating flashcards',
          description: 'AI is analyzing your content...',
        });
        
        // Generate flashcards using the AI
        const prompt = `Create ${cardCount} educational flashcards in the format of question-answer pairs from the following content. 
        Each card should have a clear, concise question on the front and a comprehensive answer on the back.
        Make the questions challenging but fair, focusing on the most important concepts.
        Format your response as a JSON array of objects with 'front' and 'back' properties:
        [
          { "front": "Question 1", "back": "Answer 1" },
          { "front": "Question 2", "back": "Answer 2" }
        ]
        Content: ${content}`;
        
        const generatedText = await generateText(prompt, '');
        
        if (generatedText) {
          try {
            // Parse the generated text as JSON
            let cardData;
            
            // Extract JSON if it's within a code block
            if (generatedText.includes('```json')) {
              const jsonMatch = generatedText.match(/```json([\s\S]*?)```/);
              cardData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
            } else if (generatedText.includes('```')) {
              const jsonMatch = generatedText.match(/```([\s\S]*?)```/);
              cardData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
            } else {
              // Try to parse the whole response as JSON
              cardData = JSON.parse(generatedText);
            }
            
            // Validate the data structure
            if (!Array.isArray(cardData) || cardData.length === 0) {
              throw new Error('Invalid data format');
            }
            
            // Update the flashcard with the generated content
            const cardFormat = flashcardNode._value || {};
            cardFormat.cards = cardData.map((card: any) => ({
              front: card.front || 'Question',
              back: card.back || 'Answer'
            }));
            cardFormat.currentIndex = 0;
            cardFormat.isFlipped = false;
            
            // Get the Quill blot instance and update it
            const blot = quill.constructor.find(flashcardNode);
            if (blot) {
              try {
                // Temporarily disable markdown module to prevent error during update
                const markdownModule = quill.getModule('markdown');
                const originalProcessorEnabled = markdownModule?.options?.enabled;
                
                // Disable markdown processor if it exists
                if (markdownModule && markdownModule.options) {
                  markdownModule.options.enabled = false;
                }
                
                // Create an update event to be handled by the flashcard blot
                const updateEvent = new CustomEvent('flashcard-update', {
                  detail: cardFormat,
                  bubbles: false
                });
                
                // Dispatch the event to update the flashcard
                flashcardNode.dispatchEvent(updateEvent);
                
                // Re-enable markdown processor if it was enabled before
                if (markdownModule && markdownModule.options && originalProcessorEnabled !== undefined) {
                  markdownModule.options.enabled = originalProcessorEnabled;
                }
                
                toast({
                  title: 'Flashcards generated',
                  description: `Successfully created ${cardData.length} flashcards from your content.`,
                });

                // Add a reminder to save manually
                toast({
                  title: 'Remember to save',
                  description: 'Click the Save button in the title bar to save your changes.',
                  duration: 5000,
                });
              } catch (error) {
                console.error('Error updating flashcard:', error);
                toast({
                  title: 'Error updating flashcards',
                  description: 'Something went wrong while updating the flashcard content.',
                  variant: 'destructive',
                });
              }
            }
          } catch (error) {
            console.error('Error parsing AI response:', error, generatedText);
            toast({
              title: 'Error generating flashcards',
              description: 'Failed to parse AI response. Please try again.',
              variant: 'destructive',
            });
          }
        }
      } catch (error: any) {
        console.error('Error generating flashcards:', error);
        toast({
          title: 'Error generating flashcards',
          description: error.message || 'Something went wrong while generating flashcards.',
          variant: 'destructive',
        });
      }
    };
    
    // Add PDF to flashcard handler
    const handlePDFToFlashcard = async (e: any) => {
      const { file, flashcardNode, cardCount = 10 } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      try {
        // Show a loading message
        toast({
          title: 'Processing PDF',
          description: 'Extracting text from your PDF...',
        });
        
        // Save original Markdown module state and completely disable it
        let markdownModule: any = null;
        let originalOnTextChange: Function | null = null;
        let originalOnRemoveElement: Function | null = null;
        let originalProcessFn: Function | null = null;
        let originalEnabled = false;
        let originalMatches: any[] = [];
        
        try {
          markdownModule = quill?.getModule('markdown');
          
          if (markdownModule) {
            // Save original state
            originalEnabled = markdownModule.options?.enabled || false;
            originalMatches = markdownModule.matches ? [...markdownModule.matches] : [];
            
            // Grab original functions
            if (markdownModule.activity) {
              if (typeof markdownModule.activity.onTextChange === 'function') {
                originalOnTextChange = markdownModule.activity.onTextChange;
                // Replace with no-op function
                markdownModule.activity.onTextChange = function() { return undefined; };
              }
              
              if (typeof markdownModule.activity.onRemoveElement === 'function') {
                originalOnRemoveElement = markdownModule.activity.onRemoveElement;
                // Replace with safe function
                markdownModule.activity.onRemoveElement = function() { return undefined; };
              }
            }
            
            // Disable the entire module
            if (markdownModule.options) {
              markdownModule.options.enabled = false;
            }
            
            // Clear any pending matches
            if (markdownModule.matches) {
              markdownModule.matches = [];
            }
            
            console.log('Markdown module temporarily disabled for PDF processing');
          }
          
          // Use a CDN version of pdf.js to extract text
          // First, dynamically load the PDF.js library if not already loaded
          if (!window.pdfjsLib) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Failed to load PDF.js'));
              document.head.appendChild(script);
            });
          }
          
          // Read the PDF file
          const arrayBuffer = await file.arrayBuffer();
          const pdfData = new Uint8Array(arrayBuffer);
          
          // Load the PDF document
          if (!window.pdfjsLib) {
            throw new Error('PDF.js library failed to load properly');
          }
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
          
          // Trim the extracted text to avoid exceeding token limits
          const maxLength = 15000; // Adjust based on your API's limits
          if (extractedText.length > maxLength) {
            extractedText = extractedText.substring(0, maxLength) + '...';
            toast({
              title: 'PDF content truncated',
              description: 'The PDF was too large and has been truncated for processing.',
            });
          }
          
          // Update toast
          toast({
            title: 'Generating flashcards',
            description: 'AI is analyzing your PDF content...',
          });
          
          // Generate flashcards using the AI
          const prompt = `Create ${cardCount} educational flashcards in the format of question-answer pairs from the following PDF content. 
          Each card should have a clear, concise question on the front and a comprehensive answer on the back.
          Make the questions challenging but fair, focusing on the most important concepts.
          Format your response as a JSON array of objects with 'front' and 'back' properties:
          [
            { "front": "Question 1", "back": "Answer 1" },
            { "front": "Question 2", "back": "Answer 2" }
          ]
          Content: ${extractedText}`;
          
          const generatedText = await generateText(prompt, '');
          
          if (generatedText) {
            try {
              // Parse the generated text as JSON
              let cardData;
              
              // Extract JSON if it's within a code block
              if (generatedText.includes('```json')) {
                const jsonMatch = generatedText.match(/```json([\s\S]*?)```/);
                cardData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
              } else if (generatedText.includes('```')) {
                const jsonMatch = generatedText.match(/```([\s\S]*?)```/);
                cardData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
              } else {
                // Try to parse the whole response as JSON
                cardData = JSON.parse(generatedText);
              }
              
              // Validate the data structure
              if (!Array.isArray(cardData) || cardData.length === 0) {
                throw new Error('Invalid data format');
              }
              
              // Update the flashcard with the generated content
              const cardFormat = flashcardNode._value || {};
              cardFormat.cards = cardData.map((card: any) => ({
                front: card.front || 'Question',
                back: card.back || 'Answer'
              }));
              cardFormat.currentIndex = 0;
              cardFormat.isFlipped = false;
              
              // Get the Quill blot instance and update it
              const blot = quill.constructor.find(flashcardNode);
              if (blot) {
                // Create an update event to be handled by the flashcard blot
                const updateEvent = new CustomEvent('flashcard-update', {
                  detail: cardFormat,
                  bubbles: false
                });
                
                // Dispatch the event to update the flashcard
                flashcardNode.dispatchEvent(updateEvent);
                
                toast({
                  title: 'Flashcards generated from PDF',
                  description: `Successfully created ${cardData.length} flashcards from your PDF.`,
                });

                // Add a reminder to save manually
                toast({
                  title: 'Remember to save',
                  description: 'Click the Save button in the title bar to save your changes.',
                  duration: 5000,
                });
              }
            } catch (error) {
              console.error('Error parsing AI response:', error, generatedText);
              toast({
                title: 'Error generating flashcards',
                description: 'Failed to parse AI response. Please try again.',
                variant: 'destructive',
              });
            }
          }
        } finally {
          // Restore Markdown processor state
          if (markdownModule) {
            // Restore enabled state
            if (markdownModule.options && originalEnabled !== undefined) {
              markdownModule.options.enabled = originalEnabled;
            }
            
            // Restore matches
            if (markdownModule.matches) {
              markdownModule.matches = originalMatches;
            }
            
            // Restore the original functions
            if (markdownModule.activity) {
              if (originalOnTextChange) {
                markdownModule.activity.onTextChange = originalOnTextChange;
              }
              if (originalOnRemoveElement) {
                markdownModule.activity.onRemoveElement = originalOnRemoveElement;
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Error processing PDF:', error);
        toast({
          title: 'Error processing PDF',
          description: error.message || 'Something went wrong while processing your PDF.',
          variant: 'destructive',
        });
      }
    };
    
    // Add quiz AI generation handler
    const handleQuizAIGenerate = async (e: any) => {
      const { content, questionCount, quizNode } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      try {
        // Show a loading message
        toast({
          title: 'Generating quiz questions',
          description: 'AI is analyzing your content...',
        });
        
        // Generate quiz questions using the AI
        const prompt = `Create ${questionCount} multiple-choice quiz questions from the following content. 
        Each question should have exactly 4 options with only one correct answer.
        Make the questions challenging but fair, focusing on the most important concepts.
        Format your response as a JSON array of objects:
        [
          {
            "question": "Question text here?",
            "options": [
              { "text": "Option 1 (correct answer)", "isCorrect": true },
              { "text": "Option 2", "isCorrect": false },
              { "text": "Option 3", "isCorrect": false },
              { "text": "Option 4", "isCorrect": false }
            ]
          }
        ]
        Content: ${content}`;
        
        const generatedText = await generateText(prompt, '');
        
        if (generatedText) {
          try {
            // Parse the generated text as JSON
            let questionData;
            
            // Extract JSON if it's within a code block
            if (generatedText.includes('```json')) {
              const jsonMatch = generatedText.match(/```json([\s\S]*?)```/);
              questionData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
            } else if (generatedText.includes('```')) {
              const jsonMatch = generatedText.match(/```([\s\S]*?)```/);
              questionData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
            } else {
              // Try to parse the whole response as JSON
              questionData = JSON.parse(generatedText);
            }
            
            // Validate the data structure
            if (!Array.isArray(questionData) || questionData.length === 0) {
              throw new Error('Invalid data format');
            }
            
            // Ensure each question has exactly 4 options and one correct answer
            questionData = questionData.map((q: any) => {
              // Make sure we have a question
              const question = q.question || 'Question';
              
              // Make sure we have options
              let options = Array.isArray(q.options) ? [...q.options] : [];
              
              // Make sure we have exactly 4 options
              if (options.length < 4) {
                // Add default options if needed
                while (options.length < 4) {
                  options.push({
                    text: `Option ${options.length + 1}`,
                    isCorrect: false
                  });
                }
              } else if (options.length > 4) {
                // Trim extra options
                options = options.slice(0, 4);
              }
              
              // Now check for correct answers
              const correctCount = options.filter((o: any) => o.isCorrect).length;
              
              // Ensure we have exactly one correct answer
              if (correctCount === 0) {
                // No correct answers, mark a random option as correct
                const randomIndex = Math.floor(Math.random() * options.length);
                options[randomIndex].isCorrect = true;
                console.log('No correct answer provided by AI, marking random option as correct');
              } else if (correctCount > 1) {
                // Too many correct answers, keep only one random one
                const correctOptions = options.filter((o: any) => o.isCorrect);
                const randomCorrect = correctOptions[Math.floor(Math.random() * correctOptions.length)];
                options = options.map((o: any) => ({
                  ...o,
                  isCorrect: o === randomCorrect
                }));
                console.log('Multiple correct answers provided by AI, keeping one random one');
              }
              
              // Randomize the order of options
              for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
              }
              
              return {
                question,
                options
              };
            });
            
            // Update the quiz with the generated content
            const quizFormat = {
              questions: questionData,
              currentIndex: 0
            };
            
            // Get the Quill blot instance and update it
            const blot = quill.constructor.find(quizNode);
            if (blot) {
              try {
                // Temporarily disable markdown module to prevent error during update
                const markdownModule = quill.getModule('markdown');
                const originalProcessorEnabled = markdownModule?.options?.enabled;
                
                // Disable markdown processor if it exists
                if (markdownModule && markdownModule.options) {
                  markdownModule.options.enabled = false;
                }
                
                // Create an update event to be handled by the quiz blot
                const updateEvent = new CustomEvent('quiz-update', {
                  detail: quizFormat,
                  bubbles: false
                });
                
                // Dispatch the event to update the quiz
                quizNode.dispatchEvent(updateEvent);
                
                // Re-enable markdown processor if it was enabled before
                if (markdownModule && markdownModule.options && originalProcessorEnabled !== undefined) {
                  markdownModule.options.enabled = originalProcessorEnabled;
                }
                
                toast({
                  title: 'Quiz generated',
                  description: `Successfully created ${questionData.length} quiz questions from your content.`,
                });

                // Add a reminder to save manually
                toast({
                  title: 'Remember to save',
                  description: 'Click the Save button in the title bar to save your changes.',
                  duration: 5000,
                });
              } catch (error) {
                console.error('Error updating quiz:', error);
                toast({
                  title: 'Error updating quiz',
                  description: 'Something went wrong while updating the quiz content.',
                  variant: 'destructive',
                });
              }
            }
          } catch (error) {
            console.error('Error parsing AI response:', error, generatedText);
            toast({
              title: 'Error generating quiz',
              description: 'Failed to parse AI response. Please try again.',
              variant: 'destructive',
            });
          }
        }
      } catch (error: any) {
        console.error('Error generating quiz questions:', error);
        toast({
          title: 'Error generating quiz',
          description: error.message || 'Something went wrong while generating quiz questions.',
          variant: 'destructive',
        });
      }
    };
    
    // Add PDF to quiz handler
    const handlePDFToQuiz = async (e: any) => {
      const { file, quizNode, questionCount = 5 } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      try {
        // Show a loading message
        toast({
          title: 'Processing PDF',
          description: 'Extracting text from your PDF...',
        });
        
        // Save original Markdown module state and completely disable it
        let markdownModule: any = null;
        let originalOnTextChange: Function | null = null;
        let originalOnRemoveElement: Function | null = null;
        let originalProcessFn: Function | null = null;
        let originalEnabled = false;
        let originalMatches: any[] = [];
        
        try {
          markdownModule = quill?.getModule('markdown');
          
          if (markdownModule) {
            // Save original state
            originalEnabled = markdownModule.options?.enabled || false;
            originalMatches = markdownModule.matches ? [...markdownModule.matches] : [];
            
            // Grab original functions
            if (markdownModule.activity) {
              if (typeof markdownModule.activity.onTextChange === 'function') {
                originalOnTextChange = markdownModule.activity.onTextChange;
                // Replace with no-op function
                markdownModule.activity.onTextChange = function() { return undefined; };
              }
              
              if (typeof markdownModule.activity.onRemoveElement === 'function') {
                originalOnRemoveElement = markdownModule.activity.onRemoveElement;
                // Replace with safe function
                markdownModule.activity.onRemoveElement = function() { return undefined; };
              }
            }
            
            // Disable the entire module
            if (markdownModule.options) {
              markdownModule.options.enabled = false;
            }
            
            // Clear any pending matches
            if (markdownModule.matches) {
              markdownModule.matches = [];
            }
            
            console.log('Markdown module temporarily disabled for PDF processing');
          }
          
          // Use a CDN version of pdf.js to extract text
          // First, dynamically load the PDF.js library if not already loaded
          if (!window.pdfjsLib) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Failed to load PDF.js'));
              document.head.appendChild(script);
            });
          }
          
          // Read the PDF file
          const arrayBuffer = await file.arrayBuffer();
          const pdfData = new Uint8Array(arrayBuffer);
          
          // Load the PDF document
          if (!window.pdfjsLib) {
            throw new Error('PDF.js library failed to load properly');
          }
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
          
          // Trim the extracted text to avoid exceeding token limits
          const maxLength = 15000; // Adjust based on your API's limits
          if (extractedText.length > maxLength) {
            extractedText = extractedText.substring(0, maxLength) + '...';
            toast({
              title: 'PDF content truncated',
              description: 'The PDF was too large and has been truncated for processing.',
            });
          }
          
          // Update toast
          toast({
            title: 'Generating quiz',
            description: 'AI is analyzing your PDF content...',
          });
          
          // Generate quiz questions using the AI
          const prompt = `Create ${questionCount} multiple-choice quiz questions from the following PDF content. 
          Each question should have exactly 4 options with only one correct answer.
          Make the questions challenging but fair, focusing on the most important concepts.
          Format your response as a JSON array of objects:
          [
            {
              "question": "Question text here?",
              "options": [
                { "text": "Option 1 (correct answer)", "isCorrect": true },
                { "text": "Option 2", "isCorrect": false },
                { "text": "Option 3", "isCorrect": false },
                { "text": "Option 4", "isCorrect": false }
              ]
            }
          ]
          Content: ${extractedText}`;
          
          const generatedText = await generateText(prompt, '');
          
          if (generatedText) {
            try {
              // Parse the generated text as JSON
              let questionData;
              
              // Extract JSON if it's within a code block
              if (generatedText.includes('```json')) {
                const jsonMatch = generatedText.match(/```json([\s\S]*?)```/);
                questionData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
              } else if (generatedText.includes('```')) {
                const jsonMatch = generatedText.match(/```([\s\S]*?)```/);
                questionData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
              } else {
                // Try to parse the whole response as JSON
                questionData = JSON.parse(generatedText);
              }
              
              // Validate the data structure
              if (!Array.isArray(questionData) || questionData.length === 0) {
                throw new Error('Invalid data format');
              }
              
              // Ensure each question has exactly 4 options and one correct answer
              questionData = questionData.map((q: any) => {
                // Make sure we have a question
                const question = q.question || 'Question';
                
                // Make sure we have options
                let options = Array.isArray(q.options) ? [...q.options] : [];
                
                // Make sure we have exactly 4 options
                if (options.length < 4) {
                  // Add default options if needed
                  while (options.length < 4) {
                    options.push({
                      text: `Option ${options.length + 1}`,
                      isCorrect: false
                    });
                  }
                } else if (options.length > 4) {
                  // Trim extra options
                  options = options.slice(0, 4);
                }
                
                // Now check for correct answers
                const correctCount = options.filter((o: any) => o.isCorrect).length;
                
                // Ensure we have exactly one correct answer
                if (correctCount === 0) {
                  // No correct answers, mark a random option as correct
                  const randomIndex = Math.floor(Math.random() * options.length);
                  options[randomIndex].isCorrect = true;
                } else if (correctCount > 1) {
                  // Too many correct answers, keep only one random one
                  const correctOptions = options.filter((o: any) => o.isCorrect);
                  const randomCorrect = correctOptions[Math.floor(Math.random() * correctOptions.length)];
                  options = options.map((o: any) => ({
                    ...o,
                    isCorrect: o === randomCorrect
                  }));
                }
                
                return {
                  question,
                  options
                };
              });
              
              // Update the quiz with the generated content
              const quizFormat = {
                questions: questionData,
                currentIndex: 0
              };
              
              // Get the Quill blot instance and update it
              const blot = quill.constructor.find(quizNode);
              if (blot) {
                // Create an update event to be handled by the quiz blot
                const updateEvent = new CustomEvent('quiz-update', {
                  detail: quizFormat,
                  bubbles: false
                });
                
                // Dispatch the event to update the quiz
                quizNode.dispatchEvent(updateEvent);
                
                toast({
                  title: 'Quiz generated from PDF',
                  description: `Successfully created ${questionData.length} quiz questions from your PDF.`,
                });

                // Add a reminder to save manually
                toast({
                  title: 'Remember to save',
                  description: 'Click the Save button in the title bar to save your changes.',
                  duration: 5000,
                });
              }
            } catch (error) {
              console.error('Error parsing AI response:', error, generatedText);
              toast({
                title: 'Error generating quiz',
                description: 'Failed to parse AI response. Please try again.',
                variant: 'destructive',
              });
            }
          }
        } finally {
          // Restore Markdown processor state
          if (markdownModule) {
            // Restore enabled state
            if (markdownModule.options && originalEnabled !== undefined) {
              markdownModule.options.enabled = originalEnabled;
            }
            
            // Restore matches
            if (markdownModule.matches) {
              markdownModule.matches = originalMatches;
            }
            
            // Restore the original functions
            if (markdownModule.activity) {
              if (originalOnTextChange) {
                markdownModule.activity.onTextChange = originalOnTextChange;
              }
              if (originalOnRemoveElement) {
                markdownModule.activity.onRemoveElement = originalOnRemoveElement;
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Error processing PDF:', error);
        toast({
          title: 'Error processing PDF',
          description: error.message || 'Something went wrong while processing your PDF.',
          variant: 'destructive',
        });
      }
    };
    
    // Add PDF section summary handler
    const handlePdfSectionSummary = async (e: any) => {
      const { content } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      console.log('Processing PDF section for summarization');
      setProcessingPdfSection(true);
      
      try {
        // Use AI to generate a heading and summary for the section
        const prompt = `Given the following text from a PDF section, please generate a concise heading (6-8 words maximum) 
        that captures the main topic, and a brief summary (2-3 sentences) that outlines the key points.
        Format your response as a JSON object with 'heading' and 'summary' properties:
        {
          "heading": "The heading for this section",
          "summary": "A brief 2-3 sentence summary of the key points."
        }
        
        Here is the text section:
        ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}`;
        
        const generatedText = await generateText(prompt, '');
        
        if (generatedText) {
          try {
            // Parse the generated text as JSON
            let result;
            
            // Extract JSON if it's within a code block
            if (generatedText.includes('```json')) {
              const jsonMatch = generatedText.match(/```json([\s\S]*?)```/);
              result = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
            } else if (generatedText.includes('```')) {
              const jsonMatch = generatedText.match(/```([\s\S]*?)```/);
              result = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
            } else {
              // Try to parse the whole response as JSON
              result = JSON.parse(generatedText);
            }
            
            // Validate the result has heading and summary
            if (!result.heading || !result.summary) {
              throw new Error('Invalid response format');
            }
            
            // Create an event with the results
            const responseEvent = new CustomEvent('ai-section-summary-response', {
              detail: {
                heading: result.heading,
                summary: result.summary
              },
              bubbles: true
            });
            
            // Dispatch the event
            document.dispatchEvent(responseEvent);
            
          } catch (error) {
            console.error('Error parsing AI response for PDF section:', error);
            
            // Create a fallback response
            const words = content.split(/\s+/);
            const headingWords = words.slice(0, Math.min(8, words.length));
            let heading = headingWords.join(' ');
            heading = heading.charAt(0).toUpperCase() + heading.slice(1);
            
            const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
            const summaryText = sentences.slice(0, Math.min(2, sentences.length)).join('. ');
            const summary = summaryText.trim() + (sentences.length > 2 ? '...' : '.');
            
            const responseEvent = new CustomEvent('ai-section-summary-response', {
              detail: {
                heading,
                summary
              },
              bubbles: true
            });
            
            document.dispatchEvent(responseEvent);
          }
        }
      } catch (error: any) {
        console.error('Error generating summary for PDF section:', error);
        
        // Create a basic response even on error
        const words = content.split(/\s+/);
        const headingWords = words.slice(0, Math.min(8, words.length));
        let heading = headingWords.join(' ');
        heading = heading.charAt(0).toUpperCase() + heading.slice(1);
        
        const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
        const summaryText = sentences.slice(0, Math.min(2, sentences.length)).join('. ');
        const summary = summaryText.trim() + (sentences.length > 2 ? '...' : '.');
        
        const responseEvent = new CustomEvent('ai-section-summary-response', {
          detail: {
            heading,
            summary
          },
          bubbles: true
        });
        
        document.dispatchEvent(responseEvent);
      } finally {
        setProcessingPdfSection(false);
      }
    };
    
    // Add a handler for PDF content formatting with AI
    const handlePdfContentFormatting = async (e: any) => {
      const { content, heading, formattingInstructions } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      console.log('Formatting PDF content for better readability');
      setProcessingPdfSection(true);
      
      try {
        // Use AI to generate better formatted content
        const prompt = `You are an expert in document formatting and readability. 
        Please reformat and restructure the following content extracted from a PDF to make it more readable.
        The content is about: "${heading}"
        
        Transform the raw text into well-structured content with:
        1. Proper paragraph breaks
        2. Appropriate bullet points or numbered lists where applicable
        3. Clear subheadings for different topics (using markdown ### for subheadings)
        4. Highlight important terms or definitions with emphasis (using *term* or **term**)
        5. Fix any OCR or formatting issues you notice
        6. Remove any irrelevant page numbers, headers, or footers
        
        Format your response using proper Markdown syntax. DO NOT summarize or change the meaning - 
        maintain all the original information, just improve the formatting and structure.
        
        ${formattingInstructions || ''}
        
        Here is the content to reformat:
        ${content}`;
        
        const formattedText = await generateText(prompt, '');
        
        if (formattedText) {
          // Create an event with the results
          const responseEvent = new CustomEvent('ai-formatted-pdf-content-response', {
            detail: {
              formattedContent: formattedText
            },
            bubbles: true
          });
          
          // Dispatch the event
          document.dispatchEvent(responseEvent);
        } else {
          throw new Error('Failed to format content');
        }
      } catch (error: any) {
        console.error('Error formatting PDF content:', error);
        
        // Create a response with the original content as fallback
        const responseEvent = new CustomEvent('ai-formatted-pdf-content-response', {
          detail: {
            formattedContent: content
          },
          bubbles: true
        });
        
        document.dispatchEvent(responseEvent);
      } finally {
        setProcessingPdfSection(false);
      }
    };
    
    // Listen for the flashcard AI generation event
    document.addEventListener('flashcard-ai-generate', handleFlashcardAIGenerate);
    
    // Listen for the PDF upload event for flashcards
    document.addEventListener('flashcard-pdf-upload', handlePDFToFlashcard);
    
    // Listen for the quiz AI generation event
    document.addEventListener('quiz-ai-generate', handleQuizAIGenerate);
    
    // Listen for the PDF upload event for quiz
    document.addEventListener('quiz-pdf-upload', handlePDFToQuiz);
    
    // Listen for PDF section summarization requests
    document.addEventListener('ai-generate-section-summary', handlePdfSectionSummary);
    
    // Listen for PDF content formatting requests
    document.addEventListener('ai-format-pdf-content', handlePdfContentFormatting);
    
    // Direct test for keyboard input
    quill.root.addEventListener('keydown', (e: KeyboardEvent) => {
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
    });
    
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
    
    document.addEventListener('keydown', globalSlashHandler);
    
    // Setup selection handler for cursors
    const cleanupSelectionHandler = setupSelectionHandler();
    console.log('QuillEditor: Selection handler setup complete');
    
    // Test slash commands
    try {
      const slashCommandsModule = quill.getModule('slashCommands');
      console.log('QuillEditor: Slash commands module check:', { 
        exists: !!slashCommandsModule,
        methods: slashCommandsModule ? Object.getOwnPropertyNames(slashCommandsModule) : []
      });
    } catch (err) {
      console.error('QuillEditor: Error checking slash commands module', err);
    }
    
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
    
    // Add with capture phase to ensure it runs before Quill's handlers, but ONLY for Enter key
    document.addEventListener('keydown', handleGlobalKeydown, true);
    
    // Cleanup
    return () => {
      console.log('QuillEditor: Cleaning up event handlers');
      quill.off('text-change', quillHandler);
      cleanupSelectionHandler();
      document.removeEventListener('keydown', globalSlashHandler);
      document.removeEventListener('keydown', handleGlobalKeydown, true);
      document.removeEventListener('flashcard-ai-generate', handleFlashcardAIGenerate);
      document.removeEventListener('flashcard-pdf-upload', handlePDFToFlashcard);
      document.removeEventListener('quiz-ai-generate', handleQuizAIGenerate);
      document.removeEventListener('quiz-pdf-upload', handlePDFToQuiz);
      document.removeEventListener('ai-generate-section-summary', handlePdfSectionSummary);
      document.removeEventListener('ai-format-pdf-content', handlePdfContentFormatting);
      document.removeEventListener('flashcard-save-needed', handleFlashcardSave);
      document.removeEventListener('quiz-save-needed', handleQuizSave);
    };
  }, [quill, quillHandler, setupSelectionHandler, generateText, apiKeyExists, toast]);

  // Handle document changes from other users
  useEffect(() => {
    if (quill === null || socket === null) return;
    const socketHandler = (deltas: any, id: string) => {
      if (id === fileId) {
        quill.updateContents(deltas);
      }
    };
    socket.on('receive-changes', socketHandler);
    return () => {
      socket.off('receive-changes', socketHandler);
    };
  }, [quill, socket, fileId]);

  // Set up collaboration with cursor tracking
  useEffect(() => {
    if (!fileId || quill === null) return;
    const room = supabase.channel(fileId);
    const subscription = room
      .on('presence', { event: 'sync' }, () => {
        const newState = room.presenceState();
        const newCollaborators = Object.values(newState).flat() as any[];
        
        // Filter out duplicate collaborators by ID
        const uniqueCollaborators = Array.from(
          new Map(
            newCollaborators.map((collab: { id: string; email: string; avatarUrl: string }) => 
              [collab.id, collab]
            )
          ).values()
        ) as { id: string; email: string; avatarUrl: string }[];

        if (user) {
          const allCursors: any = [];
          uniqueCollaborators.forEach(
            (collaborator: { id: string; email: string; avatarUrl: string; avatar?: string }) => {
              if (collaborator.id !== user.id) {
                const userCursor = quill.getModule('cursors');
                userCursor.createCursor(
                  collaborator.id,
                  collaborator.email.split('@')[0],
                  `#${Math.random().toString(16).slice(2, 8)}`
                );
                allCursors.push(userCursor);
              }
            }
          );
          setLocalCursors(allCursors);
        }
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED' || !user) return;
        const response = await findUser(user.id);
        if (!response) return;

        room.track({
          id: user.id,
          email: user.email?.split('@')[0],
          avatarUrl: response.avatarUrl
            ? supabase.storage.from('avatars').getPublicUrl(response.avatarUrl)
                .data.publicUrl
            : '',
        });
      });
    return () => {
      supabase.removeChannel(room);
    };
  }, [fileId, quill, supabase, user]);

  // Add this effect after quill initialization
  useEffect(() => {
    if (!quill) return;
    
    // Create a function to process markdown on the loaded content
    const processMarkdown = () => {
      try {
        const markdownModule = quill.getModule('markdown');
        if (markdownModule) {
          console.log('Triggering markdown processing after content load');
          
          // Make sure markdown is enabled
          if (markdownModule.options) {
            markdownModule.options.enabled = true;
          }
          
          // Call the process method if available
          if (typeof markdownModule.process === 'function') {
            markdownModule.process();
          }
          
          // Also try the activity method
          if (markdownModule.activity && typeof markdownModule.activity.onTextChange === 'function') {
            markdownModule.activity.onTextChange();
          }
        }
      } catch (err) {
        console.error('Error processing markdown after load:', err);
      }
    };
    
    // Process immediately and also after a delay to ensure content is fully loaded
    processMarkdown();
    
    // Also process after a delay to make sure content is fully loaded and rendered
    const delayedProcess = setTimeout(() => {
      processMarkdown();
    }, 500);
    
    return () => clearTimeout(delayedProcess);
  }, [quill]);

  // Handle export to markdown
  const handleExportMarkdown = async () => {
    const markdown = await getMarkdownContent();
    if (!markdown) return;
    
    // Create a Blob with the markdown content
    const blob = new Blob([markdown], { type: 'text/markdown' });
    
    // Create an anchor element and trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${details.title || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Add empty lines effect
  useEffect(() => {
    if (!quill) return;
    
    // Only add empty lines if the editor is empty
    if (quill.getLength() <= 1) { // Quill always has at least 1 character (newline)
      // Insert 20 empty lines
      const emptyLines = Array(20).fill('\n').join('');
      quill.setText(emptyLines);
    }
  }, [quill]);

  // Add markdown processing effect
  useEffect(() => {
    if (!quill) return;
    
    // Create a function to process markdown on the loaded content
    const processMarkdown = () => {
      try {
        // Process markdown if module exists
        const markdownModule = quill.getModule('markdown');
        if (markdownModule) {
          console.log('Triggering markdown processing after content load');
          
          // Make sure markdown is enabled
          if (markdownModule.options) {
            markdownModule.options.enabled = true;
          }
          
          // Call the process method if available
          if (typeof markdownModule.process === 'function') {
            markdownModule.process();
          }
          
          // Also try the activity method
          if (markdownModule.activity && typeof markdownModule.activity.onTextChange === 'function') {
            markdownModule.activity.onTextChange();
          }
        }
        
        // Process tables if the module exists - with error handling
        try {
          const tableModule = quill.getModule('markdownTable');
          if (tableModule && typeof tableModule.detectAndRenderTables === 'function') {
            console.log('Processing tables in content');
            tableModule.detectAndRenderTables();
          }
        } catch (tableError) {
          console.error('Error processing tables:', tableError);
        }
      } catch (err) {
        console.error('Error processing markdown after load:', err);
      }
    };
    
    // Create a debounced version to prevent excessive processing
    let markdownTimeout: ReturnType<typeof setTimeout>;
    const debouncedProcessMarkdown = () => {
      clearTimeout(markdownTimeout);
      markdownTimeout = setTimeout(processMarkdown, 300);
    };
    
    // Only process once at load time, not twice
    debouncedProcessMarkdown();
    
    // Add an MutationObserver to fix excessive markdown processing
    const editorElement = quill.root.closest('.ql-container');
    if (editorElement) {
      // Track if we're currently processing to prevent recursive calls
      let isProcessing = false;
      
      const observer = new MutationObserver((mutations) => {
        // Skip if we're already processing to prevent recursive updates
        if (isProcessing) return;
        
        // Check if any mutation is relevant to tables (contains pipe characters)
        const hasTableMutation = mutations.some(mutation => {
          if (mutation.type === 'characterData') {
            return mutation.target.textContent?.includes('|');
          } else if (mutation.type === 'childList') {
            return Array.from(mutation.addedNodes).some(node => 
              (node as HTMLElement).textContent?.includes('|')
            );
          }
          return false;
        });
        
        // Only process if table-related changes detected
        if (hasTableMutation) {
          isProcessing = true;
          debouncedProcessMarkdown();
          setTimeout(() => {
            isProcessing = false;
          }, 400); // Ensure we don't process again too quickly
        }
      });
      
      observer.observe(editorElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      return () => {
        clearTimeout(markdownTimeout);
        observer.disconnect();
      };
    }
    
    return () => clearTimeout(markdownTimeout);
  }, [quill]);

  return (
    <>
      <div className="contents">
        {/* Render trash banner if document is in trash */}
        <TrashBanner 
          dirType={dirType}
          inTrash={details.inTrash}
          onRestore={restoreFileHandler}
          onDelete={deleteFileHandler}
        />
        
        {/* Header with breadcrumbs and collaborators */}
        <EditorHeader 
          breadCrumbs={breadCrumbs}
          collaborators={collaborators}
          saving={saving}
          onExportMarkdown={handleExportMarkdown}
          fileId={fileId || undefined}
          folderId={dirType === 'file' ? dirDetails?.id || undefined : undefined}
          fileContent={quill?.getContents() ? JSON.stringify(quill.getContents()) : undefined}
          onSave={() => {
            // Create minimal delta to trigger save
            if (quill) {
              const delta = {
                ops: [{ retain: quill.getLength() - 1 }]
              };
              const oldDelta = quill.getContents();
              quillHandler(delta, oldDelta, 'user');
              
              toast({
                title: 'Saving changes',
                description: 'Your document is being saved.',
              });
            }
          }}
        />
      </div>
      
      {/* Document banner image */}
      <DocumentBanner
        bannerUrl={details.bannerUrl}
        onDeleteBanner={deleteBanner}
        deletingBanner={deletingBanner}
      />
      
      {/* Document content area */}
      <div className="flex justify-start items-start flex-col mt-2 relative w-full px-2">
        {/* Document title and icon */}
        <DocumentTitle
          title={details.title}
          iconId={details.iconId}
          onIconChange={iconOnChange}
        />
        
        {/* Instructions for markdown */}
        <div className="text-sm text-gray-500 max-w-[1200px] w-full mb-2 text-left pl-5">
          Type <kbd className="px-2 py-1 bg-gray-100 rounded">/</kbd> for commands or use <kbd className="px-2 py-1 bg-gray-100 rounded">Markdown</kbd> directly:
          <ul className="list-disc text-xs ml-4 mt-1 text-gray-400">
            <li><code># Heading 1</code>, <code>## Heading 2</code></li> 
            <li>Checbox use <code>[ ]</code> or <code>[x]</code> followed by a space</li>
            <li><code>* item</code> or <code>1. item</code> for lists</li>
            <li><code>**bold**</code>, <code>*italic*</code>, <code>~~strikethrough~~</code></li>
            <li><code>`code`</code>, <code>```code block```</code></li>
            <li><code>&gt; blockquote</code></li>
          </ul>
        </div>
        
        {/* Quill editor container */}
        <div
          id="container"
          className="max-w-[1200px] w-full pl-2"
          ref={wrapperRef}
        ></div>
      </div>
      
      {/* AI Prompt Dialog */}
      <AIPromptDialog 
        isOpen={showAIPrompt}
        onSubmit={handleAIGenerate}
        onCancel={handleAIPromptCancel}
      />
      
      {/* API Key Dialog */}
      <APIKeyDialog
        isOpen={showAPIKeyDialog}
        onSubmit={handleAPIKeySubmit}
        onCancel={handleAPIKeyCancel}
      />
    </>
  );
};

export default QuillEditor;