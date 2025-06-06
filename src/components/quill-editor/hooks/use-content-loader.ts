import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/providers/state-provider';
import { getFileDetails, getFolderDetails, getWorkspaceDetails } from '@/supabase/queries';

// Define the type for the importMarkdown function
type ImportMarkdownType = (markdown: string) => void;

export const useContentLoader = (
  quill: any, 
  fileId: string, 
  dirType: 'file' | 'folder' | 'workspace',
  importMarkdown: ImportMarkdownType // Add importMarkdown as an argument
) => {
  const router = useRouter();
  const { workspaceId, folderId, dispatch } = useAppState();

  useEffect(() => {
    if (!fileId) return;

    const fetchInformation = async () => {
      if (dirType === 'file') {
        const { data: selectedDir, error } = await getFileDetails(fileId);
        if (error || !selectedDir) {
          return router.replace('/dashboard');
        }

        if (!selectedDir[0]) {
          if (!workspaceId) return;
          return router.replace(`/dashboard/${workspaceId}`);
        }
        if (!workspaceId || quill === null) return;
        if (!selectedDir[0].data) return;
        
        // Check if the content is marked as markdown
        const isMarkdown = selectedDir[0].data.includes('"markdown":true');
        
        if (isMarkdown) {
          // Extract the raw markdown content string
          try {
            const parsedData = JSON.parse(selectedDir[0].data);
            const markdownContent = parsedData.content || '';
            console.log('Loading raw markdown content into Quill...');
            
            // Import the markdown content
            importMarkdown(markdownContent); // Call importMarkdown
            
            // Ensure markdown processing runs after content is loaded
            setTimeout(() => {
              // Process markdown after a short delay to ensure the editor has settled
              const markdownModule = quill.getModule('markdown');
              if (markdownModule && typeof markdownModule.process === 'function') {
                console.log('Explicitly processing markdown after content load');
                markdownModule.process();
              }
            }, 300);
          } catch (e) {
            console.error('Error parsing markdown data object, falling back to setting raw text:', e);
            quill.setText(selectedDir[0].data); // Fallback to raw data string
          }
        } else {
          // Assume it's standard Quill Delta format
          try {
            const parsedData = JSON.parse(selectedDir[0].data);
            console.log('Loading Quill Delta content...');
            quill.setContents(parsedData);
          } catch (e) {
            console.error('Error parsing non-markdown data, setting as text:', e);
            quill.setText(selectedDir[0].data); // Fallback
          }
        }
        
        dispatch({
          type: 'UPDATE_FILE',
          payload: {
            file: { data: selectedDir[0].data },
            fileId,
            folderId: selectedDir[0].folderId,
            workspaceId,
          },
        });
      }
      
      if (dirType === 'folder') {
        const { data: selectedDir, error } = await getFolderDetails(fileId);
        if (error || !selectedDir) {
          return router.replace('/dashboard');
        }

        if (!selectedDir[0]) {
          router.replace(`/dashboard/${workspaceId}`);
        }
        if (quill === null) return;
        if (!selectedDir[0].data) return;
        
        // Parse the data
        const parsedData = JSON.parse(selectedDir[0].data || '');
        
        // Check if this is markdown content
        if (parsedData.markdown && parsedData.content) {
          // Use the shared processing function
          // processMarkdownContent(quill, parsedData.content);
          importMarkdown(parsedData.content); // Call importMarkdown here too
          
          // Ensure markdown is properly processed after loading
          setTimeout(() => {
            const markdownModule = quill.getModule('markdown');
            if (markdownModule && typeof markdownModule.process === 'function') {
              console.log('Processing markdown after folder content load');
              markdownModule.process();
            }
          }, 300);
        } else {
          // Normal Quill delta content
          quill.setContents(parsedData);
        }
        
        dispatch({
          type: 'UPDATE_FOLDER',
          payload: {
            folderId: fileId,
            folder: { data: selectedDir[0].data },
            workspaceId: selectedDir[0].workspaceId,
          },
        });
      }
      
      if (dirType === 'workspace') {
        const { data: selectedDir, error } = await getWorkspaceDetails(fileId);
        if (error || !selectedDir) {
          return router.replace('/dashboard');
        }
        if (!selectedDir[0] || quill === null) return;
        if (!selectedDir[0].data) return;
        
        // Parse the data
        const parsedData = JSON.parse(selectedDir[0].data || '');
        
        // Check if this is markdown content (same pattern)
        if (parsedData.markdown && parsedData.content) {
          // Use the shared processing function
          // processMarkdownContent(quill, parsedData.content);
          importMarkdown(parsedData.content); // And here for workspace loading
          
          // Ensure markdown is properly processed after loading
          setTimeout(() => {
            const markdownModule = quill.getModule('markdown');
            if (markdownModule && typeof markdownModule.process === 'function') {
              console.log('Processing markdown after workspace content load');
              markdownModule.process();
            }
          }, 300);
        } else {
          // Normal Quill delta content
          quill.setContents(parsedData);
        }
        
        dispatch({
          type: 'UPDATE_WORKSPACE',
          payload: {
            workspace: { data: selectedDir[0].data },
            workspaceId: fileId,
          },
        });
      }
    };
    
    fetchInformation();
  }, [fileId, workspaceId, quill, dirType, dispatch, folderId, router, importMarkdown]); // Add importMarkdown to dependency array
}; 