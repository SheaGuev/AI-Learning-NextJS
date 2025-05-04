# Quill Editor Extensions: Slash Commands / PDF Processing Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/slash-commands/pdf-processing/` directory.

## `PdfProcessor.ts`

This file defines the `PdfProcessor` class, containing static methods to handle the workflow of uploading, extracting text from, and processing PDF files within the Quill editor.

*   **Imports:** `ContentFormatter`, `ProcessedSection`, `OverlayControls`, `OverlayManager`, `SectionsDialog`, `extractFullTextFromFile`.
*   **Constants:** `API_CALL_DELAY` (1000ms).
*   **`PdfProcessor` Class:**
    *   **`initializeEventListeners()` (static):**
        *   Sets up event listeners for various stages of PDF processing, primarily acting as a central hub for events dispatched from the UI (like `SectionsDialog`) and events related to AI processing (like `ai-generate-section-summary`).
        *   Listens for `pdf-process-section`: Handles the sequential processing of individual sections. It adds a delay, updates loading indicators, dispatches `ai-generate-section-summary` (handled elsewhere, likely `use-event-handlers.ts`), listens for the `ai-section-summary-response`, updates the section UI with the heading/summary, and includes a fallback if AI fails.
        *   Listens for `pdf-insert-final-content`: Calls `insertSectionContent` to insert the final, potentially AI-formatted, content.
        *   Listens for `pdf-insert-content`: Calls `insertSectionContent` to insert plain section content.
        *   Contains commented-out listeners for deprecated events (`pdf-process-sections`, `pdf-insert-enhanced`, `pdf-insert-sections`), suggesting a refactoring towards event-driven communication with `use-event-handlers.ts`.
    *   **`handlePdfUpload(quill, range)` (static):**
        *   The entry point triggered by the "Upload PDF" slash command.
        *   Creates a hidden file input, triggers it, and listens for file selection.
        *   Shows a loading overlay.
        *   Calls `PdfProcessor.processPdf` to handle the selected file.
        *   Shows error toasts on failure.
        *   Cleans up the loading overlay and file input.
    *   **`processPdf(quill, file, range)` (static, async):**
        *   Calls `extractFullTextFromFile` (from `use-pdf-extractor` hook) to get the PDF text.
        *   Splits the text into sections based on double newlines, aiming for around 2000 words per section.
        *   Shows a warning toast if the PDF results in many sections (>10).
        *   Calls `SectionsDialog.showSectionsDialog` to display the sections to the user.
        *   Includes error handling and displays a custom error dialog on failure.
    *   **`insertSectionContent(quill, content, range)` (static, async):**
        *   Closes the `SectionsDialog`.
        *   Clears any processing overlays.
        *   Calls `ContentFormatter.safeInsertText` to insert the provided content into the editor at the specified range.
        *   Includes a basic fallback insertion if `safeInsertText` fails.
    *   **`insertSectionWithSummary(...)` (static, async):**
        *   Marked as deprecated. The logic for inserting content with summaries is now expected to be handled by listeners for the `pdf-insert-with-summary` event (likely in `use-event-handlers.ts`). Contains a basic fallback.
    *   **`closeSectionsDialog()` (private, static):**
        *   Utility to find and remove the sections dialog and its overlay from the DOM.
    *   **`cleanJsonText(text)` (private, static):**
        *   Utility to extract valid JSON from a string that might contain Markdown code blocks or other formatting noise.
    *   **`isValidJson(text)` (private, static):**
        *   Utility to check if a string is valid JSON using `JSON.parse`.

## `SectionsDialog.ts`

This file defines the `SectionsDialog` class, responsible for creating and managing the UI dialog that displays extracted PDF sections, allows users to select sections, triggers AI summarization, and handles insertion requests.

*   **Imports:** `Dialog`, `ProcessedSection` interfaces.
*   **Global Augmentation:** Declares `window.geminiModel` (though seemingly unused within this specific file).
*   **`SectionsDialog` Class:**
    *   **Static Properties:**
        *   `dialog`: Holds the reference to the currently open dialog (`Dialog` interface).
        *   `processingQueue`: Array to hold `ProcessedSection` objects waiting for AI summarization.
        *   `isProcessing`: Boolean flag indicating if the queue is currently being processed.
        *   `processingDelay`: Delay between processing sections (1000ms).
        *   `maxConcurrentProcessing`: Set to 1 (sequential processing).
    *   **Static Initializer Block:**
        *   Adds a document event listener for `show-sections-dialog` which calls `SectionsDialog.showSectionsDialog`.
    *   **`showSectionsDialog(quill, sections, range)` (static):**
        *   The main method to create and display the dialog.
        *   Creates the dialog DOM structure (header, controls bar, sections container, overlay).
        *   **Controls Bar:** Includes a "Select All" checkbox, a status indicator (`#pdf-processing-status`), and an "Insert Selected" button.
        *   **Sections Container:** Iterates through the raw text `sections` array:
            *   Creates a card (`pdf-section-card`) for each section.
            *   Adds a header with a checkbox, section number, and loading indicator.
            *   Adds a content container with a preview of the text and a fade effect.
            *   Adds an "Insert Section" button (initially disabled).
            *   Creates a `ProcessedSection` object holding references to the DOM elements and section data, pushing it to the `processedSections` array.
        *   Adds event listeners:
            *   `selectAllCheckbox`: Toggles selection state for all sections and updates the "Insert Selected" button.
            *   `insertAllBtn`: Filters selected sections, dispatches `pdf-insert-formatted-combined` event (handled elsewhere, likely `use-event-handlers.ts`), and closes the dialog.
        *   Initializes the `processingQueue` with all `processedSections`.
        *   Starts the sequential processing by calling `processNextSection` after a short delay.
        *   Stores the dialog reference in the static `dialog` property.
        *   Adds a document click listener (`handleOutsideClick`) to close the dialog.
    *   **`processNextSection(quill, range)` (static):**
        *   Processes the `processingQueue` sequentially.
        *   Updates the status indicator.
        *   Takes the next `section` from the queue.
        *   Dispatches the `pdf-process-section` event (handled by `PdfProcessor.initializeEventListeners`) with the section data and an `onComplete` callback.
        *   The `onComplete` callback (executed after AI summarization finishes in `PdfProcessor`):
            *   Enables the section's "Insert Section" button.
            *   Attaches a click handler to the button that dispatches `pdf-insert-with-summary` (handled elsewhere) and closes the dialog.
            *   Adds a change listener to the section's checkbox to update its `selected` state and manage the "Select All" / "Insert Selected" button states.
            *   Schedules the next call to `processNextSection` after `processingDelay`.
    *   **`handleOutsideClick(event)` (static):**
        *   Closes the dialog if a click occurs outside its container, but *only* if there isn't an active processing overlay (`.quill-processing-overlay`).
    *   **`closeSectionsDialog()` (static):**
        *   Hides/removes the dialog and overlay using the stored `dialog` reference or by querying the DOM as a fallback.
        *   Removes the `handleOutsideClick` listener.
