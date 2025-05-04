# Quill Editor Extensions: Blocks Documentation

This document provides an overview of the files within the `src/components/quill-editor/extensions/blocks/` directory.

## `checkbox-blot.ts`

This file defines a custom Quill blot for rendering and interacting with inline checkboxes.

*   **`CheckboxBlotStatic` Interface:** Defines the static properties expected for the checkbox blot object (`blotName`, `tagName`, `className`, `create`, `value`).
*   **`CheckboxBlot` Object:**
    *   `blotName`: 'checkbox'
    *   `tagName`: 'span' (to keep it inline)
    *   `className`: 'ql-checkbox'
    *   `create(value)`: Creates the DOM structure for the checkbox. It includes an outer `<span>`, an `<input type="checkbox">`, and a non-breaking space (`\u00A0`). It adds a click listener to the checkbox input itself.
    *   `value(node)`: Returns the boolean checked state of the checkbox input within the node.
*   **`registerCheckboxBlot(quillInstance)` Function:**
    *   Takes a Quill instance as input.
    *   Imports Quill's `Inline` blot.
    *   Defines a `CheckboxBlotClass` that extends `Inline`.
    *   Implements static `create`, `value`, and `formats` methods for the class, delegating to the `CheckboxBlot` object.
    *   Implements an instance `format` method to handle changes to the 'checkbox' format (updating the input's checked state).
    *   Assigns static properties (`blotName`, `tagName`, `className`) to the class.
    *   Registers the `CheckboxBlotClass` with the provided Quill instance.

## `custom-blocks.ts`

This file defines several custom block-level blots and a function to register them, along with other related blots and modules.

*   **Imports:** Imports `CheckboxBlot`, `FlashcardBlot`, `QuizBlot` from their respective files, and `SlashCommands`.
*   **`HorizontalRuleStatic` Interface:** Defines static properties for the horizontal rule blot.
*   **`CalloutBlotStatic` Interface:** Defines static properties for the callout blot.
*   **`HorizontalRule` Object:**
    *   `blotName`: 'hr'
    *   `tagName`: 'hr'
    *   `create()`: Creates an `<hr>` element with class `ql-hr`.
    *   `value()`: Returns `true` (as it's an embed with no specific value).
*   **`CalloutBlot` Object:**
    *   `blotName`: 'callout'
    *   `tagName`: 'div'
    *   `create(value)`: Creates a `<div>` structure for a callout block. It includes classes based on `value.type`, an icon element (`ql-callout-icon`), and a content container (`ql-callout-content`).
    *   `value(node)`: Extracts the `type`, `icon`, and `content` from the callout node's structure.
*   **`registerCustomBlocks(quillInstance)` Function:**
    *   Takes a Quill instance as input.
    *   Imports Quill's `BlockEmbed`.
    *   Defines `HorizontalRuleBlot` and `CalloutBlotClass` classes extending `BlockEmbed`.
    *   Assigns static properties and methods (`blotName`, `tagName`, `create`, `value`) from the corresponding objects (`HorizontalRule`, `CalloutBlot`) to these classes.
    *   Registers `HorizontalRuleBlot` and `CalloutBlotClass` with Quill.
    *   Calls `registerCheckboxBlot`, `registerFlashcardBlot`, and `registerQuizBlot` to register those blots.
    *   Registers the imported `SlashCommands` module with Quill under the name 'modules/slashCommands'.

## `flashcard-blot.ts`

This file defines a complex custom `BlockEmbed` blot for creating interactive flashcards within the Quill editor.

*   **Imports:** `withDisabledMarkdown` helper.
*   **`FlashcardBlotStatic` Interface:** Defines static properties for the flashcard blot.
*   **`FlashcardBlot` Object:**
    *   `blotName`: 'flashcard'
    *   `tagName`: 'div'
    *   `className`: 'ql-flashcard'
    *   `create(value)`: Creates the complex DOM structure for the flashcard component. This includes:
        *   A main container (`ql-flashcard`) marked `contenteditable=false`.
        *   A title section (`ql-flashcard-title-section`) with an SVG icon and "FLASHCARD" text.
        *   Action buttons (`ql-flashcard-card-actions`) for adding (+), deleting (×), AI generation (sparkles icon), and PDF upload (file icon).
        *   A card container (`ql-flashcard-container`) that handles the flip animation and stores `data-current-index` and `data-total-cards`.
        *   Front (`ql-flashcard-front`) and Back (`ql-flashcard-back`) divs for each card, containing labels and editable content divs (`ql-flashcard-content`).
        *   Navigation controls (`ql-flashcard-controls`) including previous/next buttons, card info display, and a flip button.
        *   **Event Listeners:** Adds numerous event listeners for:
            *   Content editing within front/back divs (handling Enter, Delete, Backspace keys to prevent Quill issues and using `withDisabledMarkdown`).
            *   Flip button clicks (toggling 'flipped' class, dispatching `flashcard-flip` event).
            *   Previous/Next button clicks (updating visibility, `data-current-index`, resetting flip state).
            *   Add button click (creating new card elements, updating state, switching view, using `withDisabledMarkdown`).
            *   Delete button click (removing card elements, updating indices, updating state, using `withDisabledMarkdown`).
            *   AI Generate button click (creating and showing a modal for text input and card count, dispatching `flashcard-ai-generate` event).
            *   PDF Upload button click (creating and showing a modal for card count selection, triggering file input, dispatching `flashcard-pdf-upload` event).
    *   `value(node)`: Extracts the state of the flashcard from the DOM, including the content of all cards (front and back), the current index, and the flipped state.
*   **`registerFlashcardBlot(quillInstance)` Function:**
    *   Registers the `FlashcardBlot` as a `BlockEmbed` with Quill, similar to the other blots.

## `index.ts`

This file acts as a barrel file for the `blocks` directory.

*   It re-exports all named exports from:
    *   `./checkbox-blot.ts`
    *   `./custom-blocks.ts`
    *   `./flashcard-blot.ts`
    *   `./quiz-blot.ts`

## `quiz-blot.ts`

This file defines a complex custom `BlockEmbed` blot for creating interactive multiple-choice quizzes.

*   **`QuizBlotStatic` Interface:** Defines static properties for the quiz blot.
*   **`withDisabledMarkdown` Helper:** A utility function (defined locally in this file, though similar to one in `flashcard-blot.ts`) to temporarily disable Quill's markdown processing during specific operations to prevent errors.
*   **`QuizBlot` Object:**
    *   `blotName`: 'quiz'
    *   `tagName`: 'div'
    *   `className`: 'ql-quiz'
    *   `create(value)`: Creates the complex DOM structure for the quiz component. This includes:
        *   A main container (`ql-quiz`) marked `contenteditable=false`.
        *   A title section (`ql-quiz-title-section`) with an SVG icon and "QUIZ" text.
        *   Action buttons (`ql-quiz-actions`) for adding (+), deleting (×), AI generation (sparkles icon), and PDF upload (file icon).
        *   A container (`ql-quiz-container`) storing `data-current-index` and `data-total-questions`.
        *   Question elements (`ql-quiz-question`) for each question, containing:
            *   An editable question content div (`ql-quiz-question-content`).
            *   An options container (`ql-quiz-options`).
            *   Option elements (`ql-quiz-option`) with radio buttons, editable content (`ql-quiz-option-content`), and action buttons (set correct, delete option).
            *   An "Add Option" button.
        *   Navigation controls (`ql-quiz-controls`) including previous/next buttons, question info display, and a reset/shuffle button.
        *   **Event Listeners:** Adds numerous event listeners for:
            *   Content editing within question/option divs (handling Enter, Delete, Backspace keys, using `withDisabledMarkdown`).
            *   Radio button changes (showing correct/incorrect feedback).
            *   Option clicks (selecting the radio button).
            *   "Set as correct" button clicks (updating data model and UI).
            *   Delete option button clicks (removing option, updating state).
            *   Add option button clicks (creating new option element, focusing it).
            *   Previous/Next button clicks (updating visibility, `data-current-index`).
            *   Add question button click (creating new question element, updating state, switching view, using `withDisabledMarkdown`).
            *   Delete question button click (removing question element, updating indices, updating state, using `withDisabledMarkdown`).
            *   Reset button click (shuffling questions and options using Fisher-Yates, resetting UI, using `withDisabledMarkdown`).
            *   AI Generate button click (similar to flashcard, dispatching `quiz-ai-generate` event).
            *   PDF Upload button click (similar to flashcard, dispatching `quiz-pdf-upload` event).
    *   `value(node)`: Extracts the state of the quiz from the DOM, including all questions, their options (text and correctness), and the current index.
*   **`registerQuizBlot(quillInstance)` Function:**
    *   Registers the `QuizBlot` as a `BlockEmbed` with Quill.
