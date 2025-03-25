import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/providers/state-provider';
import { useRouter } from 'next/navigation';
import { deleteFile, deleteFolder, updateFile, updateFolder, updateWorkspace } from '@/supabase/queries';
import { createBClient } from '@/lib/server-actions/createClient';

export const useDocumentOperations = (quill: any, fileId: string, dirType: 'file' | 'folder' | 'workspace') => {
  const supabase = createBClient();
  const { state, workspaceId, folderId, dispatch } = useAppState();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState(false);
  const { toast } = useToast();

  // Document change handler with debounce save
  const quillHandler = useCallback((delta: any, oldDelta: any, source: any) => {
    if (source !== 'user') {
      return;
    }
      
    // Clear any existing save timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
      
    // Set saving indicator immediately
    setSaving(true);
      
    // Get the current editor content
    const contents = quill?.getContents();
    const quillLength = quill?.getLength() || 0;
      
    // Set a timer to save after a delay (debounce)
    saveTimerRef.current = setTimeout(async () => {
      try {
        // Check if we have valid content to save
        if (!contents || quillLength <= 1 || !fileId) {
          setSaving(false);
          return;
        }
          
        const contentString = JSON.stringify(contents);
          
        // Process based on directory type
        if (dirType === 'file') {
          // Check for required context
          if (!workspaceId || !folderId) {
            toast({
              title: 'Save Error',
              variant: 'destructive',
              description: 'Missing workspace or folder ID',
            });
            setSaving(false);
            return;
          }
            
          // Update local state first
          dispatch({
            type: 'UPDATE_FILE',
            payload: {
              file: { data: contentString },
              workspaceId,
              folderId,
              fileId,
            },
          });
            
          // Perform the actual database update
          const result = await updateFile({ data: contentString }, fileId);
            
          if (result?.error) {
            toast({
              title: 'Save Error',
              variant: 'destructive',
              description: 'Failed to save to database: ' + result.error,
            });
          }
        } else if (dirType === 'folder') {
          if (!workspaceId) {
            toast({
              title: 'Save Error',
              variant: 'destructive',
              description: 'Missing workspace ID',
            });
            setSaving(false);
            return;
          }
            
          // Update local state first
          dispatch({
            type: 'UPDATE_FOLDER',
            payload: {
              folder: { data: contentString },
              workspaceId,
              folderId: fileId,
            },
          });
            
          // Perform the database update
          const result = await updateFolder({ data: contentString }, fileId);
            
          if (result?.error) {
            toast({
              title: 'Save Error',
              variant: 'destructive',
              description: 'Failed to save to database: ' + result.error,
            });
          }
        } else if (dirType === 'workspace') {
          // Update local state first
          dispatch({
            type: 'UPDATE_WORKSPACE',
            payload: {
              workspace: { data: contentString },
              workspaceId: fileId,
            },
          });
            
          // Perform the database update
          const result = await updateWorkspace({ data: contentString }, fileId);
            
          if (result?.error) {
            toast({
              title: 'Save Error',
              variant: 'destructive',
              description: 'Failed to save to database: ' + result.error,
            });
          }
        }
      } catch (err) {
        toast({
          title: 'Save Error',
          variant: 'destructive',
          description: 'An unexpected error occurred while saving',
        });
      } finally {
        // Always reset the saving state when we're done
        setSaving(false);
      }
    }, 500);
  }, [quill, fileId, dirType, workspaceId, folderId, dispatch, toast]);

  // Restore file from trash
  const restoreFileHandler = async () => {
    if (dirType === 'file') {
      if (!folderId || !workspaceId) return;
      dispatch({
        type: 'UPDATE_FILE',
        payload: { file: { inTrash: '' }, fileId, folderId, workspaceId },
      });
      await updateFile({ inTrash: '' }, fileId);
    }
    if (dirType === 'folder') {
      if (!workspaceId) return;
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: { folder: { inTrash: '' }, folderId: fileId, workspaceId },
      });
      await updateFolder({ inTrash: '' }, fileId);
    }
  };

  // Delete file permanently
  const deleteFileHandler = async () => {
    if (dirType === 'file') {
      if (!folderId || !workspaceId) return;
      dispatch({
        type: 'DELETE_FILE',
        payload: { fileId, folderId, workspaceId },
      });
      await deleteFile(fileId);
      router.replace(`/dashboard/${workspaceId}`);
    }
    if (dirType === 'folder') {
      if (!workspaceId) return;
      dispatch({
        type: 'DELETE_FOLDER',
        payload: { folderId: fileId, workspaceId },
      });
      await deleteFolder(fileId);
      router.replace(`/dashboard/${workspaceId}`);
    }
  };

  // Change icon
  const iconOnChange = async (icon: string) => {
    if (!fileId) return;
    if (dirType === 'workspace') {
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { workspace: { iconId: icon }, workspaceId: fileId },
      });
      await updateWorkspace({ iconId: icon }, fileId);
    }
    if (dirType === 'folder') {
      if (!workspaceId) return;
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: {
          folder: { iconId: icon },
          workspaceId,
          folderId: fileId,
        },
      });
      await updateFolder({ iconId: icon }, fileId);
    }
    if (dirType === 'file') {
      if (!workspaceId || !folderId) return;

      dispatch({
        type: 'UPDATE_FILE',
        payload: { file: { iconId: icon }, workspaceId, folderId, fileId },
      });
      await updateFile({ iconId: icon }, fileId);
    }
  };

  // Delete banner image
  const deleteBanner = async () => {
    if (!fileId) return;
    setDeletingBanner(true);
    if (dirType === 'file') {
      if (!folderId || !workspaceId) return;
      dispatch({
        type: 'UPDATE_FILE',
        payload: { file: { bannerUrl: '' }, fileId, folderId, workspaceId },
      });
      await supabase.storage.from('file-banners').remove([`banner-${fileId}`]);
      await updateFile({ bannerUrl: '' }, fileId);
    }
    if (dirType === 'folder') {
      if (!workspaceId) return;
      dispatch({
        type: 'UPDATE_FOLDER',
        payload: { folder: { bannerUrl: '' }, folderId: fileId, workspaceId },
      });
      await supabase.storage.from('file-banners').remove([`banner-${fileId}`]);
      await updateFolder({ bannerUrl: '' }, fileId);
    }
    if (dirType === 'workspace') {
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          workspace: { bannerUrl: '' },
          workspaceId: fileId,
        },
      });
      await supabase.storage.from('file-banners').remove([`banner-${fileId}`]);
      await updateWorkspace({ bannerUrl: '' }, fileId);
    }
    setDeletingBanner(false);
  };

  return {
    saving,
    deletingBanner,
    quillHandler,
    restoreFileHandler,
    deleteFileHandler,
    iconOnChange,
    deleteBanner
  };
}; 