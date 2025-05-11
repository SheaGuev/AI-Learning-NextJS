import { 
  extractFlashcardsFromDocument,
  extractQuizzesFromDocument,
  fetchDueItems
} from '../knowledge-base';
import { v4 as uuidv4 } from 'uuid';

// Mock the supabase queries
jest.mock('@/supabase/queries', () => ({
  createKnowledgeItem: jest.fn().mockResolvedValue({ error: null })
}));

describe('knowledge-base', () => {
  describe('extractFlashcardsFromDocument', () => {
    it('should handle empty content', async () => {
      const fileId = uuidv4();
      const folderId = uuidv4();
      const userId = uuidv4();
      const content = JSON.stringify({ ops: [] });
      
      const result = await extractFlashcardsFromDocument(
        fileId,
        folderId,
        'Test Folder',
        userId,
        content,
        'Test File'
      );
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });
    
    it('should extract flashcards from content', async () => {
      const fileId = uuidv4();
      const folderId = uuidv4();
      const userId = uuidv4();
      const content = JSON.stringify({
        ops: [
          { insert: 'Some normal text' },
          { 
            insert: { 
              flashcard: { 
                cards: [
                  { front: 'Question 1', back: 'Answer 1' },
                  { front: 'Question 2', back: 'Answer 2' }
                ] 
              } 
            } 
          },
          { insert: 'More text' }
        ]
      });
      
      const result = await extractFlashcardsFromDocument(
        fileId,
        folderId,
        'Test Folder',
        userId,
        content,
        'Test File'
      );
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });
    
    it('should handle invalid content format', async () => {
      const fileId = uuidv4();
      const folderId = uuidv4();
      const userId = uuidv4();
      const content = 'not a json';
      
      const result = await extractFlashcardsFromDocument(
        fileId,
        folderId,
        'Test Folder',
        userId,
        content,
        'Test File'
      );
      
      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('extractQuizzesFromDocument', () => {
    it('should handle empty content', async () => {
      const fileId = uuidv4();
      const folderId = uuidv4();
      const userId = uuidv4();
      const content = JSON.stringify({ ops: [] });
      
      const result = await extractQuizzesFromDocument(
        fileId,
        folderId,
        'Test Folder',
        userId,
        content,
        'Test File'
      );
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });
    
    it('should extract quizzes from content', async () => {
      const fileId = uuidv4();
      const folderId = uuidv4();
      const userId = uuidv4();
      const content = JSON.stringify({
        ops: [
          { insert: 'Some normal text' },
          { 
            insert: { 
              quiz: { 
                questions: [
                  {
                    question: 'Test question',
                    options: [
                      { text: 'Answer 1', correct: true },
                      { text: 'Answer 2', correct: false }
                    ]
                  }
                ]
              } 
            } 
          },
          { insert: 'More text' }
        ]
      });
      
      const result = await extractQuizzesFromDocument(
        fileId,
        folderId,
        'Test Folder',
        userId,
        content,
        'Test File'
      );
      
      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });
  });
  
  describe('fetchDueItems', () => {
    it('should fetch due items for a user', async () => {
      // Mock implementation will return the default mocked value
      const userId = uuidv4();
      
      await expect(fetchDueItems(userId)).resolves.not.toThrow();
    });
  });
}); 