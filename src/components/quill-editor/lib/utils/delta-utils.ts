// Define a simple type for Delta operations for clarity
export type QuillOp = { insert?: string | object; attributes?: any; retain?: number; delete?: number };

// Helper function to convert AI-generated Markdown to Quill Delta
export const aiMarkdownToDelta = (markdown: string, quillInstance: any): any /* Quill.Delta */ => {
  // Ensure quillInstance and its necessary methods are available
  if (!quillInstance || typeof quillInstance.constructor !== 'function' || typeof quillInstance.constructor.import !== 'function') {
    console.error('aiMarkdownToDelta: Invalid Quill instance provided, or Delta constructor not found.');
    // Fallback: return a Delta that inserts the markdown as a single line of plain text
    // This requires that we can somehow get a Delta constructor. If not, this util is unusable.
    // For now, we assume if this path is hit, something is very wrong upstream.
    // A robust solution might involve a globally available Delta constructor.
    const Delta = require('quill-delta'); // This is a fallback, ideally Delta comes from Quill or is passed in.
    return new Delta().insert(markdown + ' (Error: Could not parse Markdown properly)\n');
  }

  const Delta = quillInstance.constructor.import('delta');
  if (!Delta) {
    console.error('aiMarkdownToDelta: Failed to import Delta constructor from Quill instance.');
    const FallbackDelta = require('quill-delta');
    return new FallbackDelta().insert(markdown + ' (Error: Could not get Delta constructor)\n');
  }

  const delta = new Delta();
  const lines = markdown.split('\n');

  for (const line of lines) {
      const listItemMatch = line.match(/^(\s*)([*-])\s+(.*)/);
      const orderedListItemMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
      const standaloneCheckboxMatch = line.match(/^(\s*)\[(x|X| )?\](\s*)(.*)/);

      if (listItemMatch) {
          const leadingSpaces = listItemMatch[1].length;
          let content = listItemMatch[3]; // Full content after marker and space
          // const marker = listItemMatch[2]; // '*' or '-'

          let indentLevel = Math.floor(leadingSpaces / 4);
          indentLevel = Math.min(indentLevel, 3); 

          const attributes: { list: string, indent?: number } = { list: 'bullet' };
          if (indentLevel > 0) { 
              attributes.indent = indentLevel;
          }

          // Check for checkbox markdown: e.g., "[ ] task" or "[x] task"
          const checkboxMatch = content.match(/^\s*\[( |x|X)\]\s+(.*)/);
          if (checkboxMatch) {
              attributes.list = (checkboxMatch[1].toLowerCase() === 'x') ? 'checked' : 'unchecked';
              content = checkboxMatch[2]; // The actual text content after '[x] '
          }
          
          delta.insert(content + '\n', attributes);
          continue;
      } else if (orderedListItemMatch) {
          const leadingSpaces = orderedListItemMatch[1].length;
          let content = orderedListItemMatch[3]; // Full content after number, dot, and space
          // const number = orderedListItemMatch[2]; // The number itself

          let indentLevel = Math.floor(leadingSpaces / 4);
          indentLevel = Math.min(indentLevel, 3); 

          const attributes: { list: string, indent?: number } = { list: 'ordered' };
          if (indentLevel > 0) { 
              attributes.indent = indentLevel;
          }

          // Check for checkbox markdown within an ordered list item
          const checkboxMatch = content.match(/^\s*\[( |x|X)\]\s+(.*)/);
          if (checkboxMatch) {
              // If it's a checkbox, Quill typically treats it as a separate list type for formatting
              attributes.list = (checkboxMatch[1].toLowerCase() === 'x') ? 'checked' : 'unchecked';
              content = checkboxMatch[2]; 
          }

          delta.insert(content + '\n', attributes);
          continue;
      } else if (standaloneCheckboxMatch) {
          const leadingSpacesString = standaloneCheckboxMatch[1];
          const marker = standaloneCheckboxMatch[2]; // 'x', 'X', ' ', or undefined
          // Group 3 is standaloneCheckboxMatch[3] (optional spaces after ']')
          const content = standaloneCheckboxMatch[4]; // Actual text content is now group 4

          let indentLevel = Math.floor(leadingSpacesString.length / 4);
          indentLevel = Math.min(indentLevel, 3); 

          const attributes: { list: string, indent?: number } = {
              // Handle undefined marker (for '[]') as unchecked
              list: (marker && marker.trim().toLowerCase() === 'x') ? 'checked' : 'unchecked'
          };
          if (indentLevel > 0) { 
              attributes.indent = indentLevel;
          }
          delta.insert(content + '\n', attributes);
          continue;
      }

      if (line.startsWith('# ')) { delta.insert(line.substring(2) + '\n', { header: 1 }); continue; }
      if (line.startsWith('## ')) { delta.insert(line.substring(3) + '\n', { header: 2 }); continue; }
      if (line.startsWith('### ')) { delta.insert(line.substring(4) + '\n', { header: 3 }); continue; }
      if (line.startsWith('> ')) { delta.insert(line.substring(2) + '\n', { blockquote: true }); continue; }
      if (line.match(/^((-{3,})|(\*{3,})|(_{3,}))$/)) { 
        delta.insert({ hr: true }); 
        delta.insert('\n'); 
        continue;
      }

      if (line.trim() === '') {
          const ops = delta.ops as QuillOp[];
          if (ops.length > 0 && ops[ops.length - 1].insert === '\n') {
              if (!(ops.length > 1 && ops[ops.length - 2].insert === '\n' && ops[ops.length - 1].insert === '\n')) {
                  delta.insert('\n');
              }
          } else {
               delta.insert('\n');
          }
      } else {
          delta.insert(line + '\n');
      }
  }
  return delta;
}; 