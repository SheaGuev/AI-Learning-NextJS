# Quill Editor Extensions: Utils Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/utils/` directory.

## `markdown-helpers.ts`

This file provides helper functions related to Markdown processing within the Quill editor.

*   **`withDisabledMarkdown(quill, callback)` Function:**
    *   Takes a Quill instance and a callback function as arguments.
    *   Attempts to get the 'markdown' module from the Quill instance.
    *   If the module exists and has a `disable` method, it calls `disable()`.
    *   Executes the provided `callback` function within a `try...finally` block.
    *   In the `finally` block, if the markdown module was found and has an `enable` method, it calls `enable()`.
    *   This utility is crucial for programmatically inserting or manipulating content that might contain Markdown syntax (like in custom blots or command handlers) without triggering Quill's automatic Markdown conversion during the process.

## `index.ts`

This file acts as a barrel file for the `utils` directory.

*   It re-exports all named exports from `./markdown-helpers.ts` (currently just `withDisabledMarkdown`).
