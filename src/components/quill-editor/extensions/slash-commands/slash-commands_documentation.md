# Quill Editor Extensions: Slash Commands Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/slash-commands/` directory.

## `index.ts`

This file serves as the main entry point and barrel file for the `slash-commands` functionality.

*   **Default Export:** Exports the `SlashCommands` class from `./SlashCommands`.
*   **Named Exports:**
    *   Re-exports all exports from `./interfaces`.
    *   Re-exports `PdfProcessor` from `./pdf-processing/PdfProcessor`.
    *   Re-exports `SectionsDialog` (default export) from `./pdf-processing/SectionsDialog`.
    *   Re-exports `MenuBuilder` from `./ui/MenuBuilder`.
    *   Re-exports `OverlayManager` from `./ui/OverlayManager`.
    *   Re-exports `ContentFormatter` from `./ai-helpers/ContentFormatter`.

## `interfaces.ts`

This file defines shared TypeScript interfaces used within the slash commands module.

*   **`CommandOption` Interface:** Defines the structure for a slash command option, including `label`, optional `icon`, `description`, `className`, and the `handler` function to execute.
*   **`ProcessedSection` Interface:** Defines the structure for representing a processed section from a PDF, including references to its DOM elements (container, loading indicator, buttons, checkbox), content, heading, summary, and selected state.
*   **`OverlayControls` Interface:** Defines methods (`update`, `close`) for controlling a processing overlay UI element.
*   **`Dialog` Interface:** Defines the structure for a dialog, including its `containerEl` and a `hide` method.
*   **Global `Window` Interface Augmentation:** Adds type definitions for `window.pdfjsLib` to ensure TypeScript recognizes the PDF.js library if loaded globally.

## `SlashCommands.ts`

This file contains the main logic for the Quill slash commands module.

*   **`SlashCommands` Class:**
    *   `constructor(quill, options)`:
        *   Initializes the module with the Quill instance and options (including the list of commands).
        *   Creates the main container element (`ql-slash-commands`) for the command menu and appends it to the Quill container.
        *   Calls `initializeEvents`.
    *   `initializeEvents()`:
        *   Adds event listeners for:
            *   `keydown` on the Quill root: Detects the `/` key press directly to reliably trigger the menu, preventing default behavior and inserting the slash manually.
            *   `text-change`: Detects `/` typed by the user to open the menu (`openMenu`) or filters the menu (`filterMenu`) if already open based on text after the slash.
            *   `selection-change`: Closes the menu if the selection is lost or moves to a new line.
            *   `click` on the document: Closes the menu if the click is outside the menu and the editor. Also includes logic to potentially cancel long-running PDF processing overlays on outside clicks.
        *   Adds Quill keyboard bindings for:
            *   Arrow Up/Down (`handleArrowUp`/`handleArrowDown`): Navigates the command menu items.
            *   Enter (`handleEnter`): Executes the selected command or the first visible command.
            *   Escape (`handleEscape`): Closes the command menu.
    *   `openMenu(selection)`:
        *   Sets `isOpen` to true.
        *   Calculates the position of the menu based on the caret's bounds (`quill.getBounds`).
        *   Adjusts the position to ensure the menu stays within the viewport.
        *   Calls `populateMenu`.
        *   Makes the container visible with styling and animation.
    *   `populateMenu()`:
        *   Uses the `MenuBuilder.buildCommandMenu` utility to create the list of command items inside the container, attaching the `executeCommand` handler.
    *   `filterMenu(query)`:
        *   Uses the `MenuBuilder.filterMenu` utility to show/hide command items based on the query.
        *   Closes the menu if no items match.
    *   `executeCommand(command)`:
        *   Gets the current selection (with fallbacks if null).
        *   Finds the `/` character preceding the selection.
        *   Deletes the typed slash command text (e.g., `/heading1`).
        *   Updates the selection to the position where the command text was.
        *   Calls the command's `handler` function with the Quill instance and the updated range.
        *   Includes special handling for the 'Upload PDF' command, calling `PdfProcessor.handlePdfUpload`.
        *   Includes extensive logging, especially for AI-related commands.
        *   Applies basic Quill formats (header, list, blockquote, code-block) based on command label after execution.
        *   Ensures the editor retains focus after execution.
        *   Closes the menu.
    *   `handleArrowUp()`, `handleArrowDown()`, `handleEnter()`, `handleEscape()`: Implement the keyboard navigation and execution logic for the menu, preventing default browser/editor behavior when the menu is active.
    *   `closeMenu()`: Hides the container and sets `isOpen` to false.
    *   `destroy()`: Cleans up by closing dialogs/overlays, closing the menu, and removing the container element.

---
*Note: This documentation does not cover the contents of subdirectories (`ai-helpers/`, `pdf-processing/`, `ui/`) within the `slash-commands` folder. Further iteration is needed for those.*
