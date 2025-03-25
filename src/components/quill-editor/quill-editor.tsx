'use client';
import React, { useRef, useState } from 'react';
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

// Components
import TrashBanner from './components/TrashBanner';
import EditorHeader from './components/EditorHeader';
import DocumentBanner from './components/DocumentBanner';
import DocumentTitle from './components/DocumentTitle';

const QuillEditor: React.FC<QuillEditorProps> = ({
  dirDetails,
  dirType,
  fileId,
}) => {
  // Setup refs and basic state
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [localCursors, setLocalCursors] = useState<any>([]);
  
  // Basic services
  const supabase = createBClient();
  const { user } = useSupabaseUser();
  const { socket } = useSocket();
  
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
    deleteBanner
  } = useDocumentOperations(quill, fileId, dirType);
  const { collaborators, setupSelectionHandler } = useCollaboration(quill, fileId);
  
  // Load content
  useContentLoader(quill, fileId, dirType);
  
  // Setup event handlers
  React.useEffect(() => {
    console.log('QuillEditor: Setting up event handlers', { quillInitialized: !!quill });
    if (!quill) return;
    
    // Attach text change handler
    quill.on('text-change', quillHandler);
    console.log('QuillEditor: Text change handler attached');
    
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
    
    // Cleanup
    return () => {
      console.log('QuillEditor: Cleaning up event handlers');
      quill.off('text-change', quillHandler);
      cleanupSelectionHandler();
      document.removeEventListener('keydown', globalSlashHandler);
    };
  }, [quill, quillHandler, setupSelectionHandler]);

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
        />
      </div>
      
      {/* Document banner image */}
      <DocumentBanner
        bannerUrl={details.bannerUrl}
        onDeleteBanner={deleteBanner}
        deletingBanner={deletingBanner}
      />
      
      {/* Document content area */}
      <div className="flex justify-center items-center flex-col mt-2 relative">
        {/* Document title and icon */}
        <DocumentTitle
          title={details.title}
          iconId={details.iconId}
          onIconChange={iconOnChange}
        />
        
        {/* Instructions for slash command */}
        <div className="text-sm text-gray-500 max-w-[800px] w-full mb-2 text-left">
          Type <kbd className="px-2 py-1 bg-gray-100 rounded">/</kbd> for commands
          
          {/* Debug button for slash commands */}
          {/* <button 
            className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={(e) => {
              // Prevent event propagation
              e.preventDefault();
              e.stopPropagation();
              
              if (!quill) return;
              console.log('Debug button clicked, manually triggering slash commands');
              
              try {
                // Focus editor
                quill.focus();
                
                // Get current selection or set it to the end
                const selection = quill.getSelection() || { index: quill.getLength() - 1, length: 0 };
                
                // Try to directly open the menu using the module
                const slashModule = quill.getModule('slashCommands');
                if (slashModule) {
                  console.log('Manually opening slash commands menu via module');
                  
                  // Set timeout to ensure click propagation finishes first
                  setTimeout(() => {
                    slashModule.openMenu(selection);
                  }, 10);
                } else {
                  console.error('Slash commands module not found');
                }
              } catch (err) {
                console.error('Error manually triggering slash commands:', err);
              }
            }}
          >
            Debug: Show Menu
          </button>
          
          <span className="ml-4 text-yellow-600">
            (Menu may appear briefly and disappear due to click events)
          </span> */}
        </div>
        
        {/* Quill editor container */}
        <div
          id="container"
          className="max-w-[800px] w-full"
          ref={wrapperRef}
        ></div>
      </div>
    </>
  );
};

export default QuillEditor;