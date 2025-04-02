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
  const handleAIGenerate = useCallback(async (prompt: string, length: TextLengthOption) => {
    if (!quill || !currentRange) return;
    
    try {
      // Get some context from before the insertion point
      const contextContent = quill.getText(
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
      
      // Combine prompt with length instruction
      const fullPrompt = lengthInstruction 
        ? `${prompt}\n\n${lengthInstruction}`
        : prompt;
      
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
  
  // Setup event handlers
  React.useEffect(() => {
    console.log('QuillEditor: Setting up event handlers', { quillInitialized: !!quill });
    if (!quill) return;
    
    // Attach text change handler
    quill.on('text-change', quillHandler);
    console.log('QuillEditor: Text change handler attached');
    
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
    
    // Listen for the flashcard AI generation event
    document.addEventListener('flashcard-ai-generate', handleFlashcardAIGenerate);
    
    // Listen for the quiz AI generation event
    document.addEventListener('quiz-ai-generate', handleQuizAIGenerate);
    
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
      
      return true;
    };
    
    // Add with capture phase to ensure it runs before Quill's handlers
    document.addEventListener('keydown', handleGlobalKeydown, true);
    
    // Cleanup
    return () => {
      console.log('QuillEditor: Cleaning up event handlers');
      quill.off('text-change', quillHandler);
      cleanupSelectionHandler();
      document.removeEventListener('keydown', globalSlashHandler);
      document.removeEventListener('keydown', handleGlobalKeydown, true);
      document.removeEventListener('flashcard-ai-generate', handleFlashcardAIGenerate);
      document.removeEventListener('quiz-ai-generate', handleQuizAIGenerate);
    };
  }, [quill, quillHandler, setupSelectionHandler, generateText, apiKeyExists, toast]);

  // Handle document changes from other users
  React.useEffect(() => {
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (!quill) return;
    
    // Only add empty lines if the editor is empty
    if (quill.getLength() <= 1) { // Quill always has at least 1 character (newline)
      // Insert 20 empty lines
      const emptyLines = Array(20).fill('\n').join('');
      quill.setText(emptyLines);
    }
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

  return (
    <>
      <div className="relative">
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