// Module to handle Markdown tables in Quill

// Register a blot for tables
export const registerMarkdownTable = (Quill: any) => {
  const BlockEmbed = Quill.import('blots/block/embed');
  
  class TableBlot extends BlockEmbed {
    static create(value: any) {
      const node = super.create();
      node.setAttribute('class', 'quill-markdown-table');
      
      // Create table structure from value
      const table = document.createElement('table');
      table.setAttribute('border', '1');
      table.setAttribute('cellpadding', '5');
      table.setAttribute('cellspacing', '0');
      table.setAttribute('style', 'border-collapse: collapse; width: 100%;');
      
      // Add header row if present
      if (value.header && Array.isArray(value.header)) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        value.header.forEach((cell: string) => {
          const th = document.createElement('th');
          th.setAttribute('style', 'border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;');
          th.textContent = cell;
          headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
      }
      
      // Add rows
      if (value.rows && Array.isArray(value.rows)) {
        const tbody = document.createElement('tbody');
        
        value.rows.forEach((row: string[]) => {
          const tr = document.createElement('tr');
          
          row.forEach((cell: string) => {
            const td = document.createElement('td');
            td.setAttribute('style', 'border: 1px solid #ddd; padding: 8px;');
            td.textContent = cell;
            tr.appendChild(td);
          });
          
          tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
      }
      
      node.appendChild(table);
      return node;
    }
    
    static value(node: HTMLElement) {
      const table = node.querySelector('table');
      if (!table) return { header: [], rows: [] };
      
      // Extract header cells
      const headerCells = Array.from(table.querySelectorAll('th')).map(th => th.textContent || '');
      
      // Extract rows (skip header row)
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.textContent || '');
      });
      
      return {
        header: headerCells,
        rows: rows
      };
    }
  }
  
  TableBlot.blotName = 'markdown-table';
  TableBlot.tagName = 'div';
  
  Quill.register(TableBlot);
  return TableBlot; // Return the class for reference
};

// Table parsing helper functions
export const parseMarkdownTable = (text: string): { header: string[], rows: string[][] } | null => {
  // Split text into lines
  const lines = text.trim().split('\n');
  if (lines.length < 3) return null;
  
  // Check if this looks like a markdown table
  // We need at least a header, separator, and one data row
  if (!lines[0].includes('|') || !lines[1].includes('|') || !lines[1].includes('-')) {
    return null;
  }
  
  // Parse header row
  const headerCells = lines[0]
    .split('|')
    .filter(cell => cell.trim() !== '')
    .map(cell => cell.trim());
  
  // Skip separator row (line 1)
  
  // Parse data rows
  const rows = lines.slice(2)
    .filter(line => line.includes('|'))
    .map(line => 
      line.split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim())
    );
  
  return {
    header: headerCells,
    rows: rows
  };
};

// Custom Quill module for table support
export default class MarkdownTable {
  quill: any;
  options: any;
  timeout: any;
  TableBlot: any;
  processedTables: Set<string>; // Track tables we've already processed
  
  constructor(quill: any, options = {}) {
    this.quill = quill;
    this.options = options;
    this.timeout = null;
    this.processedTables = new Set();
    
    // Immediately register the TableBlot with the current Quill instance
    this.TableBlot = registerMarkdownTable(quill.constructor);
    
    // Register for text-change events
    this.quill.on('text-change', this.textChangeHandler.bind(this));
  }
  
  textChangeHandler(delta: any, oldDelta: any, source: string) {
    if (source !== 'user') return;
    
    // Debounce to avoid excessive processing
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.detectAndRenderTables();
    }, 300);
  }
  
  detectAndRenderTables() {
    try {
      const text = this.quill.getText();
      const lines = text.split('\n');
      
      // Reset the processed tables cache on each full detection run
      this.processedTables = new Set();
      
      // Look for table patterns (a line with | followed by a line with --- and |)
      for (let i = 0; i < lines.length - 2; i++) {
        if (lines[i].includes('|') && 
            lines[i+1].includes('|') && 
            lines[i+1].includes('-')) {
          
          // Find the end of the table
          let endLine = i + 2;
          while (endLine < lines.length && lines[endLine].includes('|')) {
            endLine++;
          }
          
          // Extract the table text
          const tableText = lines.slice(i, endLine).join('\n');
          
          // Skip this table if we've already processed it in this run
          // This prevents processing the same table multiple times
          const tableHash = `${i}:${endLine}:${tableText.length}`;
          if (this.processedTables.has(tableHash)) {
            continue;
          }
          this.processedTables.add(tableHash);
          
          // Check if this is already a well-formatted table
          // If it has the exact number of cells in each row, it's probably
          // already been processed
          const tableLines = tableText.split('\n');
          const cellCounts = tableLines.map((line: string) => 
            line.split('|').filter((cell: string) => cell.trim() !== '').length
          );
          
          // If all rows have the same number of cells, this is likely already formatted
          const isConsistentFormat = cellCounts.every((count: number) => count === cellCounts[0]);
          
          // Skip if it's already well-formatted and has more than one data row
          if (isConsistentFormat && tableLines.length > 3) {
            i = endLine - 1; // Skip to the end of this table
            continue;
          }
          
          // Try to parse the table
          const tableData = parseMarkdownTable(tableText);
          if (tableData) {
            // Find the position in the document
            const startIndex = this.findLineIndex(text, i);
            const endIndex = this.findLineIndex(text, endLine);
            
            // Ensure the table blot is registered
            if (!this.TableBlot) {
              console.error('Table blot not registered, attempting to register now');
              this.TableBlot = registerMarkdownTable(this.quill.constructor);
            }
            
            console.log('Inserting table at index', startIndex, 'with data', tableData);
            
            // Delete the original text and insert the table embed
            this.quill.deleteText(startIndex, endIndex - startIndex);
            
            // Insert as text for now as a fallback if embed doesn't work
            const formattedTable = this.formatTableAsText(tableData);
            this.quill.insertText(startIndex, formattedTable, 'api');
            
            // Skip ahead since we've processed these lines
            i = endLine;
          }
        }
      }
    } catch (error) {
      console.error('Error in detectAndRenderTables:', error);
    }
  }
  
  formatTableAsText(tableData: { header: string[], rows: string[][] }): string {
    const { header, rows } = tableData;
    
    // Calculate column widths for better formatting
    const columnCount = Math.max(
      header.length,
      ...rows.map(row => row.length)
    );
    
    // Ensure all rows have the same number of columns
    const normalizedHeader = [...header];
    while (normalizedHeader.length < columnCount) {
      normalizedHeader.push('');
    }
    
    const normalizedRows = rows.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < columnCount) {
        normalizedRow.push('');
      }
      return normalizedRow;
    });
    
    // Create header row
    let tableText = '| ' + normalizedHeader.join(' | ') + ' |\n';
    
    // Create separator row
    tableText += '| ' + normalizedHeader.map(() => '---').join(' | ') + ' |\n';
    
    // Create data rows
    normalizedRows.forEach(row => {
      tableText += '| ' + row.join(' | ') + ' |\n';
    });
    
    return tableText;
  }
  
  findLineIndex(text: string, lineNumber: number): number {
    let index = 0;
    let currentLine = 0;
    
    while (currentLine < lineNumber && index < text.length) {
      if (text[index] === '\n') {
        currentLine++;
      }
      index++;
    }
    
    return index;
  }
}; 