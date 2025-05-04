import { v4 as uuidv4 } from 'uuid';
import { KnowledgeItem } from '@/supabase/supabase';
import { createKnowledgeItem } from '@/supabase/queries';

/**
 * Extracts flashcards from a Quill document's content
 * 
 * @param fileId - The ID of the source file
 * @param folderId - The ID of the parent folder
 * @param folderName - The name of the parent folder to add as a tag
 * @param userId - The ID of the user who owns the file
 * @param content - The document content JSON as a string
 */
export async function extractFlashcardsFromDocument(
  fileId: string,
  folderId: string,
  folderName: string | undefined,
  userId: string,
  content: string,
  fileName?: string  // Optional file name parameter to use as a tag
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Parse the document content
    const contentObj = JSON.parse(content);
    
    // Find all flashcard blots in the content
    const flashcardBlots = findFlashcardBlots(contentObj);
    
    if (!flashcardBlots.length) {
      return { success: true, count: 0 };
    }
    
    console.log(`Processing ${flashcardBlots.length} flashcard blots:`, flashcardBlots);
    
    // Convert blots to knowledge items
    let successCount = 0;
    let errorMessage = '';
    
    for (const blot of flashcardBlots) {
      try {
        // Extract flashcard data
        console.log('Processing flashcard blot:', blot);
        
        if (!blot || !blot.value) {
          console.error('Invalid flashcard blot structure:', blot);
          continue;
        }
        
        const { cards } = blot.value;
        
        if (!cards || !Array.isArray(cards)) {
          console.error('Invalid cards structure:', blot.value);
          continue;
        }
        
        console.log(`Found ${cards.length} cards to process:`, cards);
        
        // Create a knowledge item for each card
        for (const card of cards) {
          if (!card || typeof card !== 'object' || !card.front || !card.back) {
            console.warn('Skipping invalid card:', card);
            continue;
          }
          
          console.log('Creating knowledge item for card:', card);
          
          try {
            // Initialize empty tags array
            let tags: string[] = [];
            
            // Add folder name as a tag if provided
            if (folderName && folderName.trim() !== '') {
              tags.push(folderName);
            }
            
            // Add file name as a tag if provided
            if (fileName && fileName.trim() !== '') {
              tags.push(fileName);
            }
            
            // Extract only explicit hashtags from content (no keywords)
            const hashtags = extractHashtagsFromContent(card.front + ' ' + card.back);
            tags = [...tags, ...hashtags];
            
            // Create the knowledge item object
            const item = {
              id: uuidv4(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId,
              type: 'flashcard',
              content: {
                front: card.front,
                back: card.back
              },
              sourceFileId: fileId,
              sourceFolderId: folderId,
              tags,
              reviewCount: 0,
              easeFactor: 250,
              interval: 1,
              performance: 0,
              lastReviewed: null,
              nextReviewDate: null
            };
            
            console.log('Attempting to save knowledge item:', {
              id: item.id,
              type: item.type,
              userId: item.userId,
              contentPreview: `Front: ${card.front.substring(0, 30)}...`,
              tags: item.tags
            });
            
            // Save to database
            const result = await createKnowledgeItem(item);
            
            if (result.error) {
              console.error('Error saving knowledge item:', result.error);
              
              // Store the first error message we encounter
              if (!errorMessage) {
                errorMessage = result.error;
              }
            } else {
              successCount++;
              console.log('Successfully saved knowledge item #', successCount);
            }
          } catch (cardError) {
            console.error('Error processing individual card:', cardError);
            
            // Store error from exception
            if (!errorMessage && cardError instanceof Error) {
              errorMessage = cardError.message;
            }
          }
        }
      } catch (blotError) {
        console.error('Error processing flashcard blot:', blotError);
        
        // Store error from exception
        if (!errorMessage && blotError instanceof Error) {
          errorMessage = blotError.message;
        }
      }
    }
    
    console.log(`Completed flashcard extraction with ${successCount} cards saved`);
    
    if (successCount > 0) {
      return { success: true, count: successCount };
    } else if (errorMessage) {
      return { success: false, count: 0, error: errorMessage };
    } else {
      return { success: true, count: 0 };
    }
  } catch (error) {
    console.error('Error extracting flashcards:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to extract flashcards';
      
    return { success: false, count: 0, error: 'Failed to extract flashcards' };
  }
}

/**
 * Extracts quizzes from a Quill document's content
 * 
 * @param fileId - The ID of the source file
 * @param folderId - The ID of the parent folder
 * @param folderName - The name of the parent folder to add as a tag
 * @param userId - The ID of the user who owns the file
 * @param content - The document content JSON as a string
 */
export async function extractQuizzesFromDocument(
  fileId: string,
  folderId: string,
  folderName: string | undefined,
  userId: string,
  content: string,
  fileName?: string  // Optional file name parameter to use as a tag
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Parse the document content
    const contentObj = JSON.parse(content);
    
    // Find all quiz blots in the content
    const quizBlots = findQuizBlots(contentObj);
    
    if (!quizBlots.length) {
      return { success: true, count: 0 };
    }
    
    console.log(`Processing ${quizBlots.length} quiz blots`);
    
    // Convert blots to knowledge items
    let successCount = 0;
    
    for (const blot of quizBlots) {
      try {
        // Extract quiz data
        if (!blot || !blot.value) {
          console.error('Invalid quiz blot structure:', blot);
          continue;
        }
        
        const { questions } = blot.value;
        
        if (!questions || !Array.isArray(questions)) {
          console.error('Invalid questions structure:', blot.value);
          continue;
        }
        
        console.log(`Found ${questions.length} questions to process`);
        
        // Create a knowledge item for each question
        for (const question of questions) {
          if (!question || typeof question !== 'object' || !question.question || !question.options) {
            console.warn('Skipping invalid question:', question);
            continue;
          }
          
          try {
            // Initialize empty tags array
            let tags: string[] = [];
            
            // Add folder name as a tag if provided
            if (folderName && folderName.trim() !== '') {
              tags.push(folderName);
            }
            
            // Add file name as a tag if provided
            if (fileName && fileName.trim() !== '') {
              tags.push(fileName);
            }
            
            // Extract only explicit hashtags from content (no keywords)
            const hashtags = extractHashtagsFromContent(question.question);
            tags = [...tags, ...hashtags];
            
            const item = {
              id: uuidv4(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId,
              type: 'quiz',
              content: {
                question: question.question,
                options: question.options
              },
              sourceFileId: fileId,
              sourceFolderId: folderId,
              tags,
              reviewCount: 0,
              easeFactor: 250,
              interval: 1,
              performance: 0,
              lastReviewed: null,
              nextReviewDate: null
            };
            
            console.log('Attempting to save quiz item with tags:', item.tags);
            
            // Save to database
            const result = await createKnowledgeItem(item);
            
            if (result.error) {
              console.error('Error saving quiz item:', result.error);
            } else {
              successCount++;
              console.log('Successfully saved quiz item #', successCount);
            }
          } catch (questionError) {
            console.error('Error processing individual question:', questionError);
          }
        }
      } catch (blotError) {
        console.error('Error processing quiz blot:', blotError);
      }
    }
    
    console.log(`Completed quiz extraction with ${successCount} questions saved`);
    return { success: true, count: successCount };
  } catch (error) {
    console.error('Error extracting quizzes:', error);
    return { success: false, count: 0, error: 'Failed to extract quizzes' };
  }
}

/**
 * Finds flashcard blots in a Quill document's content
 */
function findFlashcardBlots(content: any): any[] {
  const blots: any[] = [];
  
  // Add debug logging
  console.log('Searching for flashcards in content:', JSON.stringify(content).substring(0, 200) + '...');
  
  // Function to recursively search the content tree
  function searchOps(ops: any[]) {
    if (!ops || !Array.isArray(ops)) return;
    
    for (const op of ops) {
      // Debug log the op structure
      if (op.insert && typeof op.insert === 'object') {
        console.log('Found object insert:', Object.keys(op.insert));
      }
      
      // Check if this is a flashcard embed
      if (op.insert && typeof op.insert === 'object' && op.insert.flashcard) {
        console.log('Found flashcard blot:', op.insert.flashcard);
        blots.push({
          type: 'flashcard',
          value: op.insert.flashcard
        });
      }
      
      // If it has child ops, search those too
      if (op.insert && op.insert.ops) {
        searchOps(op.insert.ops);
      }
    }
  }
  
  // Start the search at the top level
  if (content.ops && Array.isArray(content.ops)) {
    searchOps(content.ops);
  }
  
  console.log(`Found ${blots.length} flashcard blots in document`);
  return blots;
}

/**
 * Finds quiz blots in a Quill document's content
 */
function findQuizBlots(content: any): any[] {
  const blots: any[] = [];
  
  // Function to recursively search the content tree
  function searchOps(ops: any[]) {
    if (!ops || !Array.isArray(ops)) return;
    
    for (const op of ops) {
      // Check if this is a quiz embed
      if (op.insert && typeof op.insert === 'object' && op.insert.quiz) {
        blots.push({
          type: 'quiz',
          value: op.insert.quiz
        });
      }
      
      // If it has child ops, search those too
      if (op.insert && op.insert.ops) {
        searchOps(op.insert.ops);
      }
    }
  }
  
  // Start the search at the top level
  if (content.ops && Array.isArray(content.ops)) {
    searchOps(content.ops);
  }
  
  return blots;
}

/**
 * Extracts only hashtags from content text
 * This function only extracts explicit hashtags, not keywords
 */
function extractHashtagsFromContent(text: string): string[] {
  // Extract hashtags
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const hashtagMatches = [...text.matchAll(hashtagRegex)];
  const hashtags = hashtagMatches.map(match => match[1].toLowerCase());
  
  // Deduplicate
  const uniqueHashtags = [...new Set(hashtags)];
  
  return uniqueHashtags;
}

/**
 * The original function that extracts both hashtags and keywords - kept for reference
 * but no longer used in the extraction process
 */
function extractTagsFromContent(text: string): string[] {
  // Extract hashtags
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const hashtagMatches = [...text.matchAll(hashtagRegex)];
  const hashtags = hashtagMatches.map(match => match[1].toLowerCase());
  
  // Extract keywords
  // This is a simple approach - in a real app, you might use NLP
  // to identify important keywords
  const keywordRegex = /\b(important|remember|key|concept|definition|formula|theorem|rule)\b/gi;
  const keywordMatches = [...text.matchAll(keywordRegex)];
  const keywords = keywordMatches.map(match => match[1].toLowerCase());
  
  // Combine and deduplicate
  const allTags = [...new Set([...hashtags, ...keywords])];
  
  // Limit to first 5 tags
  return allTags.slice(0, 5);
}

/**
 * Fetch items that are due for review based on spaced repetition
 */
export async function fetchDueItems(userId: string) {
  // This function will be implemented in the queries.ts file
  // We're just providing a stub here for reference
  return [];
} 