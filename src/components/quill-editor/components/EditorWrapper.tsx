'use client';
import React, { useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/lib/providers/socket-provider';

// Components
import TrashBanner from './TrashBanner';
import EditorHeader from './EditorHeader';
import DocumentBanner from './DocumentBanner';
import DocumentTitle from './DocumentTitle';

// Hooks and providers
import { useEditorSetup } from '../hooks/use-editor-setup';
import { useDocumentOperations } from '../hooks/use-document-operations';
import { useCollaboration } from '../hooks/use-collaboration';
import { useContentLoader } from '../hooks/use-content-loader';
import { useDocumentDetails } from '../hooks/use-document-details';
import { useAIGenerator } from '../hooks/use-ai-generator';
import { useKeyboardHandlers } from '../hooks/use-keyboard-handlers';
import { useEventHandlers } from '../hooks/use-event-handlers';
import { AIGenerationProvider, useAIGenerationControl } from './AIGenerationProvider';

// Types
import { QuillEditorProps } from '../types';

const EditorWrapper: React.FC<QuillEditorProps> = ({
  dirDetails,
  dirType,
  fileId,
}) => {
  // Create refs
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Basic services
  const { toast } = useToast();
  const { socket } = useSocket();
  
  // Initialize hooks and state
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
  
  // Set up the AI generation control
  const { 
    showAIPrompt,
    setShowAIPrompt,
    showAPIKeyDialog, 
    setShowAPIKeyDialog,
    currentRange,
    setCurrentRange,
  } = useAIGenerationControl();
  
  // Set up event handlers
  const { handleAIGenerate } = useEventHandlers(
    quill,
    fileId,
    generateText,
    apiKeyExists,
    setCurrentRange,
    setShowAPIKeyDialog,
    setShowAIPrompt,
    quillHandler
  );
  
  // Set up keyboard handlers
  useKeyboardHandlers(quill);
  
  // Load content
  useContentLoader(quill, fileId, dirType);
  
  // Set up automatic saving with text-change handler
  useEffect(() => {
    if (!quill) return;
    
    console.log('Setting up text-change handler for automatic saving');
    
    // Attach text change handler for automatic saving
    quill.on('text-change', quillHandler);
    
    // Cleanup when unmounting
    return () => {
      quill.off('text-change', quillHandler);
    };
  }, [quill, quillHandler]);
  
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
  
  // Ensure socket room is created when component mounts
  useEffect(() => {
    if (socket && fileId) {
      console.log(`EditorWrapper: Creating room for file ${fileId}`);
      socket.emit('create-room', fileId);
    }
  }, [socket, fileId]);
  
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
    
    // Process once at load time
    debouncedProcessMarkdown();
    
    // Add a MutationObserver to fix excessive markdown processing
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
      
      {/* AI Generation Provider */}
      <AIGenerationProvider
        onGenerate={handleAIGenerate}
        onSetApiKey={setApiKey}
        apiKeyExists={apiKeyExists}
        showAIPrompt={showAIPrompt}
        showAPIKeyDialog={showAPIKeyDialog}
        setShowAIPrompt={setShowAIPrompt}
        setShowAPIKeyDialog={setShowAPIKeyDialog}
      />
    </>
  );
};

export default EditorWrapper; 