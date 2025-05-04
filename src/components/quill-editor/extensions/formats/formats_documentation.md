# Quill Editor Extensions: Formats Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/formats/` directory.

## `markdown-table.ts`

This file implements functionality to detect and format Markdown tables within the Quill editor.

*   **`registerMarkdownTable(Quill)` Function:**
    *   Registers a custom Quill `BlockEmbed` blot named `markdown-table`.
    *   **`TableBlot` Class (extends `BlockEmbed`):**
        *   `create(value)`: Creates the DOM structure for the table. It takes an object `{ header: string[], rows: string[][] }` and generates a `<div>` containing a standard HTML `<table>` with `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` elements, applying basic styling.
        *   `value(node)`: Extracts the table data (header and rows) from the DOM node back into the `{ header: [], rows: [] }` format.
*   **`parseMarkdownTable(text)` Function:**
    *   A helper function designed to parse a block of text representing a Markdown table.
    *   It splits the text into lines, checks for the basic structure (header row with `|`, separator row with `|` and `-`).
    *   Extracts header cells and data rows, trimming whitespace and pipe characters.
    *   Returns a `{ header: string[], rows: string[][] }` object or `null` if parsing fails.
*   **`MarkdownTable` Class (Default Export):**
    *   A Quill module intended to automatically detect and format Markdown tables typed by the user.
    *   `constructor(quill, options)`: Initializes the module, registers the `TableBlot`, and listens for `text-change` events.
    *   `textChangeHandler(...)`: A debounced event handler that triggers table detection when the user types, specifically looking for pipe (`|`) characters.
    *   `detectAndRenderTables()`: The core logic for finding potential Markdown tables in the editor content.
        *   It iterates through lines looking for the header/separator pattern.
        *   Extracts the potential table text block.
        *   Includes checks to prevent re-processing already handled tables or malformed/runaway tables (e.g., excessive pipe characters).
        *   Calls `parseMarkdownTable` to validate and structure the data.
        *   If a valid table is found, it calculates the text range of the Markdown source.
        *   **Note:** The current implementation deletes the original Markdown text and then inserts a *reformatted Markdown text version* of the table using `formatTableAsText`, rather than inserting the `TableBlot` embed as might be expected. It uses `quill.insertText(..., 'api')`.
    *   `formatTableAsText(tableData)`: Takes the parsed table data and reconstructs a consistently formatted Markdown table string.
    *   `findLineIndex(text, lineNumber)`: A utility to find the character index in the full text that corresponds to the start of a given line number.
