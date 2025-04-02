'use client';
import { useAppState } from '@/lib/providers/state-provider';
import { createBClient } from '@/lib/server-actions/createClient';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import clsx from 'clsx';
import EmojiPicker from '../global/emoji-picker';
import { createFile, updateFile, updateFolder, getFiles } from '@/supabase/queries';

import { useToast } from "@/hooks/use-toast"
import TooltipWrapper from '../global/tooltip-wrapper';
import { PlusIcon, Trash } from 'lucide-react';
import { File } from '@/supabase/supabase';
import { v4 } from 'uuid';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';

interface DropdownProps {
  title: string;
  id: string;
  listType: 'folder' | 'file';
  iconId: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  title,
  id,
  listType,
  iconId,
  children,
  disabled,
  ...props
}) => {
  // Add debugging log to check listType when component renders
  console.log(`Dropdown rendering: ${id} with listType=${listType}`);
  
  const supabase = createBClient();
  const { toast } = useToast();
  const { user } = useSupabaseUser();
  const { state, dispatch, workspaceId, folderId } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // Add detailed debugging for context values
  useEffect(() => {
    console.log("Dropdown context values:", { 
      componentId: id,
      listType,
      contextWorkspaceId: workspaceId, 
      contextFolderId: folderId,
      pathname: window.location.pathname
    });
  }, [id, listType, workspaceId, folderId]);
  
  //folder Title synced with server data and local
  const folderTitle: string | undefined = useMemo(() => {
    if (listType === 'folder') {
      const stateTitle = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === id)?.title;
      if (title === stateTitle || !stateTitle) return title;
      return stateTitle;
    }
  }, [state, listType, workspaceId, id, title]);

  //fileItitle

  const fileTitle: string | undefined = useMemo(() => {
    if (listType === 'file') {
      const fileAndFolderId = id.split('folder');
      const stateTitle = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === fileAndFolderId[0])
        ?.files.find((file) => file.id === fileAndFolderId[1])?.title;
      if (title === stateTitle || !stateTitle) return title;
      return stateTitle;
    }
  }, [state, listType, workspaceId, id, title]);

  //Navigate the user to a different page
  const navigatePage = async (accordionId: string, type: string) => {
    if (!workspaceId) {
      console.error("Cannot navigate: workspaceId is undefined");
      toast({
        title: 'Navigation Error',
        description: 'Workspace not found.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      if (type === 'folder') {
        console.log(`Navigating to folder: /dashboard/${workspaceId}/${accordionId}`);
        await router.push(`/dashboard/${workspaceId}/${accordionId}`);
        return;
      }
      
      if (type === 'file') {
        // For files, the ID is "{folderId}folder{fileId}" - extract both parts
        const pathParts = accordionId.split('folder');
        
        if (pathParts.length !== 2 || !pathParts[0] || !pathParts[1]) {
          console.error("Invalid file ID format", accordionId);
          toast({
            title: 'Navigation Error',
            description: 'Invalid file format.',
            variant: 'destructive',
          });
          return;
        }
        
        // Use the folderId embedded in the file ID instead of context folderId
        const fileFolderId = pathParts[0];
        const actualFileId = pathParts[1];
        
        const url = `/dashboard/${workspaceId}/${fileFolderId}/${actualFileId}`;
        console.log(`Navigating to file: ${url}`);
        await router.push(url);
      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast({
        title: 'Navigation Failed',
        description: 'Could not navigate to the requested page.',
        variant: 'destructive',
      });
    }
  };

  // Modify the handleDoubleClick function to add debugging
  const handleDoubleClick = (e: React.MouseEvent) => {
    console.log(`Double click detected on ${listType}`, { id, listType });
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };
  //blur

  const handleBlur = async () => {
    if (!isEditing) return;
    setIsEditing(false);
    const fId = id.split('folder');
    
    // Handle folder title update
    if (fId?.length === 1) {
      if (!folderTitle) return;
      console.log("Updating folder title in database:", { folderId: fId[0], title: folderTitle });
      
      toast({
        title: 'Success',
        description: 'Folder title changed.',
      });
      await updateFolder({ title: folderTitle }, fId[0]);
    }

    // Handle file title update
    if (fId.length === 2 && fId[1]) {
      if (!fileTitle) return;
      
      const extractedFolderId = fId[0];
      const extractedFileId = fId[1];
      
      console.log("Updating file title in database:", { 
        fileId: extractedFileId, 
        folderId: extractedFolderId,
        title: fileTitle 
      });
      
      const { data, error } = await updateFile({ title: fileTitle }, extractedFileId);
      if (error) {
        console.error("Error updating file title:", error);
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not update the title for this file',
        });
      } else {
        console.log("File title updated successfully:", data);
        toast({
          title: 'Success',
          description: 'File title changed.',
        });
      }
    }
  };

  //onchanges
  const onChangeEmoji = async (selectedEmoji: string) => {
    if (!workspaceId || !selectedEmoji) return;
    
    // Only update if it's a folder
    if (listType === 'folder') {
      // Update UI first
      try {
        dispatch({
          type: 'UPDATE_FOLDER',
          payload: {
            workspaceId,
            folderId: id,
            folder: { iconId: selectedEmoji },
          },
        });
      } catch (e) {
        console.log('Error updating UI state:', e);
      }
      
      // Then update database in the background
      try {
        await updateFolder({ iconId: selectedEmoji }, id);
        
        // Only show success toast if needed
        // toast({
        //   title: 'Success',
        //   description: 'Updated emoji for the folder',
        // });
      } catch (error) {
        console.log('Error updating folder emoji:', error);
        toast({
          title: 'Error',
          description: 'Could not update the emoji',
          variant: 'destructive',
        });
      }
    }
  };
  const folderTitleChange = (e: any) => {
    if (!workspaceId) return;
    const fid = id.split('folder');
    if (fid.length === 1) {
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          folder: { title: e.target.value },
          folderId: fid[0],
          workspaceId,
        },
      });
    }
  };
  const fileTitleChange = (e: any) => {
    if (!workspaceId) {
      console.log("Cannot update file title: workspaceId is undefined");
      return;
    }
    
    const fid = id.split('folder');
    // For files, the ID format is "{folderId}folder{fileId}"
    if (fid.length === 2 && fid[1]) {
      const extractedFolderId = fid[0]; // Extract the folder ID from the file ID
      const extractedFileId = fid[1];   // Extract the file ID
      
      console.log("Updating file title", { 
        fileId: extractedFileId, 
        folderId: extractedFolderId,
        workspaceId,
        newTitle: e.target.value 
      });
      
      dispatch({
        type: 'UPDATE_FILE',
        payload: {
          file: { title: e.target.value },
          folderId: extractedFolderId, // Use the extracted folder ID, not the context folderId
          workspaceId,
          fileId: extractedFileId,
        },
      });
    } else {
      console.error("Invalid file ID format for title change:", id);
    }
  };

  //move to trash
  const moveToTrash = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser behavior
    e.stopPropagation(); // Prevent event propagation
    
    console.log('moveToTrash function called', { id, listType });
    
    // Debug user context
    console.log('User context:', { 
      userExists: !!user, 
      userEmail: user?.email,
      userID: user?.id,
      workspaceId 
    });
    
    // Check if user is authenticated
    if (!user?.email || !workspaceId) {
      console.log('Authentication error', { user, workspaceId });
      
      // Try to get the current session directly
      try {
        const supabase = createBClient();
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Current session check:', sessionData);
        
        if (!sessionData.session) {
          console.log('No active session found in moveToTrash');
          toast({
            title: 'Authentication Required',
            description: 'Please log in to move items to trash.',
            variant: 'destructive',
          });
          return;
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
      
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Authentication error. Please try again.',
      });
      return;
    }
    
    const pathId = id.split('folder');
    console.log('Path ID after splitting', { pathId, originalId: id });
    
    if (listType === 'folder') {
      console.log('Processing folder trash', { folderId: pathId[0] });
      
      try {
        const deletedByMessage = user?.email ? `Deleted by ${user.email}` : 'Deleted';
        
        // Get files in this folder first
        const folderFiles = state.workspaces
          .find((workspace) => workspace.id === workspaceId)
          ?.folders.find((folder) => folder.id === pathId[0])
          ?.files.filter((file) => !file.inTrash) || [];
          
        console.log(`Found ${folderFiles.length} files in folder to trash`, folderFiles);
        
        // 1. Update local state for the folder
        dispatch({
          type: 'UPDATE_FOLDER',
          payload: {
            folder: { inTrash: deletedByMessage },
            folderId: pathId[0],
            workspaceId,
          },
        });
        console.log('Dispatch for folder completed');
        
        // 2. Update local state for all files in the folder
        for (const file of folderFiles) {
          dispatch({
            type: 'UPDATE_FILE',
            payload: {
              file: { inTrash: deletedByMessage },
              folderId: pathId[0],
              workspaceId,
              fileId: file.id,
            },
          });
          console.log(`Marked file ${file.id} as trashed in UI`);
        }
        
        // 3. Update folder in database
        console.log('Calling updateFolder with', { 
          inTrash: deletedByMessage, 
          folderId: pathId[0] 
        });
        
        const { data, error } = await updateFolder(
          { inTrash: deletedByMessage },
          pathId[0]
        );
        
        if (error) {
          console.error('Error moving folder to trash', error);
          toast({
            title: 'Error',
            variant: 'destructive',
            description: 'Could not move the folder to trash',
          });
          return;
        }
        
        // 4. Update all files in database
        const fileUpdatePromises = folderFiles.map(file => 
          updateFile({ inTrash: deletedByMessage }, file.id)
        );
        
        const fileResults = await Promise.allSettled(fileUpdatePromises);
        const failedUpdates = fileResults.filter(result => result.status === 'rejected');
        
        if (failedUpdates.length > 0) {
          console.warn(`${failedUpdates.length} file updates failed`, failedUpdates);
          toast({
            title: 'Partial Success',
            description: `Folder moved to trash but some files may not have been trashed.`,
            variant: 'default',
          });
        } else {
          console.log('Folder and all files successfully moved to trash', data);
          toast({
            title: 'Success',
            description: `Moved folder and ${folderFiles.length} files to trash`,
          });
        }
      } catch (err) {
        console.error('Exception in folder trash operation', err);
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'An unexpected error occurred',
        });
      }
    }

    if (listType === 'file') {
      console.log('Processing file trash', { filePathId: pathId });
      
      if (pathId.length !== 2 || !pathId[1]) {
        console.error('Invalid file ID format', { pathId });
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Invalid file ID format',
        });
        return;
      }
      
      try {
        // Update local state
        console.log('Dispatching file update', { 
          folderId: pathId[0],
          fileId: pathId[1],
          workspaceId
        });
        
        dispatch({
          type: 'UPDATE_FILE',
          payload: {
            file: { inTrash: `Deleted by ${user?.email}` },
            folderId: pathId[0],
            workspaceId,
            fileId: pathId[1],
          },
        });
        console.log('Dispatch for file completed');
        
        // Update database
        console.log('Calling updateFile with', { 
          inTrash: `Deleted by ${user?.email}`, 
          fileId: pathId[1] 
        });
        
        const { data, error } = await updateFile(
          { inTrash: `Deleted by ${user?.email}` },
          pathId[1]
        );
        
        if (error) {
          console.error('Error moving file to trash', error);
          toast({
            title: 'Error',
            variant: 'destructive',
            description: 'Could not move the file to trash',
          });
        } else {
          console.log('File successfully moved to trash', data);
          toast({
            title: 'Success',
            description: 'Moved file to trash',
          });
        }
      } catch (err) {
        console.error('Exception in file trash operation', err);
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'An unexpected error occurred',
        });
      }
    }
  };

  const isFolder = listType === 'folder';
  const groupIdentifies = clsx(
    'dark:text-white whitespace-nowrap flex justify-between items-center w-full relative',
    {
      'group/folder': isFolder,
      'group/file': !isFolder,
    }
  );

  const listStyles = useMemo(
    () =>
      clsx('relative', {
        'border-none text-md': isFolder,
        'border-none ml-6 text-[16px] py-1': !isFolder,
      }),
    [isFolder]
  );

  const hoverStyles = useMemo(
    () =>
      clsx(
        'h-full flex rounded-sm absolute right-0 items-center justify-center',
        {
          'opacity-0 group-hover/file:opacity-100': listType === 'file',
          'hidden group-hover/folder:flex': listType === 'folder',
        }
      ),
    [isFolder]
  );

  const addNewFile = async () => {
    if (!workspaceId) return;
    
    // Ensure accordion is expanded to see the new file
    setIsAccordionOpen(true);
    
    // Generate a unique ID for the new file
    const fileId = v4();
    
    const newFile: File = {
      folderId: id,
      data: null,
      createdAt: new Date().toISOString(),
      inTrash: null,
      title: 'Untitled',
      iconId: '📄',
      id: fileId,
      workspaceId,
      bannerUrl: '',
    };
    
    // Update local state first for immediate UI feedback
    dispatch({
      type: 'ADD_FILE',
      payload: { file: newFile, folderId: id, workspaceId },
    });
    
    console.log("Created new file locally:", { fileId, folderId: id });

    // Then create in database
    try {
      const { data, error } = await createFile(newFile);
      
      if (error) {
        console.error("Error creating file:", error);
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not create a file',
        });
        
        // Rollback UI change if server update failed
        dispatch({
          type: 'DELETE_FILE',
          payload: { 
            fileId: newFile.id,
            folderId: id,
            workspaceId
          }
        });
      } else {
        console.log("File created successfully:", data);
        toast({
          title: 'Success',
          description: 'File created.',
        });
        
        // Force accordion to remain open after file creation
        setTimeout(() => {
          setIsAccordionOpen(true);
        }, 100);
      }
    } catch (err) {
      console.error("Exception creating file:", err);
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Could not create the file',
      });
    }
  };

  // Track when a new file is added to prevent immediate refresh
  const [recentlyAddedFile, setRecentlyAddedFile] = useState(false);
  
  useEffect(() => {
    // Track when a file is added
    const currentFolder = state.workspaces
      .find((workspace) => workspace.id === workspaceId)
      ?.folders.find((folder) => folder.id === id);
      
    // Safely check if files array exists and has items
    const hasFiles = currentFolder?.files && Array.isArray(currentFolder.files) && currentFolder.files.length > 0;
    
    if (hasFiles) {
      setRecentlyAddedFile(true);
      
      // Reset the flag after a delay
      const timer = setTimeout(() => {
        setRecentlyAddedFile(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [state.workspaces, workspaceId, id]);

  // Fetch files when folder is expanded, but don't override recently added files
  useEffect(() => {
    if (isAccordionOpen && listType === 'folder' && id && workspaceId && !recentlyAddedFile) {
      const fetchFolderFiles = async () => {
        console.log('Fetching files for folder:', id);
        try {
          const { data, error } = await getFiles(id);
          if (error) {
            console.error('Error fetching files:', error);
            return;
          }
          
          if (data && data.length > 0) {
            console.log('Files found:', data.length);
            
            // Check if we already have files in local state
            const existingFiles = state.workspaces
              .find((workspace) => workspace.id === workspaceId)
              ?.folders.find((folder) => folder.id === id)
              ?.files.filter(file => !file.inTrash) || [];
              
            // Only update if we have different files (to prevent UI flicker)
            if (JSON.stringify(data.map(f => f.id).sort()) !== 
                JSON.stringify(existingFiles.map(f => f.id).sort())) {
              dispatch({
                type: 'SET_FILES',
                payload: { workspaceId, files: data, folderId: id },
              });
            }
          } else {
            console.log('No files found for folder');
          }
        } catch (err) {
          console.error('Exception fetching files:', err);
        }
      };
      
      fetchFolderFiles();
    }
  }, [isAccordionOpen, listType, id, workspaceId, dispatch, recentlyAddedFile, state.workspaces]);

  return (
    <AccordionItem
      value={id}
      className={listStyles}
      onClick={async (e) => {
        // Log what element was actually clicked with proper type casting
        console.log(`AccordionItem clicked: target=${(e.target as Element).tagName || 'unknown'}, currentTarget=${(e.currentTarget as Element).tagName || 'unknown'}`);
        
        // Only navigate if it's a direct click on the item, not on a child element
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          console.log(`Direct click on AccordionItem: navigating ${listType} with id=${id}`);
          
          // For folder items, only navigate when clicking on the item itself
          if (listType === 'folder') {
            await navigatePage(id, listType);
          }
        }
      }}
    >
      <AccordionTrigger
        id={listType}
        className="hover:no-underline 
        p-2 
        dark:text-muted-foreground 
        text-sm"
        disabled={false}
        onFocus={() => listType === 'folder' && setIsAccordionOpen(true)}
        onClick={async (e) => {
          console.log(`AccordionTrigger clicked for ${listType}`, { id });
          
          // Stop propagation for both folder and file clicks
          e.stopPropagation();
          
          // For folders, only toggle the accordion, don't navigate yet
          if (listType === 'folder') {
            setIsAccordionOpen(prev => !prev);
          } 
          // For files, navigate to the file
          else if (listType === 'file') {
            await navigatePage(id, listType);
          }
        }}
        showArrow={listType === 'folder'}
      >
        <div className={groupIdentifies}>
          <div className="flex gap-2 items-center">
            {!isEditing ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <EmojiPicker getValue={onChangeEmoji}>
                    <span className="w-[24px] h-[24px] flex items-center justify-center">
                      {iconId}
                    </span>
                  </EmojiPicker>
                  <span 
                    className="text-sm cursor-pointer"
                    onDoubleClick={handleDoubleClick}
                  >
                    {folderTitle || fileTitle}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <EmojiPicker getValue={onChangeEmoji}>
                  <span className="w-[24px] h-[24px] flex items-center justify-center">
                    {iconId}
                  </span>
                </EmojiPicker>
                <input
                  type="text"
                  value={folderTitle || fileTitle}
                  onChange={(e) => {
                    if (listType === 'folder') {
                      folderTitleChange(e);
                    } else {
                      fileTitleChange(e);
                    }
                  }}
                  onBlur={handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBlur();
                    }
                  }}
                  autoFocus
                  className="bg-transparent text-sm border-none focus:outline-none"
                  aria-label={`Edit ${listType} title`}
                />
              </div>
            )}
          </div>
          <div className={hoverStyles}>
            <TooltipWrapper tooltip="Delete">
              <span
                className="p-1 hover:bg-slate-600 rounded-full transition-colors inline-flex"
                onClick={(e) => {
                  e.stopPropagation();
                  if (listType === 'file') {
                    const pathId = id.split('folder')[1];
                    if (pathId) {
                      try {
                        console.log('🔍 Moving file to trash:', { pathId });
                        moveToTrash(e);
                      } catch (err) {
                        console.error('🔍 Exception in file trash operation:', err);
                        toast({
                          title: 'Error',
                          variant: 'destructive',
                          description: 'An unexpected error occurred',
                        });
                      }
                    } else {
                      console.error('🔍 Invalid file ID format:', { pathId, id });
                      toast({
                        title: 'Error',
                        variant: 'destructive',
                        description: 'Could not identify file to delete',
                      });
                    }
                  } else {
                    // Folder deletion logic - use existing moveToTrash function
                    console.log('🔍 Deleting folder:', { id });
                    moveToTrash(e);
                  }
                }}
              >
                <Trash
                  size={15}
                  className="hover:dark:text-white dark:text-Neutrals/neutrals-7 transition-colors"
                />
              </span>
            </TooltipWrapper>
            {listType === 'folder' && !isEditing && (
              <TooltipWrapper tooltip="Add File">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    addNewFile();
                  }}
                  role="button"
                  tabIndex={0}
                  className="inline-flex"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      addNewFile();
                    }
                  }}
                >
                  <PlusIcon
                    size={15}
                    className="hover:dark:text-white dark:text-Neutrals/neutrals-7 transition-colors"
                  />
                </span>
              </TooltipWrapper>
            )}
          </div>
        </div>
      </AccordionTrigger>
      {listType === 'folder' ? (
        <AccordionContent>
          {state.workspaces
            .find((workspace) => workspace.id === workspaceId)
            ?.folders.find((folder) => folder.id === id)
            ?.files.filter((file) => !file.inTrash)
            .map((file) => {
              // Create the composite ID properly to include the parent folder ID
              const customFileId = `${id}folder${file.id}`;
              console.log(`Rendering file ${file.id} with customFileId=${customFileId}`);
              return (
                <Dropdown
                  key={file.id}
                  title={file.title}
                  listType="file"
                  id={customFileId}
                  iconId={file.iconId}
                />
              );
            })}
        </AccordionContent>
      ) : null}
    </AccordionItem>
  );
};

export default Dropdown;