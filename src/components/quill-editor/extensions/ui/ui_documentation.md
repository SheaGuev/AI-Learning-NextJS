# Quill Editor Extensions: UI Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/ui/` directory. These components seem to be duplicates or re-exports of components found directly under `src/components/quill-editor/extensions/`.

## `ai-prompt-dialog.tsx`

This file defines the `AIPromptDialog` React component. *(Note: This appears functionally identical to the file at `src/components/quill-editor/extensions/ai-prompt-dialog.tsx`)*

*   **`TextLengthOption` Type:** Defines possible text length options ('short', 'medium', 'long', 'verylong', 'custom').
*   **`TextLengthConfig` Interface:** Defines the structure for text length options, including value, label, and description.
*   **`TEXT_LENGTH_OPTIONS` Constant:** An array of `TextLengthConfig` objects defining the available text length choices.
*   **`AIPromptDialogProps` Interface:** Defines the props for the `AIPromptDialog` component:
    *   `onSubmit`: A function called when the user submits the prompt. It receives the prompt text, selected length, and optional PDF text.
    *   `onCancel`: A function called when the dialog is closed or cancelled.
    *   `isOpen`: A boolean indicating whether the dialog should be open.
*   **`AIPromptDialog` Component:**
    *   Manages state for the prompt input, selected text length, PDF upload status, extracted PDF text, and submission status.
    *   Uses `useRef` for input elements (text area, file input).
    *   Uses `useEffect` to focus the input when the dialog opens and reset state when it closes.
    *   `handleSubmit`: Handles form submission. Prevents empty prompts, enhances the prompt with instructions to avoid markdown code blocks, calls the `onSubmit` prop, and handles potential errors.
    *   `handleCancel`: Calls the `onCancel` prop.
    *   `handlePdfUpload`: Handles the file input change event for PDF uploads. Uses the `usePDFExtractor` hook to extract text from the selected PDF. Displays toasts for success or errors. Sets the extracted text into the prompt state.
    *   `handlePdfUploadClick`: Triggers the hidden file input when the "Upload PDF" button is clicked.
    *   Renders a dialog overlay with a form containing:
        *   A text area for the user prompt.
        *   An "Upload PDF" button and hidden file input.
        *   A display area for PDF processing status.
        *   Radio buttons for selecting the desired text length.
        *   "Cancel" and "Generate" buttons.

## `api-key-dialog.tsx`

This file defines the `APIKeyDialog` React component. *(Note: This appears functionally identical to the file at `src/components/quill-editor/extensions/api-key-dialog.tsx`)*

*   **`APIKeyDialogProps` Interface:** Defines the props for the `APIKeyDialog` component:
    *   `onSubmit`: A function called when the user submits the API key. It receives the entered API key.
    *   `onCancel`: A function called when the dialog is closed or cancelled.
    *   `isOpen`: A boolean indicating whether the dialog should be open.
*   **`APIKeyDialog` Component:**
    *   Manages state for the API key input.
    *   Uses `useRef` for the input element.
    *   Uses `useEffect` to focus the input when the dialog opens.
    *   `handleSubmit`: Handles form submission and calls the `onSubmit` prop with the entered API key.
    *   Renders a dialog overlay with a form containing:
        *   Informational text explaining the need for a Gemini API key and a link to obtain one.
        *   A password input field for the API key.
        *   Text indicating the key is stored locally.
        *   "Cancel" and "Save API Key" buttons.

## `index.ts`

This file acts as a barrel file for the UI components within this directory.

*   Exports the default export `AIPromptDialog` from `./ai-prompt-dialog`.
*   Re-exports all named exports from `./ai-prompt-dialog`.
*   Exports the default export `APIKeyDialog` from `./api-key-dialog`.
