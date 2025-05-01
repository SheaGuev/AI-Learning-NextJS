# Quill Editor Extensions: Commands Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/commands/` directory.

## `slash-commands.ts`

This file acts as a re-exporter for slash command related functionality located in the sibling `slash-commands/` directory.

*   **Default Export:** Re-exports the default export from `../slash-commands/SlashCommands` (presumably the main module or class for handling slash commands).
*   **Named Exports:**
    *   Re-exports all exports from `../slash-commands/interfaces` (likely containing TypeScript interfaces related to slash commands).
    *   Re-exports the `PdfProcessor` class/module from `../slash-commands/pdf-processing/PdfProcessor`.

This structure suggests that the core implementation of slash commands resides in the `../slash-commands/` directory, and this file provides a simplified access point from within the `commands` folder, possibly for organizational purposes or future refactoring.
