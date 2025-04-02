'use client';
<<<<<<< Updated upstream
=======
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
>>>>>>> Stashed changes

import Quill from 'quill';
// Or if you only need the core build
// import Quill from 'quill/core';

<<<<<<< Updated upstream
export const QuillEditor = new Quill('#editor');
// import { useAppState } from '@/lib/providers/state-provider';
// import { File, Folder, workspace } from '@/supabase/supabase';
// import React, {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from 'react';
// import 'quill/dist/quill.snow.css';
// import { Button } from '../ui/button';
// import {
//   deleteFile,
//   deleteFolder,
//   findUser,
//   getFileDetails,
//   getFolderDetails,
//   getWorkspaceDetails,
//   updateFile,
//   updateFolder,
//   updateWorkspace,
// } from '@/lib/supabase/queries';
// import { usePathname, useRouter } from 'next/navigation';
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from '../ui/tooltip';
// import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
// import { Badge } from '../ui/badge';
// import Image from 'next/image';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import EmojiPicker from '../global/emoji-picker';
// import BannerUpload from '../banner-upload/banner-upload';
// import { XCircleIcon } from 'lucide-react';
// import { useSocket } from '@/lib/providers/socket-provider';
// import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';

// interface QuillEditorProps {
//   dirDetails: File | Folder | workspace;
//   fileId: string;
//   dirType: 'workspace' | 'folder' | 'file';
// }
// var TOOLBAR_OPTIONS = [
//   ['bold', 'italic', 'underline', 'strike'], // toggled buttons
//   ['blockquote', 'code-block'],

//   [{ header: 1 }, { header: 2 }], // custom button values
//   [{ list: 'ordered' }, { list: 'bullet' }],
//   [{ script: 'sub' }, { script: 'super' }], // superscript/subscript
//   [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
//   [{ direction: 'rtl' }], // text direction
=======
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
>>>>>>> Stashed changes

//   [{ size: ['small', false, 'large', 'huge'] }], // custom dropdown
//   [{ header: [1, 2, 3, 4, 5, 6, false] }],

//   [{ color: [] }, { background: [] }], // dropdown with defaults from theme
//   [{ font: [] }],
//   [{ align: [] }],

//   ['clean'], // remove formatting button
// ];

// const QuillEditor: React.FC<QuillEditorProps> = ({
//   dirDetails,
//   dirType,
//   fileId,
// }) => {
//   const supabase = createClientComponentClient();
//   const { state, workspaceId, folderId, dispatch } = useAppState();
//   const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
//   const { user } = useSupabaseUser();
//   const router = useRouter();
//   const { socket, isConnected } = useSocket();
//   const pathname = usePathname();
//   const [quill, setQuill] = useState<any>(null);
//   const [collaborators, setCollaborators] = useState<
//     { id: string; email: string; avatarUrl: string }[]
//   >([]);
//   const [deletingBanner, setDeletingBanner] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [localCursors, setLocalCursors] = useState<any>([]);

//   const details = useMemo(() => {
//     let selectedDir;
//     if (dirType === 'file') {
//       selectedDir = state.workspaces
//         .find((workspace) => workspace.id === workspaceId)
//         ?.folders.find((folder) => folder.id === folderId)
//         ?.files.find((file) => file.id === fileId);
//     }
//     if (dirType === 'folder') {
//       selectedDir = state.workspaces
//         .find((workspace) => workspace.id === workspaceId)
//         ?.folders.find((folder) => folder.id === fileId);
//     }
//     if (dirType === 'workspace') {
//       selectedDir = state.workspaces.find(
//         (workspace) => workspace.id === fileId
//       );
//     }

<<<<<<< Updated upstream
//     if (selectedDir) {
//       return selectedDir;
//     }
=======
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
>>>>>>> Stashed changes

//     return {
//       title: dirDetails.title,
//       iconId: dirDetails.iconId,
//       createdAt: dirDetails.createdAt,
//       data: dirDetails.data,
//       inTrash: dirDetails.inTrash,
//       bannerUrl: dirDetails.bannerUrl,
//     } as workspace | Folder | File;
//   }, [state, workspaceId, folderId]);

//   const breadCrumbs = useMemo(() => {
//     if (!pathname || !state.workspaces || !workspaceId) return;
//     const segments = pathname
//       .split('/')
//       .filter((val) => val !== 'dashboard' && val);
//     const workspaceDetails = state.workspaces.find(
//       (workspace) => workspace.id === workspaceId
//     );
//     const workspaceBreadCrumb = workspaceDetails
//       ? `${workspaceDetails.iconId} ${workspaceDetails.title}`
//       : '';
//     if (segments.length === 1) {
//       return workspaceBreadCrumb;
//     }

//     const folderSegment = segments[1];
//     const folderDetails = workspaceDetails?.folders.find(
//       (folder) => folder.id === folderSegment
//     );
//     const folderBreadCrumb = folderDetails
//       ? `/ ${folderDetails.iconId} ${folderDetails.title}`
//       : '';

//     if (segments.length === 2) {
//       return `${workspaceBreadCrumb} ${folderBreadCrumb}`;
//     }

//     const fileSegment = segments[2];
//     const fileDetails = folderDetails?.files.find(
//       (file) => file.id === fileSegment
//     );
//     const fileBreadCrumb = fileDetails
//       ? `/ ${fileDetails.iconId} ${fileDetails.title}`
//       : '';

//     return `${workspaceBreadCrumb} ${folderBreadCrumb} ${fileBreadCrumb}`;
//   }, [state, pathname, workspaceId]);

//   //
//   const wrapperRef = useCallback(async (wrapper: any) => {
//     if (typeof window !== 'undefined') {
//       if (wrapper === null) return;
//       wrapper.innerHTML = '';
//       const editor = document.createElement('div');
//       wrapper.append(editor);
//       const Quill = (await import('quill')).default;
//       const QuillCursors = (await import('quill-cursors')).default;
//       Quill.register('modules/cursors', QuillCursors);
//       const q = new Quill(editor, {
//         theme: 'snow',
//         modules: {
//           toolbar: TOOLBAR_OPTIONS,
//           cursors: {
//             transformOnTextChange: true,
//           },
//         },
//       });
//       setQuill(q);
//     }
//   }, []);

//   const restoreFileHandler = async () => {
//     if (dirType === 'file') {
//       if (!folderId || !workspaceId) return;
//       dispatch({
//         type: 'UPDATE_FILE',
//         payload: { file: { inTrash: '' }, fileId, folderId, workspaceId },
//       });
//       await updateFile({ inTrash: '' }, fileId);
//     }
//     if (dirType === 'folder') {
//       if (!workspaceId) return;
//       dispatch({
//         type: 'UPDATE_FOLDER',
//         payload: { folder: { inTrash: '' }, folderId: fileId, workspaceId },
//       });
//       await updateFolder({ inTrash: '' }, fileId);
//     }
//   };

//   const deleteFileHandler = async () => {
//     if (dirType === 'file') {
//       if (!folderId || !workspaceId) return;
//       dispatch({
//         type: 'DELETE_FILE',
//         payload: { fileId, folderId, workspaceId },
//       });
//       await deleteFile(fileId);
//       router.replace(`/dashboard/${workspaceId}`);
//     }
//     if (dirType === 'folder') {
//       if (!workspaceId) return;
//       dispatch({
//         type: 'DELETE_FOLDER',
//         payload: { folderId: fileId, workspaceId },
//       });
//       await deleteFolder(fileId);
//       router.replace(`/dashboard/${workspaceId}`);
//     }
//   };

//   const iconOnChange = async (icon: string) => {
//     if (!fileId) return;
//     if (dirType === 'workspace') {
//       dispatch({
//         type: 'UPDATE_WORKSPACE',
//         payload: { workspace: { iconId: icon }, workspaceId: fileId },
//       });
//       await updateWorkspace({ iconId: icon }, fileId);
//     }
//     if (dirType === 'folder') {
//       if (!workspaceId) return;
//       dispatch({
//         type: 'UPDATE_FOLDER',
//         payload: {
//           folder: { iconId: icon },
//           workspaceId,
//           folderId: fileId,
//         },
//       });
//       await updateFolder({ iconId: icon }, fileId);
//     }
//     if (dirType === 'file') {
//       if (!workspaceId || !folderId) return;

//       dispatch({
//         type: 'UPDATE_FILE',
//         payload: { file: { iconId: icon }, workspaceId, folderId, fileId },
//       });
//       await updateFile({ iconId: icon }, fileId);
//     }
//   };

//   const deleteBanner = async () => {
//     if (!fileId) return;
//     setDeletingBanner(true);
//     if (dirType === 'file') {
//       if (!folderId || !workspaceId) return;
//       dispatch({
//         type: 'UPDATE_FILE',
//         payload: { file: { bannerUrl: '' }, fileId, folderId, workspaceId },
//       });
//       await supabase.storage.from('file-banners').remove([`banner-${fileId}`]);
//       await updateFile({ bannerUrl: '' }, fileId);
//     }
//     if (dirType === 'folder') {
//       if (!workspaceId) return;
//       dispatch({
//         type: 'UPDATE_FOLDER',
//         payload: { folder: { bannerUrl: '' }, folderId: fileId, workspaceId },
//       });
//       await supabase.storage.from('file-banners').remove([`banner-${fileId}`]);
//       await updateFolder({ bannerUrl: '' }, fileId);
//     }
//     if (dirType === 'workspace') {
//       dispatch({
//         type: 'UPDATE_WORKSPACE',
//         payload: {
//           workspace: { bannerUrl: '' },
//           workspaceId: fileId,
//         },
//       });
//       await supabase.storage.from('file-banners').remove([`banner-${fileId}`]);
//       await updateWorkspace({ bannerUrl: '' }, fileId);
//     }
//     setDeletingBanner(false);
//   };

//   useEffect(() => {
//     if (!fileId) return;
//     let selectedDir;
//     const fetchInformation = async () => {
//       if (dirType === 'file') {
//         const { data: selectedDir, error } = await getFileDetails(fileId);
//         if (error || !selectedDir) {
//           return router.replace('/dashboard');
//         }

//         if (!selectedDir[0]) {
//           if (!workspaceId) return;
//           return router.replace(`/dashboard/${workspaceId}`);
//         }
//         if (!workspaceId || quill === null) return;
//         if (!selectedDir[0].data) return;
//         quill.setContents(JSON.parse(selectedDir[0].data || ''));
//         dispatch({
//           type: 'UPDATE_FILE',
//           payload: {
//             file: { data: selectedDir[0].data },
//             fileId,
//             folderId: selectedDir[0].folderId,
//             workspaceId,
//           },
//         });
//       }
//       if (dirType === 'folder') {
//         const { data: selectedDir, error } = await getFolderDetails(fileId);
//         if (error || !selectedDir) {
//           return router.replace('/dashboard');
//         }

//         if (!selectedDir[0]) {
//           router.replace(`/dashboard/${workspaceId}`);
//         }
//         if (quill === null) return;
//         if (!selectedDir[0].data) return;
//         quill.setContents(JSON.parse(selectedDir[0].data || ''));
//         dispatch({
//           type: 'UPDATE_FOLDER',
//           payload: {
//             folderId: fileId,
//             folder: { data: selectedDir[0].data },
//             workspaceId: selectedDir[0].workspaceId,
//           },
//         });
//       }
//       if (dirType === 'workspace') {
//         const { data: selectedDir, error } = await getWorkspaceDetails(fileId);
//         if (error || !selectedDir) {
//           return router.replace('/dashboard');
//         }
//         if (!selectedDir[0] || quill === null) return;
//         if (!selectedDir[0].data) return;
//         quill.setContents(JSON.parse(selectedDir[0].data || ''));
//         dispatch({
//           type: 'UPDATE_WORKSPACE',
//           payload: {
//             workspace: { data: selectedDir[0].data },
//             workspaceId: fileId,
//           },
//         });
//       }
//     };
//     fetchInformation();
//   }, [fileId, workspaceId, quill, dirType]);

//   useEffect(() => {
//     if (quill === null || socket === null || !fileId || !localCursors.length)
//       return;
//     const socketHandler = (range: any, roomId: string, cursorId: string) => {
//       if (roomId === fileId) {
//         const cursorToMove = localCursors.find(
//           (c: any) => c.cursors()?.[0].id === cursorId
//         );
//         if (cursorToMove) {
//           cursorToMove.moveCursor(cursorId, range);
//         }
//       }
//     };
//     socket.on('receive-cursor-move', socketHandler);
//     return () => {
//       socket.off('receive-cursor-move', socketHandler);
//     };
//   }, [quill, socket, fileId, localCursors]);

//   //rooms
//   useEffect(() => {
//     if (socket === null || quill === null || !fileId) return;
//     socket.emit('create-room', fileId);
//   }, [socket, quill, fileId]);

//   //Send quill changes to all clients
//   useEffect(() => {
//     if (quill === null || socket === null || !fileId || !user) return;

//     const selectionChangeHandler = (cursorId: string) => {
//       return (range: any, oldRange: any, source: any) => {
//         if (source === 'user' && cursorId) {
//           socket.emit('send-cursor-move', range, fileId, cursorId);
//         }
//       };
//     };
//     const quillHandler = (delta: any, oldDelta: any, source: any) => {
//       if (source !== 'user') return;
//       if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
//       setSaving(true);
//       const contents = quill.getContents();
//       const quillLength = quill.getLength();
//       saveTimerRef.current = setTimeout(async () => {
//         // if (contents && quillLength !== 1 && fileId) {
//         //   if (dirType == 'workspace') {
//         //     dispatch({
//         //       type: 'UPDATE_WORKSPACE',
//         //       payload: {
//         //         workspace: { data: JSON.stringify(contents) },
//         //         workspaceId: fileId,
//         //       },
//         //     });
//         //     await updateWorkspace({ data: JSON.stringify(contents) }, fileId);
//         //   }
//         //   if (dirType == 'folder') {
//         //     if (!workspaceId) return;
//         //     dispatch({
//         //       type: 'UPDATE_FOLDER',
//         //       payload: {
//         //         folder: { data: JSON.stringify(contents) },
//         //         workspaceId,
//         //         folderId: fileId,
//         //       },
//         //     });
//         //     await updateFolder({ data: JSON.stringify(contents) }, fileId);
//         //   }
//         //   if (dirType == 'file') {
//         //     if (!workspaceId || !folderId) return;
//         //     dispatch({
//         //       type: 'UPDATE_FILE',
//         //       payload: {
//         //         file: { data: JSON.stringify(contents) },
//         //         workspaceId,
//         //         folderId: folderId,
//         //         fileId,
//         //       },
//         //     });
//         //     await updateFile({ data: JSON.stringify(contents) }, fileId);
//         //   }
//         // }
//         setSaving(false);
//       }, 850);
//       socket.emit('send-changes', delta, fileId);
//     };
//     quill.on('text-change', quillHandler);
//     quill.on('selection-change', selectionChangeHandler(user.id));

//     return () => {
//       quill.off('text-change', quillHandler);
//       quill.off('selection-change', selectionChangeHandler);
//       if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
//     };
//   }, [quill, socket, fileId, user, details, folderId, workspaceId, dispatch]);

//   useEffect(() => {
//     if (quill === null || socket === null) return;
//     const socketHandler = (deltas: any, id: string) => {
//       if (id === fileId) {
//         quill.updateContents(deltas);
//       }
//     };
//     socket.on('receive-changes', socketHandler);
//     return () => {
//       socket.off('receive-changes', socketHandler);
//     };
//   }, [quill, socket, fileId]);

//   useEffect(() => {
//     if (!fileId || quill === null) return;
//     const room = supabase.channel(fileId);
//     const subscription = room
//       .on('presence', { event: 'sync' }, () => {
//         const newState = room.presenceState();
//         const newCollaborators = Object.values(newState).flat() as any;
//         setCollaborators(newCollaborators);
//         if (user) {
//           const allCursors: any = [];
//           newCollaborators.forEach(
//             (collaborator: { id: string; email: string; avatar: string }) => {
//               if (collaborator.id !== user.id) {
//                 const userCursor = quill.getModule('cursors');
//                 userCursor.createCursor(
//                   collaborator.id,
//                   collaborator.email.split('@')[0],
//                   `#${Math.random().toString(16).slice(2, 8)}`
//                 );
//                 allCursors.push(userCursor);
//               }
//             }
//           );
//           setLocalCursors(allCursors);
//         }
//       })
//       .subscribe(async (status) => {
//         if (status !== 'SUBSCRIBED' || !user) return;
//         const response = await findUser(user.id);
//         if (!response) return;

//         room.track({
//           id: user.id,
//           email: user.email?.split('@')[0],
//           avatarUrl: response.avatarUrl
//             ? supabase.storage.from('avatars').getPublicUrl(response.avatarUrl)
//                 .data.publicUrl
//             : '',
//         });
//       });
//     return () => {
//       supabase.removeChannel(room);
//     };
//   }, [fileId, quill, supabase, user]);

//   return (
//     <>
//       <div className="relative">
//         {details.inTrash && (
//           <article
//             className="py-2 
//           z-40 
//           bg-[#EB5757] 
//           flex  
//           md:flex-row 
//           flex-col 
//           justify-center 
//           items-center 
//           gap-4 
//           flex-wrap"
//           >
//             <div
//               className="flex 
//             flex-col 
//             md:flex-row 
//             gap-2 
//             justify-center 
//             items-center"
//             >
//               <span className="text-white">
//                 This {dirType} is in the trash.
//               </span>
//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="bg-transparent
//                 border-white
//                 text-white
//                 hover:bg-white
//                 hover:text-[#EB5757]
//                 "
//                 onClick={restoreFileHandler}
//               >
//                 Restore
//               </Button>

//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="bg-transparent
//                 border-white
//                 text-white
//                 hover:bg-white
//                 hover:text-[#EB5757]
//                 "
//                 onClick={deleteFileHandler}
//               >
//                 Delete
//               </Button>
//             </div>
//             <span className="text-sm text-white">{details.inTrash}</span>
//           </article>
//         )}
//         <div
//           className="flex 
//         flex-col-reverse 
//         sm:flex-row 
//         sm:justify-between 
//         justify-center 
//         sm:items-center 
//         sm:p-2 
//         p-8"
//         >
//           <div>{breadCrumbs}</div>
//           <div className="flex items-center gap-4">
//             <div className="flex items-center justify-center h-10">
//               {collaborators?.map((collaborator) => (
//                 <TooltipProvider key={collaborator.id}>
//                   <Tooltip>
//                     <TooltipTrigger asChild>
//                       <Avatar
//                         className="
//                     -ml-3 
//                     bg-background 
//                     border-2 
//                     flex 
//                     items-center 
//                     justify-center 
//                     border-white 
//                     h-8 
//                     w-8 
//                     rounded-full
//                     "
//                       >
//                         <AvatarImage
//                           src={
//                             collaborator.avatarUrl ? collaborator.avatarUrl : ''
//                           }
//                           className="rounded-full"
//                         />
//                         <AvatarFallback>
//                           {collaborator.email.substring(0, 2).toUpperCase()}
//                         </AvatarFallback>
//                       </Avatar>
//                     </TooltipTrigger>
//                     <TooltipContent>{collaborator.email}</TooltipContent>
//                   </Tooltip>
//                 </TooltipProvider>
//               ))}
//             </div>
//             {saving ? (
//               <Badge
//                 variant="secondary"
//                 className="bg-orange-600 top-4
//                 text-white
//                 right-4
//                 z-50
//                 "
//               >
//                 Saving...
//               </Badge>
//             ) : (
//               <Badge
//                 variant="secondary"
//                 className="bg-emerald-600 
//                 top-4
//               text-white
//               right-4
//               z-50
//               "
//               >
//                 Saved
//               </Badge>
//             )}
//           </div>
//         </div>
//       </div>
//       {details.bannerUrl && (
//         <div className="relative w-full h-[200px]">
//           <Image
//             src={
//               supabase.storage
//                 .from('file-banners')
//                 .getPublicUrl(details.bannerUrl).data.publicUrl
//             }
//             fill
//             className="w-full md:h-48
//             h-20
//             object-cover"
//             alt="Banner Image"
//           />
//         </div>
//       )}
//       <div
//         className="flex 
//         justify-center
//         items-center
//         flex-col
//         mt-2
//         relative
//       "
//       >
//         <div
//           className="w-full 
//         self-center 
//         max-w-[800px] 
//         flex 
//         flex-col
//          px-7 
//          lg:my-8"
//         >
//           <div className="text-[80px]">
//             <EmojiPicker getValue={iconOnChange}>
//               <div
//                 className="w-[100px]
//                 cursor-pointer
//                 transition-colors
//                 h-[100px]
//                 flex
//                 items-center
//                 justify-center
//                 hover:bg-muted
//                 rounded-xl"
//               >
//                 {details.iconId}
//               </div>
//             </EmojiPicker>
//           </div>
//           <div className="flex ">
//             <BannerUpload
//               id={fileId}
//               dirType={dirType}
//               className="mt-2
//               text-sm
//               text-muted-foreground
//               p-2
//               hover:text-card-foreground
//               transition-all
//               rounded-md"
//             >
//               {details.bannerUrl ? 'Update Banner' : 'Add Banner'}
//             </BannerUpload>
//             {details.bannerUrl && (
//               <Button
//                 disabled={deletingBanner}
//                 onClick={deleteBanner}
//                 variant="ghost"
//                 className="gap-2 hover:bg-background
//                 flex
//                 item-center
//                 justify-center
//                 mt-2
//                 text-sm
//                 text-muted-foreground
//                 w-36
//                 p-2
//                 rounded-md"
//               >
//                 <XCircleIcon size={16} />
//                 <span className="whitespace-nowrap font-normal">
//                   Remove Banner
//                 </span>
//               </Button>
//             )}
//           </div>
//           <span
//             className="
//             text-muted-foreground
//             text-3xl
//             font-bold
//             h-9
//           "
//           >
//             {details.title}
//           </span>
//           <span className="text-muted-foreground text-sm">
//             {dirType.toUpperCase()}
//           </span>
//         </div>
//         <div
//           id="container"
//           className="max-w-[800px]"
//           ref={wrapperRef}
//         ></div>
//       </div>
//     </>
//   );
// };

// export default QuillEditor;