import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/lib/providers/state-provider';
import { useRouter } from 'next/navigation';
import { deleteFile, deleteFolder, updateFile, updateFolder, updateWorkspace } from '@/supabase/queries';
import { createBClient } from '@/lib/server-actions/createClient';
import { useSocket } from '@/lib/providers/socket-provider';

export const useDocumentOperations = (quill: any, fileId: string, dirType: 'file' | 'folder' | 'workspace') => {
  const supabase = createBClient();
  const { state, workspaceId, folderId, dispatch } = useAppState();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState(false);
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();

  // Document change handler with debounce save
  const quillHandler = useCallback((delta: any, oldDelta: any, source: any) => {
    if (source !== 'user') {
      return;
    }
      
    // Emit changes to socket server for real-time collaboration
    if (socket && isConnected && fileId) {
      console.log('Emitting changes to socket server for room:', fileId);
      socket.emit('send-changes', delta, fileId);
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
  }, [quill, fileId, dirType, workspaceId, folderId, dispatch, toast, socket, isConnected]);

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

  // Get content as markdown
  const getMarkdownContent = useCallback(async () => {
    if (!quill) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Editor not initialized',
      });
      return null;
    }
    
    try {
      // Use turndown to convert HTML to markdown
      const html = quill.root.innerHTML;
      
      // Dynamically import turndown to avoid server-side issues
      const TurndownService = (await import('turndown')).default;
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '*'
      });
      
      const markdown = turndownService.turndown(html);
      
      toast({
        title: 'Success',
        description: 'Markdown content exported',
      });
      
      return markdown;
    } catch (err) {
      console.error('Error converting to markdown:', err);
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Failed to get markdown content',
      });
      return null;
    }
  }, [quill, toast]);

  // Import markdown content 
  const importMarkdown = useCallback((markdown: string) => {
    if (!quill) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Editor not initialized',
      });
      return;
    }
    
    try {
      // Don't just set text, but convert markdown to HTML and then set as content
      // This approach will properly convert markdown to rich text format
      
      const convertMarkdownToQuillContent = async () => {
        try {
          // First, clear the editor
          quill.setText('');
          
          // Process the markdown line by line for better control
          const lines = markdown.split('\n');
          let currentIndex = 0;
          
          for (const line of lines) {
            // Skip empty lines but add them to the editor
            if (!line.trim()) {
              quill.insertText(currentIndex, '\n');
              currentIndex += 1;
              continue;
            }
            
            // Process headings
            if (line.startsWith('# ')) {
              const content = line.substring(2);
              quill.insertText(currentIndex, content + '\n', { header: 1 });
              currentIndex += content.length + 1;
              continue;
            }
            
            if (line.startsWith('## ')) {
              const content = line.substring(3);
              quill.insertText(currentIndex, content + '\n', { header: 2 });
              currentIndex += content.length + 1;
              continue;
            }
            
            if (line.startsWith('### ')) {
              const content = line.substring(4);
              quill.insertText(currentIndex, content + '\n', { header: 3 });
              currentIndex += content.length + 1;
              continue;
            }
            
            if (line.startsWith('#### ')) {
              const content = line.substring(5);
              quill.insertText(currentIndex, content + '\n', { header: 4 });
              currentIndex += content.length + 1;
              continue;
            }
            
            // Process bullet lists
            if (line.startsWith('* ') || line.startsWith('- ')) {
              const content = line.substring(2);
              quill.insertText(currentIndex, content + '\n', { list: 'bullet' });
              currentIndex += content.length + 1;
              continue;
            }
            
            // Process numbered lists
            const numberedListMatch = line.match(/^\d+\.\s(.+)$/);
            if (numberedListMatch) {
              const content = numberedListMatch[1];
              quill.insertText(currentIndex, content + '\n', { list: 'ordered' });
              currentIndex += content.length + 1;
              continue;
            }
            
            // Process blockquotes
            if (line.startsWith('> ')) {
              const content = line.substring(2);
              quill.insertText(currentIndex, content + '\n', { blockquote: true });
              currentIndex += content.length + 1;
              continue;
            }
            
            // Process bold text (standalone line)
            if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
              const content = line.substring(2, line.length - 2);
              quill.insertText(currentIndex, content + '\n', { bold: true });
              currentIndex += content.length + 1;
              continue;
            }
            
            // Process italic text (standalone line)
            if ((line.startsWith('*') && line.endsWith('*') && line.length > 2) ||
                (line.startsWith('_') && line.endsWith('_') && line.length > 2)) {
              const content = line.startsWith('*') ? 
                line.substring(1, line.length - 1) : 
                line.substring(1, line.length - 1);
              quill.insertText(currentIndex, content + '\n', { italic: true });
              currentIndex += content.length + 1;
              continue;
            }
            
            // Process code blocks
            if (line.startsWith('```')) {
              // Start of code block
              quill.insertText(currentIndex, '\n', { 'code-block': true });
              currentIndex += 1;
              continue;
            }
            
            // Process inline code (simple version)
            if (line.startsWith('`') && line.endsWith('`') && line.length > 2) {
              const content = line.substring(1, line.length - 1);
              quill.insertText(currentIndex, content + '\n', { 'code': true });
              currentIndex += content.length + 1;
              continue;
            }
            
            // Process indented code blocks
            if (line.startsWith('    ') || line.startsWith('\t')) {
              const content = line.startsWith('    ') ? line.substring(4) : line.substring(1);
              quill.insertText(currentIndex, content + '\n', { 'code-block': true });
              currentIndex += content.length + 1;
              continue;
            }
            
            // Horizontal rule
            if (line === '---' || line === '***' || line === '___') {
              quill.insertEmbed(currentIndex, 'hr', true);
              quill.insertText(currentIndex + 1, '\n');
              currentIndex += 2;
              continue;
            }
            
            // Try to process inline formatting (basic implementation)
            let processedLine = line;
            
            // Default - insert as regular paragraph
            quill.insertText(currentIndex, processedLine + '\n');
            currentIndex += processedLine.length + 1;
          }
        } catch (err) {
          console.error('Error converting markdown to rich text:', err);
          // Fallback to plain text if conversion fails
          quill.setText(markdown);
        }
      };
      
      convertMarkdownToQuillContent();
      
      toast({
        title: 'Success',
        description: 'Markdown content imported and converted',
      });
    } catch (err) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Failed to import markdown content',
      });
      
      // Fallback to plain text
      quill.setText(markdown);
    }
  }, [quill, toast]);

  return {
    saving,
    deletingBanner,
    quillHandler,
    restoreFileHandler,
    deleteFileHandler,
    iconOnChange,
    deleteBanner,
    getMarkdownContent,
    importMarkdown
  };
}; 