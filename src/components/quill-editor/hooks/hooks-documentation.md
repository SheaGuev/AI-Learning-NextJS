# Quill Editor Hooks Documentation

This document provides a comprehensive overview of all hook files in the `quill-editor/hooks` directory, detailing their functions, methods, and purpose.

## Table of Contents

- [useCollaboration](#usecollaboration)
- [useAIGenerator](#useaigenerator)
- [useContentLoader](#usecontentloader)
- [useDocumentDetails](#usedocumentdetails)
- [useDocumentOperations](#usedocumentoperations)
- [useEditorSetup](#useeditorsetup)
- [useEventHandlers](#useeventhandlers)
- [useKeyboardHandlers](#usekeyboardhandlers)
- [usePdfProcessor](#usepdfprocessor)

Let's examine each hook in detail:

## useCollaboration

**File**: `use-collaboration.ts`  
**Purpose**: Manages real-time collaboration features in the Quill editor including cursor tracking and document synchronization.

### Main Hook Function
- `useCollaboration(quill: any, fileId: string)`: Sets up real-time collaboration for a document

### States
- `collaborators`: Tracks all users currently connected to the document
- `localCursors`: Stores cursor objects for all collaborators
- `previousCollaborators`: Tracks previous state of collaborators for change detection

### Main Features

#### Socket Room Setup
- Creates a room for the current document
- Handles connection/reconnection events
- Displays toast notifications on connection events

#### Document Sync
- Listens for changes from other users via socket
- Updates the local Quill instance with remote changes

#### Presence Tracking
- Uses Supabase Presence to track users in the document
- Shows toast notifications when users join or leave
- Updates collaborator list in real-time
- Creates cursor objects for each collaborator

#### Cursor Movement Handling
- `setupSelectionHandler()`: Sets up event handlers for cursor movements
- Tracks local selection changes and broadcasts them to other users
- Receives cursor movements from other users and updates UI

### Return Value
- `collaborators`: List of current collaborators
- `setupSelectionHandler`: Function to initialize selection tracking

## useAIGenerator

**File**: `use-ai-generator.ts`  
**Purpose**: Provides AI text generation functionality using Google's Gemini model.

### Interface
```typescript
interface UseAIGeneratorReturn {
  generateText: (prompt: string, contextContent?: string) => Promise<string>;
  isGenerating: boolean;
  setApiKey: (key: string) => void;
  apiKeyExists: boolean;
}
```

### Main Hook Function
- `useAIGenerator()`: Creates a hook for AI text generation functionality

### States
- `apiKeyExists`: Tracks whether a Gemini API key is stored in localStorage

### Main Features

#### Text Generation
- `generateText(prompt: string, contextContent?: string)`: Generates text using Gemini AI
  - Combines context content with the prompt if provided
  - Handles various error scenarios with appropriate error messages
  - Returns the generated text or an empty string on error

#### API Key Management
- `handleSetApiKey(key: string)`: Sets and validates the Gemini API key
  - Stores the key for future use
  - Shows a toast notification on successful key saving

### Return Value
- `generateText`: Function to generate AI text
- `isGenerating`: Boolean indicating if text generation is in progress
- `setApiKey`: Function to set the Gemini API key
- `apiKeyExists`: Boolean indicating if an API key is already stored

## useContentLoader

**File**: `use-content-loader.ts`  
**Purpose**: Loads and manages content from different sources (file, folder, workspace) into the Quill editor.

### Main Hook Function
- `useContentLoader(quill: any, fileId: string, dirType: 'file' | 'folder' | 'workspace')`: Loads content based on the directory type

### Dependencies
- Uses Next.js router for navigation
- Uses app state context for state management
- Relies on Supabase queries for data fetching

### Main Features

#### Content Loading Logic
- Uses `useEffect` to fetch content when fileId changes
- Handles different content sources (file, folder, workspace)
- Supports both standard Quill Delta format and markdown content

#### File Content Loading
- Fetches file details using `getFileDetails`
- Handles navigation if file doesn't exist
- Parses JSON data and loads into Quill editor
- Special handling for markdown vs. Delta format content

#### Folder Content Loading
- Fetches folder details using `getFolderDetails`
- Handles navigation if folder doesn't exist
- Updates app state with folder data

#### Workspace Content Loading
- Fetches workspace details using `getWorkspaceDetails`
- Handles navigation if workspace doesn't exist
- Updates app state with workspace data

### Error Handling
- Redirects to dashboard if content not found
- Falls back to setting raw text if JSON parsing fails
- Handles missing data gracefully

## useDocumentDetails

**File**: `use-document-details.ts`  
**Purpose**: Generates document details and breadcrumb navigation paths based on the current document context.

### Main Hook Function
- `useDocumentDetails(dirDetails: File | Folder | workspace, dirType: 'file' | 'folder' | 'workspace', fileId: string)`: Builds document details and navigation breadcrumbs

### Dependencies
- Uses app state context for state management
- Uses Next.js pathname for navigation
- Uses Supabase type definitions for data structures

### Main Features

#### Document Details Generation
- Uses `useMemo` to efficiently generate document details
- Searches for document information in the application state based on directory type
- Falls back to provided details if not found in state
- Handles different directory types (file, folder, workspace)

#### Breadcrumb Generation
- Creates navigation breadcrumbs based on the current pathname
- Builds a hierarchical path (workspace > folder > file)
- Includes document icons in the breadcrumb path
- Extracts details from the application state for each path segment

### Return Value
- `details`: Comprehensive document details including title, icon, timestamps, and content data
- `breadCrumbs`: String representation of the document's navigation path with icons

## useDocumentOperations

**File**: `use-document-operations.ts`  
**Purpose**: Manages document operations including saving changes, file restoration, deletion, and format conversion.

### Main Hook Function
- `useDocumentOperations(quill: any, fileId: string, dirType: 'file' | 'folder' | 'workspace')`: Creates document operation handlers

### States
- `saving`: Indicates when a save operation is in progress
- `deletingBanner`: Indicates when a banner deletion is in progress
- `saveTimerRef`: Tracks the debounce timer for save operations

### Main Features

#### Change Handling and Auto-Save
- `quillHandler`: Processes Quill editor changes
  - Emits changes to socket server for real-time collaboration
  - Implements debounced saving (500ms delay)
  - Updates local state and database based on directory type
  - Handles errors with toast notifications

#### File Management
- `restoreFileHandler`: Restores files/folders from trash
- `deleteFileHandler`: Permanently deletes files/folders
- `iconOnChange`: Updates the document icon
- `deleteBanner`: Removes the banner image from storage and updates references

#### Markdown Integration
- `getMarkdownContent`: Converts editor content to markdown
  - Uses TurndownService for HTML to markdown conversion
  - Handles conversion errors
- `importMarkdown`: Converts markdown to Quill-compatible format
  - Processes markdown line by line
  - Handles various markdown elements (headings, lists, formatting)
  - Falls back to plain text if conversion fails

### Error Handling
- Comprehensive error handling throughout all operations
- Toast notifications for success and error states
- Graceful state restoration on failures

### Return Value
- `saving`: Boolean indicating if a save operation is in progress
- `deletingBanner`: Boolean indicating if a banner deletion is in progress
- `quillHandler`: Event handler for Quill text changes
- `restoreFileHandler`: Function to restore from trash
- `deleteFileHandler`: Function to permanently delete
- `iconOnChange`: Function to update document icon
- `deleteBanner`: Function to delete banner image
- `getMarkdownContent`: Function to convert to markdown
- `importMarkdown`: Function to import markdown content

## useEditorSetup

**File**: `use-editor-setup.ts`  
**Purpose**: Initializes and configures the Quill editor with custom modules, extensions, and keyboard bindings.

### Main Hook Function
- `useEditorSetup(wrapperRef: React.RefObject<HTMLDivElement | null>)`: Sets up the Quill editor in the provided wrapper element

### States
- `quill`: Stores the initialized Quill editor instance

### Main Features

#### Editor Initialization
- Dynamically imports Quill and its modules
- Creates editor instance with custom configuration
- Registers required modules (cursors, markdown, slash commands)
- Sets up toolbar with predefined options

#### Custom Extensions Registration
- Registers custom block formats
- Adds markdown table support
- Configures slash command menu with custom icons
- Sets up flashcard and quiz components

#### Slash Commands
- Implements a rich slash command menu (similar to Notion)
- Provides commands for headings, lists, code blocks, tables, etc.
- Adds AI generation command with custom event handling
- Includes specialized commands for flashcards and quizzes

#### Keyboard Bindings
- Adds support for markdown-style syntax (e.g., `[x]` for checkboxes)
- Implements special handling for code blocks with triple backticks
- Adds protection for embedded components to prevent accidental deletion
- Enhances editor experience with custom key handlers

#### Component Protection
- Implements safeguards to prevent accidental deletion of complex components
- Adds special handling for backspace and delete keys around custom blocks
- Uses both format and DOM-based checks for robust protection

### Error Handling
- Graceful error handling during initialization
- Console logging for debugging
- Verification of module loading success

### Return Value
- `quill`: The initialized Quill editor instance

## useEventHandlers

**File**: `use-event-handlers.ts`  
**Purpose**: Manages and processes various custom events for the Quill editor, especially AI-related functionality.

### Main Hook Function
- `useEventHandlers(quill: any, fileId: string | null, generateText: Function, apiKeyExists: boolean, setCurrentRange: Function, setShowAPIKeyDialog: Function, setShowAIPrompt: Function, quillHandler: Function)`: Sets up event handlers for the Quill editor

### Dependencies
- Relies on usePDFProcessor for PDF-related operations
- Uses useToast for notifications
- Requires the Quill Delta constructor for text manipulation

### Constants
- `MARKDOWN_FORMATTING_INSTRUCTIONS`: Standardized markdown formatting guidelines for AI responses

### Main Features

#### AI Text Generation
- `handleAIGenerate`: Generates AI text at the current cursor position
  - Gets context from surrounding content
  - Applies length constraints (short, medium, long)
  - Formats response with markdown guidelines
  - Inserts generated text at cursor position

#### Flashcard Generation
- `handleFlashcardAIGenerate`: Creates flashcards from selected content
  - Processes content into question-answer pairs
  - Formats response as JSON
  - Updates flashcard components with generated data

#### Quiz Generation
- `processQuizData`: Processes AI-generated quiz questions
- `updateQuizNode`: Updates quiz components with generated questions
- Supports multiple choice and true/false question types

#### PDF Processing
- `handlePdfSingleInsertWithSummary`: Inserts PDF content with AI-generated summary
- `handlePdfSectionSummary`: Summarizes specific sections of PDF content
- `handlePdfContentFormatting`: Formats PDF content for better readability

#### Event Listeners
- Sets up numerous custom event listeners for editor interactions
- Manages event bubbling and propagation for custom components
- Provides handlers for slash command interactions

### Error Handling
- Provides robust error handling for AI generation failures
- Shows appropriate toast notifications for success/failure states
- Gracefully handles API key validation

### Return Value
- Setup and cleanup functions for event handlers

## useKeyboardHandlers

**File**: `use-keyboard-handlers.ts`  
**Purpose**: Enhances the Quill editor with advanced keyboard interactions, focusing on slash commands functionality.

### Main Hook Function
- `useKeyboardHandlers(quill: any)`: Sets up keyboard event handlers for the Quill editor

### Features

#### Slash Command Triggers
- Provides special handling for the slash (`/`) key to trigger command menu
- Implements multiple detection approaches to ensure reliable triggering
- Uses both direct editor events and global document events for robustness

#### Enter Key Handling
- Implements custom Enter key handling for slash command menu interactions
- Detects when slash menu is open and finds the selected item
- Triggers a click on the selected menu item when Enter is pressed
- Falls back to selecting the first item if no item is explicitly selected

#### Menu Visibility Detection
- Uses DOM queries to detect when slash menu is visibly open
- Manages event propagation to prevent conflicting handlers
- Provides progressive fallbacks for different edge cases

#### Module Verification
- Verifies the slash commands module is properly loaded and accessible
- Logs diagnostic information for troubleshooting
- Maintains consistent behavior across editor interactions

### Event Management
- Adds event listeners with proper cleanup in useEffect
- Uses strategic timeouts to ensure correct event sequence
- Captures events at the global level when needed for override behaviors

### Return Value
- Cleanup function that removes all event listeners when component unmounts

## usePdfProcessor

**File**: `use-pdf-processor.ts`  
**Purpose**: Processes PDF documents to extract content and generate AI-enhanced summaries for integration into the Quill editor.

### Main Hook Function
- `usePDFProcessor(quill: any, generateText: (prompt: string, context: string) => Promise<string>)`: Creates utilities for PDF processing

### States
- `processingPdfSection`: Tracks whether PDF section processing is currently in progress

### Dependencies
- Uses `usePDFExtractor` for extracting text from PDF documents
- Uses `useToast` for displaying notifications
- Relies on external AI text generation function

### Main Features

#### PDF Content Extraction
- `extractFullText`: Gets all text content from a PDF document (from usePDFExtractor)
- `extractChunkedText`: Divides PDF content into manageable chunks (from usePDFExtractor)

#### Section Summarization
- `handlePdfSectionSummary`: Generates a heading and summary for PDF content sections
  - Uses AI to create a concise heading (6-8 words)
  - Produces a brief summary (2-3 sentences) of key points
  - Returns JSON with heading and summary properties
  - Provides fallback extraction if AI generation fails

#### Content Formatting
- `formatPdfContent`: Restructures and formats plain PDF content
  - Applies custom formatting instructions
  - Enhances readability of extracted text
  - Maintains context with original section heading

### Error Handling
- Provides robust fallback mechanisms if AI generation fails
  - Creates basic headings from the first few words
  - Extracts initial sentences as a summary
- Shows toast notifications for specific error types (e.g., rate limiting)
- Includes detailed error logging for debugging

### Return Value
- `extractFullText`: Function to get complete text from a PDF
- `extractChunkedText`: Function to get PDF text in manageable chunks
- `handlePdfSectionSummary`: Function to generate heading/summary for sections
- `formatPdfContent`: Function to improve PDF content formatting
- `processingPdfSection`: Boolean indicating if processing is active 