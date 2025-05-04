import { KnowledgeItem } from '@/supabase/supabase';

// SM-2 Algorithm constants
const MIN_EASE_FACTOR = 130; // 1.3 multiplied by 100
const MAX_EASE_FACTOR = 250; // 2.5 multiplied by 100
const DEFAULT_EASE_FACTOR = 250; // 2.5 multiplied by 100

// Flashcard/Quiz types
export interface FlashcardContent {
  front: string;
  back: string;
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizContent {
  question: string;
  options: QuizOption[];
}

// Score quality for SM-2 algorithm (0-5)
// 0 - Complete blackout, wrong answer
// 1 - Incorrect response, but recognized the correct answer
// 2 - Incorrect response, but correct answer felt familiar
// 3 - Correct response, but required significant effort to recall
// 4 - Correct response, after some hesitation
// 5 - Perfect response, recalled with ease
export type RecallQuality = 0 | 1 | 2 | 3 | 4 | 5;

// Group items by folder or file source
export function groupItemsBySource(items: KnowledgeItem[]): Record<string, KnowledgeItem[]> {
  const groupedItems: Record<string, KnowledgeItem[]> = {};
  
  items.forEach(item => {
    let sourceKey = 'unknown';
    
    if (item.sourceFolderId) {
      sourceKey = `folder:${item.sourceFolderId}`;
    } else if (item.sourceFileId) {
      sourceKey = `file:${item.sourceFileId}`;
    }
    
    if (!groupedItems[sourceKey]) {
      groupedItems[sourceKey] = [];
    }
    
    groupedItems[sourceKey].push(item);
  });
  
  return groupedItems;
}

// Filter items by type
export function filterItemsByType(items: KnowledgeItem[], type: 'flashcard' | 'quiz'): KnowledgeItem[] {
  return items.filter(item => item.type === type);
}

// Calculate next review date using the SM-2 spaced repetition algorithm
export function calculateNextReview(
  item: KnowledgeItem,
  quality: RecallQuality
): { nextReviewDate: Date; easeFactor: number; interval: number } {
  // Initialize values
  let easeFactor = item.easeFactor || DEFAULT_EASE_FACTOR;
  let interval = item.interval || 1;
  let reviewCount = item.reviewCount || 0;
  
  // Update based on quality
  if (quality < 3) {
    // If recall was difficult, reset interval but keep ease factor
    interval = 1;
  } else {
    // Calculate new interval based on previous interval and ease factor
    if (reviewCount === 0) {
      interval = 1;
    } else if (reviewCount === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * (easeFactor / 100));
    }
    
    // Update ease factor based on performance
    // EF := EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const easeChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor = Math.round(easeFactor + (easeChange * 100));
    
    // Keep ease factor within bounds
    easeFactor = Math.max(MIN_EASE_FACTOR, Math.min(MAX_EASE_FACTOR, easeFactor));
  }
  
  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  
  return {
    nextReviewDate,
    easeFactor,
    interval
  };
}

// Calculate overall performance percentage
export function calculatePerformance(item: KnowledgeItem, newQuality: RecallQuality): number {
  const reviewCount = (item.reviewCount || 0) + 1;
  const currentPerformance = item.performance || 0;
  
  // Convert quality score to percentage (0-5 to 0-100)
  const qualityPercentage = Math.round((newQuality / 5) * 100);
  
  // Weight the new score more if there are fewer reviews
  const weight = 1 / reviewCount;
  const newPerformance = Math.round(
    currentPerformance * (1 - weight) + qualityPercentage * weight
  );
  
  return newPerformance;
}

// Get list of unique tags from items
export function extractTags(items: KnowledgeItem[]): string[] {
  const tagsSet = new Set<string>();
  
  items.forEach(item => {
    if (item.tags) {
      (item.tags as string[]).forEach(tag => tagsSet.add(tag));
    }
  });
  
  return Array.from(tagsSet).sort();
}

// Helper to extract content for specific item types
export function getFlashcardContent(item: KnowledgeItem): FlashcardContent | null {
  if (item.type !== 'flashcard' || !item.content) return null;
  return item.content as unknown as FlashcardContent;
}

export function getQuizContent(item: KnowledgeItem): QuizContent | null {
  if (item.type !== 'quiz' || !item.content) return null;
  return item.content as unknown as QuizContent;
} 