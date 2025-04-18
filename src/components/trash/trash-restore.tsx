'use client';
import { appFoldersType, useAppState } from '@/lib/providers/state-provider';
import { deleteFile, deleteFolder, getFiles, updateFile, updateFolder } from '@/supabase/queries';
import { File } from '@/supabase/supabase';
import { FileIcon, FolderIcon, Trash2, UndoIcon } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '../ui/button';

const TrashRestore = () => {
  const { state, workspaceId, dispatch } = useAppState();
  const [folders, setFolders] = useState<appFoldersType[] | []>([]);
  const [files, setFiles] = useState<File[] | []>([]);
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all files from the database for each folder when component mounts
  useEffect(() => {
    const fetchAllFolderFiles = async () => {
      if (!workspaceId) return;
      
      setIsInitialLoading(true);
      console.log("Trash: Fetching files for all folders");
      
      try {
        // Get all folders (including trashed ones)
        const workspaceFolders = state.workspaces
          .find((workspace) => workspace.id === workspaceId)
          ?.folders || [];
          
        // For each folder, fetch its files from the database
        const folderPromises = workspaceFolders.map(async (folder) => {
          if (!folder.id) return;
          
          console.log(`Trash: Fetching files for folder ${folder.id}`);
          const { data, error } = await getFiles(folder.id);
          
          if (error) {
            console.error(`Trash: Error fetching files for folder ${folder.id}:`, error);
            return;
          }
          
          if (data && data.length > 0) {
            console.log(`Trash: Found ${data.length} files for folder ${folder.id}`);
            // Update the state with these files
            dispatch({
              type: 'SET_FILES',
              payload: { workspaceId, files: data, folderId: folder.id },
            });
          }
        });
        
        await Promise.allSettled(folderPromises);
        console.log("Trash: Finished fetching all folder files");
      } catch (err) {
        console.error("Trash: Error fetching folder files:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    fetchAllFolderFiles();
  }, [workspaceId, dispatch]);

  // Update local state whenever the global state changes
  useEffect(() => {
    if (isInitialLoading) return;
    
    const stateFolders =
      state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.filter((folder) => folder.inTrash) || [];
    setFolders(stateFolders);

    const stateFiles: File[] = [];
    state.workspaces
      .find((workspace) => workspace.id === workspaceId)
      ?.folders.forEach((folder) => {
        folder.files.forEach((file) => {
          if (file.inTrash) {
            stateFiles.push(file);
          }
        });
      });
    setFiles(stateFiles);
    
    console.log("Trash: Updated local state", { 
      folders: stateFolders.length, 
      files: stateFiles.length 
    });
  }, [state, workspaceId, isInitialLoading]);

  const restoreFolder = async (folder: appFoldersType) => {
    try {
      setIsLoading({...isLoading, [folder.id]: true});
      
      // Check if required properties exist
      if (!workspaceId || !folder.id) {
        throw new Error("Missing workspace ID or folder ID");
      }
      
      // Update local state first
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          folder: { inTrash: null },
          folderId: folder.id,
          workspaceId,
        },
      });

      // Also restore any files that were in this folder
      const folderFiles = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((f) => f.id === folder.id)
        ?.files.filter((file) => file.inTrash) || [];
      
      // Update all files in local state
      for (const file of folderFiles) {
        if (!file.id) continue;
        
        dispatch({
          type: 'UPDATE_FILE',
          payload: {
            file: { inTrash: null },
            folderId: folder.id,
            workspaceId,
            fileId: file.id,
          },
        });
      }
      
      // Update folder in DB
      await updateFolder({ inTrash: null }, folder.id);
      
      // Update any trashed files in DB
      const fileUpdatePromises = folderFiles
        .filter(file => !!file.id)
        .map(file => updateFile({ inTrash: null }, file.id));
      
      await Promise.allSettled(fileUpdatePromises);
      
      toast({
        title: 'Folder Restored',
        description: `${folder.title || 'Folder'} has been restored`,
      });
    } catch (error) {
      console.error('Error restoring folder:', error);
      toast({
        title: 'Restoration Failed',
        description: 'There was an error restoring the folder',
        variant: 'destructive',
      });
    } finally {
      setIsLoading({...isLoading, [folder.id]: false});
    }
  };

  const restoreFile = async (file: File) => {
    try {
      setIsLoading({...isLoading, [file.id]: true});
      
      // Check if required properties exist
      if (!workspaceId || !file.id || !file.folderId) {
        throw new Error("Missing required file properties");
      }
      
      // Check if parent folder exists and if it's in trash
      const parentFolder = state.workspaces
        .find((workspace) => workspace.id === workspaceId)
        ?.folders.find((folder) => folder.id === file.folderId);
      
      // If parent folder is in trash, we need to restore it first
      if (parentFolder?.inTrash) {
        console.log(`Parent folder ${parentFolder.id} is in trash, restoring it first`);
        
        // Update folder in local state
        dispatch({
          type: 'UPDATE_FOLDER',
          payload: {
            folder: { inTrash: null },
            folderId: parentFolder.id,
            workspaceId,
          },
        });
        
        // Update folder in database
        await updateFolder({ inTrash: null }, parentFolder.id);
        
        toast({
          title: 'Folder Also Restored',
          description: `${parentFolder.title || 'Parent folder'} was also restored`,
        });
      }
      
      // Check if parent folder doesn't exist (might have been permanently deleted)
      if (!parentFolder) {
        toast({
          title: 'Warning',
          description: "This file's folder no longer exists. The file will be restored but may not be visible.",
          variant: 'destructive',
        });
      }
      
      // Update file in local state
      dispatch({
        type: 'UPDATE_FILE',
        payload: {
          file: { inTrash: null },
          folderId: file.folderId,
          workspaceId,
          fileId: file.id,
        },
      });
      
      // Update file in DB
      await updateFile({ inTrash: null }, file.id);
      
      toast({
        title: 'File Restored',
        description: `${file.title || 'File'} has been restored`,
      });
    } catch (error) {
      console.error('Error restoring file:', error);
      toast({
        title: 'Restoration Failed',
        description: 'There was an error restoring the file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading({...isLoading, [file.id]: false});
    }
  };

  const permanentlyDeleteFolder = async (folder: appFoldersType) => {
    // Get all files in this folder first to show in the confirmation
    const folderFiles = state.workspaces
      .find((workspace) => workspace.id === workspaceId)
      ?.folders.find((f) => f.id === folder.id)
      ?.files || [];
    
    // Filter to show only files that are in trash
    const trashedFiles = folderFiles.filter(file => file.inTrash);
    
    // Create a warning message with file names
    let warningMessage = `Are you sure you want to permanently delete "${folder.title || 'this folder'}"?`;
    
    if (trashedFiles.length > 0) {
      // If there are a lot of files, show a truncated list
      const maxFilesToShow = 3;
      const fileNames = trashedFiles.map(file => file.title || 'Untitled');
      const shownFiles = fileNames.slice(0, maxFilesToShow);
      const remainingCount = fileNames.length - maxFilesToShow;
      
      warningMessage += `\n\nThe following files will also be permanently deleted:`;
      shownFiles.forEach(name => {
        warningMessage += `\n• ${name}`;
      });
      
      if (remainingCount > 0) {
        warningMessage += `\n• ...and ${remainingCount} more file${remainingCount > 1 ? 's' : ''}`;
      }
    }
    
    warningMessage += `\n\nThis action cannot be undone.`;
    
    if (!confirm(warningMessage)) {
      return;
    }
    
    try {
      setIsLoading({...isLoading, [folder.id]: true});
      
      // Check if required properties exist
      if (!workspaceId || !folder.id) {
        throw new Error("Missing workspace ID or folder ID");
      }
      
      // Delete all files in this folder from the database
      const fileDeletePromises = folderFiles
        .filter(file => !!file.id && file.inTrash)
        .map(file => deleteFile(file.id));
        
      const fileResults = await Promise.allSettled(fileDeletePromises);
      const failedDeletes = fileResults.filter(result => result.status === 'rejected').length;
      
      if (failedDeletes > 0) {
        console.warn(`${failedDeletes} file deletions failed`);
      }
      
      // Delete the folder from the database
      await deleteFolder(folder.id);
      
      // Update local state to remove the folder
      dispatch({
        type: 'DELETE_FOLDER',
        payload: {
          folderId: folder.id,
          workspaceId,
        },
      });
      
      toast({
        title: 'Folder Deleted',
        description: `${folder.title || 'Folder'} and its files have been permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: 'Deletion Failed',
        description: 'There was an error deleting the folder',
        variant: 'destructive',
      });
    } finally {
      setIsLoading({...isLoading, [folder.id]: false});
    }
  };

  const permanentlyDeleteFile = async (file: File) => {
    if (!confirm(`Are you sure you want to permanently delete "${file.title || 'this file'}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setIsLoading({...isLoading, [file.id]: true});
      
      // Check if required properties exist
      if (!workspaceId || !file.id || !file.folderId) {
        throw new Error("Missing required file properties");
      }
      
      // Delete the file from the database
      await deleteFile(file.id);
      
      // Update local state to remove the file
      dispatch({
        type: 'DELETE_FILE',
        payload: {
          fileId: file.id,
          folderId: file.folderId,
          workspaceId,
        },
      });
      
      toast({
        title: 'File Deleted',
        description: `${file.title || 'File'} has been permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Deletion Failed',
        description: 'There was an error deleting the file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading({...isLoading, [file.id]: false});
    }
  };

  return (
    <section className="px-2 py-4">
      {isInitialLoading ? (
        <div className="text-center py-20">
          <div className="animate-pulse">Loading trash items...</div>
        </div>
      ) : (
        <>
          {!!folders.length && (
            <div className="mb-4">
              <h3 className="text-xl font-semibold mb-2">Folders</h3>
              <div className="space-y-2">
                {folders.map((folder) => (
                  <div 
                    key={folder.id}
                    className="hover:bg-muted rounded-md p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[180px]">
                      <FolderIcon className="h-4 w-4" />
                      <span className="truncate">{folder.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => restoreFolder(folder)}
                        size="sm" 
                        variant="outline"
                        disabled={isLoading[folder.id]}
                      >
                        <UndoIcon className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button 
                        onClick={() => permanentlyDeleteFolder(folder)}
                        size="sm" 
                        variant="destructive"
                        disabled={isLoading[folder.id]}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!!files.length && (
            <div>
              <h3 className="text-xl font-semibold mb-2">Files</h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <div 
                    key={file.id}
                    className="hover:bg-muted rounded-md p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[180px]">
                      <FileIcon className="h-4 w-4" />
                      <span className="truncate">{file.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => restoreFile(file)}
                        size="sm" 
                        variant="outline"
                        disabled={isLoading[file.id]}
                      >
                        <UndoIcon className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button 
                        onClick={() => permanentlyDeleteFile(file)}
                        size="sm" 
                        variant="destructive"
                        disabled={isLoading[file.id]}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!files.length && !folders.length && (
            <div className="text-muted-foreground absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2">
              No Items in trash
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default TrashRestore;