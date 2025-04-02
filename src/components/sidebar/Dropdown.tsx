'use client';
import { useAppState } from '@/lib/providers/state-provider';
import { createBClient } from '@/lib/server-actions/createClient';
import { useRouter } from 'next/navigation';
<<<<<<< Updated upstream
import React, { useMemo, useState } from 'react';
=======
import React, { useMemo, useState, useEffect, useRef } from 'react';
>>>>>>> Stashed changes
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import clsx from 'clsx';
import EmojiPicker from '../global/emoji-picker';
import { createFile, updateFile, updateFolder } from '@/supabase/queries';

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
  const supabase = createBClient();
  const { toast } = useToast();
  const { user } = useSupabaseUser();
  const { state, dispatch, workspaceId, folderId } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
<<<<<<< Updated upstream

=======
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  // Add ref for hover debugging
  const itemRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Log when hover state changes
  useEffect(() => {
    console.log(`Hover state for ${listType} ${id}: ${isHovering}`);
  }, [isHovering, id, listType]);

  // Log when accordion state changes
  useEffect(() => {
    console.log(`Accordion state for ${id}: ${isAccordionOpen ? 'open' : 'closed'}`);
  }, [isAccordionOpen, id]);
  
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
  
>>>>>>> Stashed changes
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
  const navigatatePage = (accordionId: string, type: string) => {
    if (type === 'folder') {
    //   router.push(`/dashboard/${workspaceId}/${accordionId}`);
    return
    }
    if (type === 'file') {
      router.push(
        `/dashboard/${workspaceId}/${folderId}/${
          accordionId.split('folder')[1]
        }`
      );
    }
  };

  //double click handler
  const handleDoubleClick = () => {
    setIsEditing(true);
  };
  //blur

  const handleBlur = async () => {
    if (!isEditing) return;
    setIsEditing(false);
    const fId = id.split('folder');
    if (fId?.length === 1) {
      if (!folderTitle) return;
      toast({
        title: 'Success',
        description: 'Folder title changed.',
      });
      await updateFolder({ title }, fId[0]);
    }

    if (fId.length === 2 && fId[1]) {
      if (!fileTitle) return;
      const { data, error } = await updateFile({ title: fileTitle }, fId[1]);
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not update the title for this file',
        });
      } else
        toast({
          title: 'Success',
          description: 'File title changed.',
        });
    }
  };

  //onchanges
  const onChangeEmoji = async (selectedEmoji: string) => {
    if (!workspaceId) return;
    if (listType === 'folder') {
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          workspaceId,
          folderId: id,
          folder: { iconId: selectedEmoji },
        },
      });
      const { data, error } = await updateFolder({ iconId: selectedEmoji }, id);
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not update the emoji for this folder',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Update emoji for the folder',
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
    if (!workspaceId || !folderId) return;
    const fid = id.split('folder');
    if (fid.length === 2 && fid[1]) {
      dispatch({
        type: 'UPDATE_FILE',
        payload: {
          file: { title: e.target.value },
          folderId,
          workspaceId,
          fileId: fid[1],
        },
      });
    }
  };

  //move to trash
  const moveToTrash = async () => {
    if (!user?.email || !workspaceId) return;
    const pathId = id.split('folder');
    if (listType === 'folder') {
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          folder: { inTrash: `Deleted by ${user?.email}` },
          folderId: pathId[0],
          workspaceId,
        },
      });
      const { data, error } = await updateFolder(
        { inTrash: `Deleted by ${user?.email}` },
        pathId[0]
      );
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not move the folder to trash',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Moved folder to trash',
        });
      }
    }

    if (listType === 'file') {
      dispatch({
        type: 'UPDATE_FILE',
        payload: {
          file: { inTrash: `Deleted by ${user?.email}` },
          folderId: pathId[0],
          workspaceId,
          fileId: pathId[1],
        },
      });
      const { data, error } = await updateFile(
        { inTrash: `Deleted by ${user?.email}` },
        pathId[1]
      );
      if (error) {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not move the folder to trash',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Moved folder to trash',
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

  // Log the applied group class
  useEffect(() => {
    console.log(`Group class for ${id}: ${isFolder ? 'group/folder' : 'group/file'}`);
  }, [isFolder, id]);

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
<<<<<<< Updated upstream
        'h-full hidden rounded-sm absolute right-0 items-center justify-center',
        {
          'group-hover/file:block': listType === 'file',
          'group-hover/folder:block': listType === 'folder',
=======
        'h-full flex rounded-sm absolute right-0 items-center justify-center z-50',
        {
          'opacity-0 group-hover/file:opacity-100': listType === 'file' && !isAccordionOpen,
          'hidden group-hover/folder:flex': listType === 'folder' && !isAccordionOpen,
>>>>>>> Stashed changes
        }
      ),
    [isFolder, listType, isAccordionOpen]
  );

  // Log the computed hover styles
  useEffect(() => {
    console.log(`Hover styles for ${id}: ${hoverStyles}`);
  }, [hoverStyles, id]);

  // Add debugging for event bubbling when accordion is expanded
  useEffect(() => {
    if (isAccordionOpen && listType === 'folder') {
      console.log(`Folder ${id} is expanded - checking hover functionality`);
      
      // Check if any parent elements might be blocking hover events
      const checkParentElements = () => {
        if (!itemRef.current) return;
        
        let currentEl: HTMLElement | null = itemRef.current;
        let depth = 0;
        const parentInfo = [];
        
        while (currentEl && depth < 5) {
          const styles = window.getComputedStyle(currentEl);
          parentInfo.push({
            tag: currentEl.tagName,
            classes: currentEl.className,
            position: styles.position,
            zIndex: styles.zIndex,
            overflow: styles.overflow,
            pointerEvents: styles.pointerEvents
          });
          currentEl = currentEl.parentElement;
          depth++;
        }
        
        console.log(`Element hierarchy for ${id}:`, parentInfo);
      };
      
      checkParentElements();
    }
  }, [isAccordionOpen, id, listType]);
  
  // Debug hover detection issues
  const [hoverDetectionIssue, setHoverDetectionIssue] = useState(false);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isHovering) {
      // Check if hover styles are actually applied
      const checkHoverStylesApplied = () => {
        if (!itemRef.current) return;
        
        // Get the icons container - should be the last child of the itemRef element
        const iconsContainer = Array.from(itemRef.current.children).pop() as HTMLElement;
        
        if (iconsContainer) {
          const styles = window.getComputedStyle(iconsContainer);
          const isVisible = styles.display !== 'none' && styles.opacity !== '0';
          
          console.log(`Icons container for ${id} visible:`, isVisible, {
            display: styles.display,
            opacity: styles.opacity,
            visibility: styles.visibility
          });
          
          if (!isVisible && isHovering) {
            setHoverDetectionIssue(true);
            console.warn(`Hover detection issue for ${id}: element is being hovered but styles aren't applied`);
          } else {
            setHoverDetectionIssue(false);
          }
        }
      };
      
      // Wait a short time to check if hover styles were applied
      timeout = setTimeout(checkHoverStylesApplied, 100);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isHovering, id]);
  
  // Log when hover detection issues occur
  useEffect(() => {
    if (hoverDetectionIssue) {
      console.warn(`[${id}] Hover detection issue: hover state is true but hover styles aren't visible`);
    }
  }, [hoverDetectionIssue, id]);
  
  const addNewFile = async () => {
    if (!workspaceId) return;
    const newFile: File = {
      folderId: id,
      data: null,
      createdAt: new Date().toISOString(),
      inTrash: null,
      title: 'Untitled',
      iconId: '📄',
      id: v4(),
      workspaceId,
      bannerUrl: '',
    };
    dispatch({
      type: 'ADD_FILE',
      payload: { file: newFile, folderId: id, workspaceId },
    });
    const { data, error } = await createFile(newFile);
    if (error) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Could not create a file',
      });
    } else {
      toast({
        title: 'Success',
        description: 'File created.',
      });
    }
  };

<<<<<<< Updated upstream
=======
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

  // Track accordion expansion effect on hover classes
  useEffect(() => {
    if (itemRef.current && isAccordionOpen && listType === 'folder') {
      // Find all child file items after expansion
      setTimeout(() => {
        console.log(`Checking child elements after accordion expansion for ${id}`);
        
        // Check the AccordionContent structure
        const accordionContentEl = itemRef.current?.closest('.accordion-item')?.querySelector('[data-state="open"]');
        
        if (accordionContentEl) {
          console.log('Accordion content element found:', {
            tag: accordionContentEl.tagName,
            classes: accordionContentEl.className,
            dataState: accordionContentEl.getAttribute('data-state'),
            childrenCount: accordionContentEl.childNodes.length
          });
          
          // Try to find file items within the content
          const fileItems = accordionContentEl.querySelectorAll('[id="file"]');
          console.log(`Found ${fileItems.length} file items in expanded content`);
          
          // Check stacking context
          const styles = window.getComputedStyle(accordionContentEl);
          console.log('Accordion content styles:', {
            position: styles.position,
            zIndex: styles.zIndex,
            overflow: styles.overflow,
            transform: styles.transform,
            isolation: styles.isolation
          });
          
          // Check for any elements that might block the hover
          type BlockingElement = {
            tag: string;
            classes: string;
            position: string;
            zIndex: string;
            pointerEvents: string;
          };
          
          const blockingElements: BlockingElement[] = [];
          Array.from(accordionContentEl.children).forEach(child => {
            const childStyles = window.getComputedStyle(child as Element);
            if (childStyles.position === 'absolute' || childStyles.position === 'fixed' || 
                parseInt(childStyles.zIndex, 10) > 0 || childStyles.pointerEvents === 'none') {
              blockingElements.push({
                tag: (child as Element).tagName,
                classes: (child as Element).className,
                position: childStyles.position,
                zIndex: childStyles.zIndex,
                pointerEvents: childStyles.pointerEvents
              });
            }
          });
          
          if (blockingElements.length) {
            console.log('Potential blocking elements found:', blockingElements);
          }
        } else {
          console.log('No accordion content element found after expansion');
        }
      }, 100); // Short delay to let the DOM update
    }
  }, [isAccordionOpen, id, listType]);

>>>>>>> Stashed changes
  return (
    <AccordionItem
      value={id}
      className={listStyles}
      onClick={(e) => {
        e.stopPropagation();
        navigatatePage(id, listType);
      }}
    >
      <AccordionTrigger
        id={listType}
        className="hover:no-underline 
        p-2 
        dark:text-muted-foreground 
        text-sm"
        disabled={listType === 'file'}
      >
<<<<<<< Updated upstream
        <div className={groupIdentifies}>
          <div
            className="flex 
          gap-4 
          items-center 
          justify-center 
          overflow-hidden"
          >
            <div className="relative">
              <EmojiPicker getValue={onChangeEmoji}>{iconId}</EmojiPicker>
            </div>
            <input
                title={listType === 'folder' ? 'Folder Title' : 'File Title'}
                placeholder={listType === 'folder' ? 'Enter folder title' : 'Enter file title'}
              type="text"
              value={listType === 'folder' ? folderTitle : fileTitle}
              className={clsx(
                'outline-none overflow-hidden w-[140px] text-Neutrals/neutrals-7',
                {
                  'bg-muted cursor-text': isEditing,
                  'bg-transparent cursor-pointer': !isEditing,
                }
              )}
              readOnly={!isEditing}
              onDoubleClick={handleDoubleClick}
              onBlur={handleBlur}
              onChange={
                listType === 'folder' ? folderTitleChange : fileTitleChange
              }
            />
          </div>
          <div className={hoverStyles}>
            <TooltipWrapper tooltip="Delete Folder">
              <Trash
                onClick={moveToTrash}
                size={15}
                className="hover:dark:text-white dark:text-Neutrals/neutrals-7 transition-colors"
              />
            </TooltipWrapper>
            {listType === 'folder' && !isEditing && (
              <TooltipWrapper tooltip="Add File">
                <PlusIcon
                  onClick={addNewFile}
                  size={15}
                  className="hover:dark:text-white dark:text-Neutrals/neutrals-7 transition-colors"
                />
=======
        <div 
          className={groupIdentifies}
          ref={itemRef}
          onMouseEnter={() => {
            console.log(`Mouse enter on ${listType} ${id}`);
            setIsHovering(true);
          }}
          onMouseLeave={() => {
            console.log(`Mouse leave on ${listType} ${id}`);
            setIsHovering(false);
          }}
        >
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
                    className="text-sm cursor-pointer truncate max-w-[150px]"
                    onDoubleClick={handleDoubleClick}
                    title={folderTitle || fileTitle}
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
                  className="bg-transparent text-sm border-none focus:outline-none max-w-[150px]"
                  aria-label={`Edit ${listType} title`}
                />
              </div>
            )}
          </div>
          <div 
            className={hoverStyles}
            style={{
              // Always use inline styles to control visibility based on hover state
              display: isHovering ? 'flex' : listType === 'folder' ? 'none' : undefined,
              opacity: isHovering ? 1 : listType === 'file' ? 0 : undefined,
              zIndex: 50,
              position: 'absolute',
              right: '0.5rem',
            }}
            onClick={(e) => {
              console.log(`Icons container clicked for ${id}, visible=${isHovering}`);
              e.stopPropagation();
            }}
          >
            <TooltipWrapper tooltip="Delete">
              <span
                className="p-1 hover:bg-slate-600 rounded-full transition-colors inline-flex"
                onClick={(e) => {
                  console.log(`Delete icon clicked for ${id}`);
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
                    console.log(`Add file icon clicked for ${id}`);
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
>>>>>>> Stashed changes
              </TooltipWrapper>
            )}
          </div>
        </div>
      </AccordionTrigger>
<<<<<<< Updated upstream
      <AccordionContent>
        {state.workspaces
          .find((workspace) => workspace.id === workspaceId)
          ?.folders.find((folder) => folder.id === id)
          ?.files.filter((file) => !file.inTrash)
          .map((file) => {
            const customFileId = `${id}folder${file.id}`;
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
=======
      
      {/* Add debug code to log when rendering AccordionContent */}
      {listType === 'folder' && (
        <AccordionContent 
          className="relative" // Ensure proper positioning context
          onAnimationStart={() => console.log(`Accordion animation started for ${id}`)}
          onAnimationEnd={() => console.log(`Accordion animation completed for ${id}`)}
        >
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
      )}
>>>>>>> Stashed changes
    </AccordionItem>
  );
};

export default Dropdown;