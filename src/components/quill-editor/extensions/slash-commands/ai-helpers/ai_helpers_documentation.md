# Quill Editor Extensions: Slash Commands / AI Helpers Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/slash-commands/ai-helpers/` directory.

## `ContentFormatter.ts`

This file defines the `ContentFormatter` class, which contains static utility methods for interacting with AI services to format and generate content within the Quill editor, particularly in the context of PDF processing.

*   **Imports:** 
    *   Imports `OverlayManager` from `../ui/OverlayManager`.
    *   Imports `MARKDOWN_FORMATTING_INSTRUCTIONS` from `@/lib/utils/markdown-constants`.
*   **`ContentFormatter` Class:**
    *   **`formatContentWithAI(quill, content, heading)` (async):**
        *   Takes a Quill instance, content string, and heading string.
        *   Temporarily disables the Quill 'markdown' module to prevent interference.
        *   Dispatches a custom event `ai-format-pdf-content` with the content, heading, and the centralized MARKDOWN_FORMATTING_INSTRUCTIONS.
        *   Listens for a one-time `ai-formatted-pdf-content-response` event.
        *   Handles potential user cancellation via `OverlayManager.isOperationAborted()`.
        *   Re-enables the markdown module (if it was originally enabled).
        *   Returns a Promise that resolves with the AI-formatted content or rejects on error/cancellation.
    *   **`generateTitleAndSummary(quill, content)` (async):**
        *   Takes a Quill instance and content string.
        *   Dispatches a custom event `ai-generate-section-summary` with the content.
        *   Listens for a one-time `ai-section-summary-response` event with a 30-second timeout.
        *   Returns a Promise that resolves with an object containing `{ heading: string, summary: string }` received from the AI.
        *   Includes a fallback mechanism: If the AI call fails or times out, it generates a basic heading (first 8 words) and summary (first 2 sentences) directly from the input content.
    *   **`safeInsertText(quill, index, text)`:**
        *   Takes a Quill instance, an insertion index, and the text to insert.
        *   Temporarily disables the Quill 'markdown' module.
        *   Performs the insertion (`quill.insertText`) within a `setTimeout` (100ms delay) to allow the DOM to settle.
        *   Includes checks for editor validity and adjusts the insertion index if it's out of bounds.
        *   Preserves the original selection, inserts text, focuses the editor, and sets the selection after the inserted text.
        *   Re-enables the markdown module (if originally enabled).
        *   Includes error handling with a fallback insertion method if the initial attempt fails.
        *   Returns a Promise that resolves when insertion is complete or rejects on error.
        *   **Note:** Comments indicate that explicit Markdown processing calls are *not* made here, relying instead on a listener likely set up elsewhere (`use-editor-setup`).
