# Quill Editor Extensions: Slash Commands / UI Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/slash-commands/ui/` directory.

## `MenuBuilder.ts`

This file defines the `MenuBuilder` class, a static utility for creating and managing the slash command menu UI.

*   **Imports:** `CommandOption` interface.
*   **`MenuBuilder` Class:**
    *   **`buildCommandMenu(container, commands, executeCommand)` (static):**
        *   Takes the menu container element, an array of `CommandOption` objects, and the `executeCommand` callback function.
        *   Clears the container's existing content.
        *   **PDF Upload Command:** Checks if an "Upload PDF" command exists in the provided `commands`. If not, it *prepends* a default "Upload PDF" command object to the `commands` array. This default object includes an SVG icon, description, and a placeholder handler (the actual handler is expected to be attached by the `SlashCommands` class).
        *   Iterates through the `commands` array:
            *   Creates a menu item `div` (`ql-slash-command-item`) for each command.
            *   Adds optional custom CSS classes (`command.className`).
            *   Sets a `data-command` attribute based on the label.
            *   Adds an icon (`ql-slash-command-icon`) if provided.
            *   Adds a text container (`ql-slash-command-text`) with the label (`ql-slash-command-label`) and optional description (`ql-slash-command-description`).
            *   Attaches a `click` event listener to the item that prevents default behavior, stops propagation, and calls the provided `executeCommand` callback with the corresponding command object, wrapped in a try-catch block.
            *   Appends the item to the container.
    *   **`filterMenu(container, query)` (static):**
        *   Takes the menu container element and a search query string.
        *   Iterates through all menu items (`ql-slash-command-item`).
        *   Shows items whose label includes the query (case-insensitive) and hides others by setting their `display` style.
        *   Returns `true` if any items are visible after filtering, `false` otherwise.

## `OverlayManager.ts`

This file defines the `OverlayManager` class, a static utility for managing loading/processing overlays shown during potentially long-running operations (like AI processing or PDF handling).

*   **Imports:** `OverlayControls` interface.
*   **`OverlayManager` Class:**
    *   **Static Properties:**
        *   `aiOperationAborted`: A private boolean flag to track if the user has requested cancellation.
    *   **`showProcessingOverlay(message)` (static):**
        *   Creates and displays a full-screen overlay (`pdf-processing-overlay`, `quill-processing-overlay`).
        *   Sets a `data-start-time` attribute on the overlay.
        *   Creates a central box (`pdf-processing-container`) containing:
            *   A spinner animation (`pdf-processing-spinner`).
            *   A heading ("Processing...").
            *   A message element (`pdf-processing-text`) displaying the initial `message`.
            *   A progress bar element (currently static, just visual).
            *   A "Cancel" button (`pdf-cancel-button`).
        *   The "Cancel" button's `onclick` handler sets `aiOperationAborted` to true, updates its text, disables itself, and removes the overlay after a short delay (500ms).
        *   Appends the overlay to the `document.body`.
        *   Returns an `OverlayControls` object with two methods:
            *   `update(newMessage)`: Updates the text content of the message element.
            *   `close()`: Removes the overlay from the DOM.
    *   **`clearAllProcessingOverlays(quill?)` (static):**
        *   Finds all elements with `.pdf-processing-overlay` or `.quill-processing-overlay` classes and removes them from the DOM.
        *   Resets the `aiOperationAborted` flag to `false`.
    *   **`isOperationAborted()` (static):**
        *   Returns the current value of the `aiOperationAborted` flag.
    *   **`setOperationAborted(value)` (static):**
        *   Sets the value of the `aiOperationAborted` flag.
