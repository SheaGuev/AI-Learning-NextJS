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
  
  // Track list state for proper indentation
  let inList = false;
  let listIndentLevel = 0;
  let listType: 'bullet' | 'ordered' | null = null;
  
  // Track code blocks
  let inCodeBlock = false;
  
  // Track tables
  let inTable = false;
  let tableHeaderProcessed = false;
  let tableRows: string[][] = [];
  
  // Process the markdown line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // End of table detection
    if (inTable && (line.trim() === '' || !line.includes('|'))) {
      // Insert the table that we've collected
      insertMarkdownTable(quill, tableRows, currentIndex);
      currentIndex += 1;  // Add an extra line after the table
      
      // Reset table tracking
      inTable = false;
      tableHeaderProcessed = false;
      tableRows = [];
      
      // Insert an empty line after the table
      quill.insertText(currentIndex, '\n');
      currentIndex += 1;
      
      // If this line was blank, skip it
      if (line.trim() === '') {
        continue;
      }
    }
    
    // Table detection
    if (!inTable && line.includes('|') && line.trim().startsWith('|')) {
      // Check if the next line is a table separator
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      if (nextLine.includes('|') && nextLine.includes('-')) {
        // This is a table header, initialize table
        inTable = true;
        tableHeaderProcessed = false;
        tableRows = [];
        
        // Parse the header row
        const cells = line.split('|')
          .filter(cell => cell.trim() !== '')
          .map(cell => cell.trim());
        
        tableRows.push(cells);
        continue;
      }
    }
    
    // Table separator line detection
    if (inTable && !tableHeaderProcessed && line.includes('|') && line.includes('-')) {
      tableHeaderProcessed = true;
      continue;
    }
    
    // Table row detection
    if (inTable && line.includes('|')) {
      const cells = line.split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());
      
      tableRows.push(cells);
      continue;
    }
    
    // Skip empty lines but add them to the editor
    if (!line.trim()) {
      // End of a list
      if (inList) {
        inList = false;
        listIndentLevel = 0;
        listType = null;
      }
      
      // End of a code block
      if (inCodeBlock && lines[i-1]?.trim() === '```') {
        inCodeBlock = false;
      }
      
      quill.insertText(currentIndex, '\n');
      currentIndex += 1;
      continue;
    }
    
    // Process code blocks
    if (line.trim().startsWith('```')) {
      console.log('Processing code block delimiter:', line);
      
      // Toggle code block state
      inCodeBlock = !inCodeBlock;
      
      if (inCodeBlock) {
        // Start of code block - extract language if present
        const lang = line.trim().substring(3).trim();
        quill.insertText(currentIndex, '\n', { 'code-block': true });
        currentIndex += 1;
      } else {
        // End of code block
        quill.insertText(currentIndex, '\n', { 'code-block': true });
        currentIndex += 1;
      }
      continue;
    }
    
    // If we're in a code block, insert with code-block format
    if (inCodeBlock) {
      console.log('Processing code block content:', line);
      quill.insertText(currentIndex, line + '\n', { 'code-block': true });
      currentIndex += line.length + 1;
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
    
    // Process bullet lists with indentation
    const bulletMatch = line.match(/^(\s*)([*\-+])\s+(.+)$/);
    if (bulletMatch) {
      console.log('Processing bullet list:', line, bulletMatch);
      const [_, spaces, bullet, content] = bulletMatch;
      
      // Calculate indent level - properly counting spaces
      // Each indent level should be 2 spaces
      const indentLevel = Math.floor(spaces.length / 2);
      
      // Start a new list or continue the current one
      inList = true;
      listType = 'bullet';
      listIndentLevel = indentLevel;
      
      // Insert with the right indentation
      quill.insertText(currentIndex, content + '\n', { 
        list: 'bullet',
        indent: indentLevel
      });
      currentIndex += content.length + 1;
      continue;
    }
    
    // Process numbered lists with indentation
    const numberedMatch = line.match(/^(\s*)(\d+)\.?\s+(.+)$/);
    if (numberedMatch) {
      console.log('Processing numbered list:', line, numberedMatch);
      const [_, spaces, number, content] = numberedMatch;
      
      // Calculate indent level - properly counting spaces
      // Each indent level should be 2 spaces
      const indentLevel = Math.floor(spaces.length / 2);
      
      // Start a new list or continue the current one
      inList = true;
      listType = 'ordered';
      listIndentLevel = indentLevel;
      
      // Insert with the right indentation
      quill.insertText(currentIndex, content + '\n', { 
        list: 'ordered',
        indent: indentLevel
      });
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
    
    // Process indented code blocks
    if (line.startsWith('    ') || line.startsWith('\t')) {
      console.log('Processing indented code:', line);
      const content = line.startsWith('    ') ? line.substring(4) : line.substring(1);
      quill.insertText(currentIndex, content + '\n', { 'code-block': true });
      currentIndex += content.length + 1;
      continue;
    }
    
    // Process horizontal rules
    if (/^[-*_]{3,}$/.test(line.trim())) {
      console.log('Processing horizontal rule:', line);
      quill.insertEmbed(currentIndex, 'hr', true, 'user');
      quill.insertText(currentIndex + 1, '\n');
      currentIndex += 2;
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
  
  // If we were still in a table at the end, insert it
  if (inTable && tableRows.length > 0) {
    insertMarkdownTable(quill, tableRows, currentIndex);
  }
  
  // Initialize the markdown module to process the content if available
  try {
    const markdownModule = quill.getModule('markdown');
    if (markdownModule) {
      console.log('Triggering markdown processing on initial content');
      
      // Make sure markdown is enabled
      if (markdownModule.options) {
        markdownModule.options.enabled = true;
      }
      
      // Call the process method if available
      if (typeof markdownModule.process === 'function') {
        markdownModule.process();
      }
      
      // Call onTextChange if available
      if (markdownModule.activity && typeof markdownModule.activity.onTextChange === 'function') {
        markdownModule.activity.onTextChange();
      }
    } else {
      console.log('No markdown module found for initial processing');
    }
  } catch (err) {
    console.error('Error triggering markdown processing:', err);
  }
};

// Helper to insert a markdown table into the Quill editor
const insertMarkdownTable = (quill: any, rows: string[][], index: number) => {
  // We'll insert the table as a properly formatted text block
  // This creates a visual table representation
  if (!rows.length) return index;
  
  console.log('Inserting table with rows:', rows);
  
  // Calculate column widths based on content
  const columnCount = Math.max(...rows.map(row => row.length));
  const columnWidths: number[] = [];
  
  // Initialize column widths
  for (let col = 0; col < columnCount; col++) {
    const cellsInColumn = rows.map(row => row[col] || '');
    const maxWidth = Math.max(...cellsInColumn.map(cell => cell.length));
    columnWidths[col] = Math.max(3, maxWidth + 2); // Min width of 3 chars
  }
  
  // Build the table as text
  let tableText = '';
  
  // Add header row
  if (rows.length > 0) {
    tableText += '| ';
    for (let col = 0; col < columnCount; col++) {
      const cell = rows[0][col] || '';
      const padding = columnWidths[col] - cell.length;
      tableText += cell + ' '.repeat(padding) + '| ';
    }
    tableText += '\n';
    
    // Add separator row
    tableText += '|';
    for (let col = 0; col < columnCount; col++) {
      tableText += '-'.repeat(columnWidths[col] + 2) + '|';
    }
    tableText += '\n';
    
    // Add data rows
    for (let row = 1; row < rows.length; row++) {
      tableText += '| ';
      for (let col = 0; col < columnCount; col++) {
        const cell = rows[row][col] || '';
        const padding = columnWidths[col] - cell.length;
        tableText += cell + ' '.repeat(padding) + '| ';
      }
      tableText += '\n';
    }
  }
  
  // Insert the table text as-is, relying on the markdown module to format it
  quill.insertText(index, tableText, 'user');
  
  return index + tableText.length;
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