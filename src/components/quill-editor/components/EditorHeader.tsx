'use client';

import React, { useState, useEffect } from 'react';
import BreadCrumbs from './BreadCrumbs';
import { FiDownload, FiLoader, FiPlus, FiDatabase } from 'react-icons/fi';
import UserAvatars from './UserAvatars';
import { extractFlashcardsFromDocument, extractQuizzesFromDocument } from '@/lib/knowledge-base';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getFolderDetails, getFileDetails } from '@/supabase/queries';

interface EditorHeaderProps {
  breadCrumbs: any;
  collaborators: any[];
  saving: boolean;
  onExportMarkdown: () => void;
  fileId?: string;
  folderId?: string;
  fileContent?: string;
}

/**
 * Helper function to normalize a string into a tag-friendly format
 * Removes special characters, trims whitespace, converts to lowercase
 * and truncates to a maximum length of 30 characters
 */
const normalizeTagName = (name?: string): string | undefined => {
  if (!name) return undefined;
  
  // Convert to lowercase, replace spaces with hyphens and remove special characters
  const normalizedName = name.trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .substring(0, 30); // Limit to 30 characters max
  
  return normalizedName;
};

const EditorHeader: React.FC<EditorHeaderProps> = ({
  breadCrumbs,
  collaborators,
  saving,
  onExportMarkdown,
  fileId,
  folderId,
  fileContent
}) => {
  const { user } = useSupabaseUser();
  const { toast } = useToast();
  const [extracting, setExtracting] = useState(false);
  const [folderName, setFolderName] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  // Get folder name and file name on mount if IDs are available
  useEffect(() => {
    const loadFolderAndFileData = async () => {
      // Load folder details if available
      if (folderId) {
        try {
          const { data, error } = await getFolderDetails(folderId);
          if (!error && data.length > 0) {
            setFolderName(data[0].title);
            console.log('Retrieved folder name:', data[0].title);
          } else {
            console.warn('Could not retrieve folder name:', error);
          }
        } catch (err) {
          console.error('Error loading folder name:', err);
        }
      }
      
      // Load file details if available
      if (fileId) {
        try {
          const { data, error } = await getFileDetails(fileId);
          if (!error && data.length > 0) {
            setFileName(data[0].title);
            console.log('Retrieved file name:', data[0].title);
          } else {
            console.warn('Could not retrieve file name:', error);
          }
        } catch (err) {
          console.error('Error loading file name:', err);
        }
      }
    };

    loadFolderAndFileData();
  }, [folderId, fileId]);

  // Extract content to Knowledge Base
  const extractToKnowledgeBase = async () => {
    if (!user || !fileId || !folderId || !fileContent) {
      toast({
        title: 'Cannot extract content',
        description: 'Missing file information or content',
        variant: 'destructive',
      });
      console.error('Missing required data for extraction:', {
        hasUser: !!user,
        fileId,
        folderId,
        hasContent: !!fileContent,
        contentLength: fileContent ? fileContent.length : 0
      });
      return;
    }

    // Try to load folder and file info if not already available
    if (!folderName || !fileName) {
      try {
        // Get folder name if missing
        if (!folderName && folderId) {
          const { data, error } = await getFolderDetails(folderId);
          if (!error && data.length > 0) {
            setFolderName(data[0].title);
            console.log('Retrieved folder name:', data[0].title);
          }
        }
        
        // Get file name if missing
        if (!fileName && fileId) {
          const { data, error } = await getFileDetails(fileId);
          if (!error && data.length > 0) {
            setFileName(data[0].title);
            console.log('Retrieved file name:', data[0].title);
          }
        }
      } catch (err) {
        console.error('Error loading folder or file details:', err);
      }
    }

    // Normalize tags
    const normalizedFolderTag = normalizeTagName(folderName);
    const normalizedFileTag = normalizeTagName(fileName);
    
    // Log tag information
    console.log('Extracting with user ID:', user.id);
    console.log('Using folder name as tag:', normalizedFolderTag || 'No folder name available');
    console.log('Using file name as tag:', normalizedFileTag || 'No file name available');
    
    // Create custom tags to be added to each item
    const customTags: string[] = [];
    if (normalizedFolderTag) customTags.push(normalizedFolderTag);
    if (normalizedFileTag) customTags.push(normalizedFileTag);
    
    console.log('Custom tags to be added:', customTags);
    console.log('Starting extraction with file content:', fileContent.substring(0, 200) + '...');
    
    setExtracting(true);
    
    try {
      // Add custom tag processing to the extraction process
      // Since we can't modify the knowledge-base.ts file directly,
      // we'll add an additional pre-processing step to manually 
      // add our tags in the extraction function

      // Extract flashcards
      const flashcardResult = await extractFlashcardsFromDocument(
        fileId,
        folderId,
        normalizedFolderTag, // Pass normalized folder name
        user.id,
        fileContent,
        normalizedFileTag  // Pass normalized file name
      );
      
      console.log('Flashcard extraction result:', flashcardResult);
      
      // Extract quizzes
      const quizResult = await extractQuizzesFromDocument(
        fileId,
        folderId,
        normalizedFolderTag, // Pass normalized folder name
        user.id,
        fileContent,
        normalizedFileTag  // Pass normalized file name
      );
      
      console.log('Quiz extraction result:', quizResult);
      
      const totalCount = flashcardResult.count + quizResult.count;
      
      if (totalCount > 0) {
        const tagMessage = customTags.length > 0 
          ? ` with tags: ${customTags.join(', ')}`
          : '';
        
        toast({
          title: 'Content extracted',
          description: `Added ${flashcardResult.count} flashcards and ${quizResult.count} quiz questions to your Knowledge Base${tagMessage}`,
        });
      } else {
        if (flashcardResult.error || quizResult.error) {
          toast({
            title: 'Error extracting content',
            description: 'There was an error saving items to the database. Check console for details.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'No content found',
            description: 'No flashcards or quizzes found in this document',
          });
        }
      }
    } catch (error) {
      console.error('Error extracting content:', error);
      toast({
        title: 'Error extracting content',
        description: 'Failed to extract content to Knowledge Base',
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="flex items-center justify-between w-full h-16 px-4 bg-[#0f0f17] border-b border-[#1f1f2d]">
      <div className="flex items-center gap-4">
        {typeof breadCrumbs === 'string' ? (
          <div className="text-sm text-gray-400">{breadCrumbs}</div>
        ) : (
          <BreadCrumbs breadCrumbs={breadCrumbs} />
        )}
      </div>
      <div className="flex items-center gap-3">
        {saving ? (
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <FiLoader className="animate-spin" />
            <span>Saving...</span>
          </div>
        ) : null}
        
        {/* Knowledge Base extraction button */}
        <div className="relative group">
          <button
            onClick={extractToKnowledgeBase}
            disabled={extracting || !fileContent}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors 
              ${(extracting || !fileContent) ? 'bg-[#3d3d4d] text-gray-400 cursor-not-allowed' : 'bg-[#1f1f2d] hover:bg-[#3d3d4d] text-gray-300'}`}
          >
            {extracting ? <FiLoader className="mr-1 animate-spin" /> : <FiDatabase className="mr-1" />}
            {extracting ? 'Extracting...' : 'Extract to Knowledge Base'}
          </button>
          
          <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1f1f2d] text-xs text-gray-300 rounded shadow-lg whitespace-nowrap">
            Extract flashcards and quizzes to your Knowledge Base
          </div>
        </div>
        
        {/* Export Markdown button */}
        <button
          onClick={onExportMarkdown}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1f1f2d] hover:bg-[#3d3d4d] text-gray-300 rounded-md transition-colors"
        >
          <FiDownload className="mr-1" />
          Export Markdown
        </button>
        
        {/* View Knowledge Base button */}
        {/* <Link
          href="/dashboard"
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#6052A8] hover:bg-[#7262B8] text-white rounded-md transition-colors"
        >
          <FiPlus className="mr-1" />
          View Knowledge Base
        </Link> */}
        
        {/* Collaborators */}
        <div>
          <UserAvatars collaborators={collaborators} />
        </div>
      </div>
    </div>
  );
};

export default EditorHeader; 