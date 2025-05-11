'use client';
import React from 'react';
import 'quill/dist/quill.snow.css';
import './styles/slash-commands.css';
import EditorWrapper from './components/EditorWrapper';
import { QuillEditorProps } from './types';

/**
 * QuillEditor Component
 * This component has been refactored for better maintainability.
 * The actual implementation has been moved to smaller components and hooks:
 * 
 * Hooks:
 * - useEditorSetup: Sets up the Quill editor
 * - useDocumentOperations: Handles document operations (save, delete, etc.)
 * - useCollaboration: Handles real-time collaboration
 * - useContentLoader: Loads document content
 * - useDocumentDetails: Gets document details and breadcrumbs
 * - useAIGenerator: Handles AI text generation
 * - usePDFProcessor: Handles PDF processing
 * - useEventHandlers: Sets up document event handlers
 * - useKeyboardHandlers: Manages keyboard interactions
 * 
 * Components:
 * - EditorWrapper: Main component that ties everything together
 * - AIGenerationProvider: Manages AI generation UI and state
 * - DocumentBanner: Displays document banner * not integrated yet
 * - DocumentTitle: Displays and manages document title
 * - EditorHeader: Header with breadcrumbs and collaborators
 * - TrashBanner: Shows banner when document is in trash
 */
const QuillEditor: React.FC<QuillEditorProps> = (props) => {
  return <EditorWrapper {...props} />;
};

export default QuillEditor;