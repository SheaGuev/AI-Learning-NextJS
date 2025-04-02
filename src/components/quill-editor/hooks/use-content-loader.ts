import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/providers/state-provider';
import { getFileDetails, getFolderDetails, getWorkspaceDetails } from '@/supabase/queries';

// Helper function to process markdown content line by line
const processMarkdownContent = (quill: any, content: string) => {
  console.log('Processing markdown content:', { 
    linesCount: content.split('\n').length,
    contentStart: content.substring(0, 100) + '...'
  });
  
  const lines = content.split('\n');
  let currentIndex = 0;
  
  // First clear the editor
  quill.setText('');
  
  // Process the markdown line by line
  for (const line of lines) {
    // Skip empty lines but add them to the editor
    if (!line.trim()) {
      quill.insertText(currentIndex, '\n');
      currentIndex += 1;
      continue;
    }
    
    // Process headings
    if (line.startsWith('# ')) {
      console.log('Processing H1:', line);
      const content = line.substring(2);
      quill.insertText(currentIndex, content + '\n', { header: 1 });
      currentIndex += content.length + 1;
      continue;
    }
    
    if (line.startsWith('## ')) {
      console.log('Processing H2:', line);
      const content = line.substring(3);
      quill.insertText(currentIndex, content + '\n', { header: 2 });
      currentIndex += content.length + 1;
      continue;
    }
    
    if (line.startsWith('### ')) {
      console.log('Processing H3:', line);
      const content = line.substring(4);
      quill.insertText(currentIndex, content + '\n', { header: 3 });
      currentIndex += content.length + 1;
      continue;
    }

    if (line.startsWith('#### ')) {
      console.log('Processing H4:', line);
      const content = line.substring(5);
      quill.insertText(currentIndex, content + '\n', { header: 4 });
      currentIndex += content.length + 1;
      continue;
    }
    
    // Process bullet lists
    if (line.startsWith('* ') || line.startsWith('- ')) {
      console.log('Processing bullet list:', line);
      const content = line.substring(2);
      quill.insertText(currentIndex, content + '\n', { list: 'bullet' });
      currentIndex += content.length + 1;
      continue;
    }
    
    // Process numbered lists
    const numberedListMatch = line.match(/^\d+\.\s(.+)$/);
    if (numberedListMatch) {
      console.log('Processing numbered list:', line);
      const content = numberedListMatch[1];
      quill.insertText(currentIndex, content + '\n', { list: 'ordered' });
      currentIndex += content.length + 1;
      continue;
    }
    
    // Process blockquotes
    if (line.startsWith('> ')) {
      console.log('Processing blockquote:', line);
      const content = line.substring(2);
      quill.insertText(currentIndex, content + '\n', { blockquote: true });
      currentIndex += content.length + 1;
      continue;
    }
    
    // Process code blocks
    if (line.startsWith('```')) {
      console.log('Processing code block start:', line);
      // Start of code block - find the end
      const codeBlockStart = currentIndex;
      quill.insertText(currentIndex, '\n', { 'code-block': true });
      currentIndex += 1;
      continue;
    }
    
    // Process indented code blocks
    if (line.startsWith('    ') || line.startsWith('\t')) {
      console.log('Processing indented code:', line);
      const content = line.startsWith('    ') ? line.substring(4) : line.substring(1);
      quill.insertText(currentIndex, content + '\n', { 'code-block': true });
      currentIndex += content.length + 1;
      continue;
    }
    
    // Try to process inline formatting (basic implementation)
    let processedLine = line;
    
    // For improved handling, let's focus on the most common standalone formatting cases
    if (processedLine.match(/^\*\*.*\*\*$/) && processedLine.length > 4) {
      // Line is entirely bold
      console.log('Processing entire line as bold:', processedLine);
      const content = processedLine.substring(2, processedLine.length - 2);
      quill.insertText(currentIndex, content + '\n', { bold: true });
      currentIndex += content.length + 1;
    } 
    else if (processedLine.match(/^\*.*\*$/) && !processedLine.includes('**') && processedLine.length > 2) {
      // Line is entirely italic
      console.log('Processing entire line as italic:', processedLine);
      const content = processedLine.substring(1, processedLine.length - 1);
      quill.insertText(currentIndex, content + '\n', { italic: true });
      currentIndex += content.length + 1;
    }
    else if (processedLine.match(/^`.*`$/) && processedLine.length > 2) {
      // Line is entirely code
      console.log('Processing entire line as code:', processedLine);
      const content = processedLine.substring(1, processedLine.length - 1);
      quill.insertText(currentIndex, content + '\n', { code: true });
      currentIndex += content.length + 1;
    }
    else {
      // Default approach - just insert as plain text
      // Inline formatting is very complex to handle properly and would require
      // a much more sophisticated parser
      console.log('Processing as regular text:', processedLine);
      quill.insertText(currentIndex, processedLine + '\n');
      currentIndex += processedLine.length + 1;
    }
  }
};

export const useContentLoader = (
  quill: any, 
  fileId: string, 
  dirType: 'file' | 'folder' | 'workspace'
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
        
        // Parse the data
        const parsedData = JSON.parse(selectedDir[0].data || '');
        
        // Check if this is markdown content
        if (parsedData.markdown && parsedData.content) {
          // Use the shared processing function
          processMarkdownContent(quill, parsedData.content);
        } else {
          // Normal Quill delta content
          quill.setContents(parsedData);
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
          processMarkdownContent(quill, parsedData.content);
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
          processMarkdownContent(quill, parsedData.content);
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
  }, [fileId, workspaceId, quill, dirType, dispatch, folderId, router]);
}; 