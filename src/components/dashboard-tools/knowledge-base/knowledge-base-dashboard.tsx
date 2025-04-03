'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '@/lib/providers/state-provider';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { KnowledgeItem } from '@/supabase/supabase';
import { 
  getKnowledgeItemsByUser, 
  getKnowledgeItemsByFile,
  getKnowledgeItemsByType,
  getDueKnowledgeItems,
  updateKnowledgeItem,
  getKnowledgeItemsByTags,
  deleteKnowledgeItem
} from '@/supabase/queries';
import { FiPlus, FiCheck, FiClock, FiFileText, FiTag, FiTrash2, FiX } from 'react-icons/fi';
import { useToast } from '@/hooks/use-toast';
import { 
  calculateNextReview, 
  calculatePerformance, 
  extractTags, 
  RecallQuality,
  getFlashcardContent,
  getQuizContent,
  FlashcardContent,
  QuizContent
} from './knowledge-base-utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Settings } from 'lucide-react';

// Main component
const KnowledgeBaseDashboard: React.FC = () => {
  const { user } = useSupabaseUser();
  const { state } = useAppState();
  const { toast } = useToast();
  
  // All knowledge items
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  
  // Filtered items for display
  const [filteredItems, setFilteredItems] = useState<KnowledgeItem[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'all' | 'due' | 'flashcards' | 'quizzes'>('all');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [currentStudyItem, setCurrentStudyItem] = useState<KnowledgeItem | null>(null);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [studyItemIndex, setStudyItemIndex] = useState(0);
  // Quiz study state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  
  // Edit and delete state
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTagInput, setEditTagInput] = useState('');
  const [editedContent, setEditedContent] = useState<FlashcardContent | QuizContent | null>(null);
  const [editingTag, setEditingTag] = useState<{oldTag: string, newTag: string} | null>(null);
  
  // Bulk selection and deletion state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Spaced repetition study session state
  const [studyItems, setStudyItems] = useState<KnowledgeItem[]>([]);
  const [showStudySettingsModal, setShowStudySettingsModal] = useState(false);
  const [studySessionStats, setStudySessionStats] = useState({
    totalReviewed: 0,
    newCards: 0,
    reviewCards: 0
  });
  
  // Study settings with defaults - simplified to just max cards per session
  const [studySettings, setStudySettings] = useLocalStorage('knowledge-base-study-settings', {
    maxCardsPerSession: 20
  });
  
  // Today's study progress tracking
  const [dailyProgress, setDailyProgress] = useLocalStorage('knowledge-base-daily-progress', {
    date: new Date().toDateString(),
    cardsStudied: 0,
    totalDueCards: 0
  });
  
  // Files data
  const [fileMap, setFileMap] = useState<Record<string, string>>({});
  
  // Load knowledge items on component mount
  useEffect(() => {
    if (user) {
      loadKnowledgeItems();
      loadFileData();
    }
  }, [user]);
  
  // Reset selected items when leaving selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedItems([]);
    }
  }, [selectionMode]);
  
  // Debug useEffect to track study mode and current study item changes
  useEffect(() => {
    console.log("Study mode state changed:", { 
      isStudyMode, 
      hasCurrentItem: !!currentStudyItem,
      studyItemsCount: studyItems.length,
      currentIndex: studyItemIndex
    });
    
    if (isStudyMode && !currentStudyItem && studyItems.length > 0) {
      console.warn("Study mode is active but no current item is set!");
      // Try to recover by setting the current item
      setCurrentStudyItem(studyItems[0]);
      setStudyItemIndex(0);
    }
  }, [isStudyMode, currentStudyItem, studyItems, studyItemIndex]);
  
  // Add effect to reset daily progress at midnight
  useEffect(() => {
    const today = new Date().toDateString();
    if (dailyProgress.date !== today) {
      setDailyProgress({
        date: today,
        cardsStudied: 0,
        totalDueCards: 0
      });
    }
  }, [dailyProgress, setDailyProgress]);
  
  // Modify the filtering effect to calculate the correct number of cards due for review
  useEffect(() => {
    console.log(`Filtering items for view: ${activeView}, with ${selectedTags.length} selected tags`);
    
    if (!user || items.length === 0) return;
    
    const filterItems = async () => {
      setIsLoading(true);
      
      try {
        let filtered: KnowledgeItem[] = [];
        const today = new Date();
        
        // Count cards due for review - only count flashcards and quizzes
        const dueCardsCount = items.filter(item => {
          // Only count flashcards and quizzes
          if (item.type !== 'flashcard' && item.type !== 'quiz') return false;
          
          // Count new items (never reviewed)
          if (!item.nextReviewDate || !item.lastReviewed) return true;
          
          // Count items due for review
          const nextReviewDate = new Date(item.nextReviewDate);
          return nextReviewDate <= today;
        }).length;
        
        console.log(`Found ${dueCardsCount} cards due for review today`);
        
        // Update total due cards count in daily progress
        setDailyProgress(prev => ({
          ...prev,
          totalDueCards: dueCardsCount
        }));
        
        // First, filter by view type
        switch (activeView) {
          case 'all':
            filtered = [...items];
            console.log(`'All' view selected: starting with ${filtered.length} items`);
            break;
            
          case 'due':
            // Include both new items (never reviewed) and items that are due for review
            filtered = items.filter(item => {
              // New items (never reviewed) should be included
              if (!item.nextReviewDate || !item.lastReviewed) {
                console.log(`Item ${item.id.slice(0, 6)}... is a new item, including in due`);
                return true;
              }
              
              // Calculate if the item is due based on next review date
              const nextReviewDate = new Date(item.nextReviewDate);
              const isDue = nextReviewDate <= today;
              
              if (isDue) {
                console.log(`Item ${item.id.slice(0, 6)}... is due for review on ${nextReviewDate.toLocaleDateString()}`);
              }
              
              return isDue;
            });
            
            console.log(`'Due' view selected: found ${filtered.length} items due for review (including new items)`);
            
            // Log some sample due items for debugging
            if (filtered.length > 0) {
              console.log('Sample due items:');
              filtered.slice(0, 3).forEach(item => {
                console.log(`- ${item.id.slice(0, 6)}...: type=${item.type}, nextReview=${item.nextReviewDate ? new Date(item.nextReviewDate).toLocaleDateString() : 'never'}`);
              });
            }
            break;
            
          case 'flashcards':
            // Get only flashcard items
            filtered = items.filter(item => item.type === 'flashcard');
            console.log(`'Flashcards' view selected: found ${filtered.length} flashcards`);
            break;
            
          case 'quizzes':
            // Get only quiz items
            filtered = items.filter(item => item.type === 'quiz');
            console.log(`'Quizzes' view selected: found ${filtered.length} quizzes`);
            break;
        }
        
        // Then, filter by tags if any are selected
        if (selectedTags.length > 0) {
          const beforeTagFilter = filtered.length;
          filtered = filtered.filter(item => {
            const itemTags = item.tags as string[] || [];
            // Item must have ALL selected tags to be included
            return selectedTags.every(tag => itemTags.includes(tag));
          });
          console.log(`Tag filtering: reduced from ${beforeTagFilter} to ${filtered.length} items`);
          console.log(`Selected tags: ${selectedTags.join(', ')}`);
        }
        
        // Log summary of filtered items
        const flashcardCount = filtered.filter(item => item.type === 'flashcard').length;
        const quizCount = filtered.filter(item => item.type === 'quiz').length;
        console.log(`Final filter result: ${filtered.length} total items (${flashcardCount} flashcards, ${quizCount} quizzes)`);
        
        setFilteredItems(filtered);
      } catch (error) {
        console.error('Error filtering items:', error);
        toast({
          title: 'Error',
          description: 'Failed to filter items',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    filterItems();
  }, [activeView, selectedTags, items, user]);
  
  // Load file data for display
  const loadFileData = async () => {
    // In a real implementation, you would fetch file names
    // from the database to display proper names instead of IDs
    // For now, we'll use placeholder data
    
    const files: Record<string, string> = {};
    
    // TODO: Replace with actual API calls to get file names
    // This would involve mapping the IDs to their names
    
    setFileMap(files);
  };
  
  // Load all knowledge items for the current user
  const loadKnowledgeItems = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await getKnowledgeItemsByUser(user.id);
      
      if (error) {
        toast({
          title: 'Error loading knowledge items',
          description: error,
          variant: 'destructive',
        });
        return;
      }
      
      if (data) {
        setItems(data);
        setFilteredItems(data);
        setAvailableTags(extractTags(data));
      }
    } catch (error) {
      console.error('Error loading knowledge items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load knowledge items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Prepare study items for a session based on spaced repetition
  const prepareStudySession = () => {
    if (filteredItems.length === 0) {
      toast({
        title: 'No items to study',
        description: 'Add some flashcards or quiz questions first',
        variant: 'destructive',
      });
      return false;
    }
    
    // Reset session stats
    setStudySessionStats({
      totalReviewed: 0,
      newCards: 0,
      reviewCards: 0
    });
    
    // Debug logging
    console.log(`Starting study session preparation, ${filteredItems.length} total items available`);
    
    const today = new Date();
    
    // Sort the items into due, overdue, and new categories
    const dueCards: KnowledgeItem[] = [];
    const overdueCards: KnowledgeItem[] = [];
    const newCards: KnowledgeItem[] = [];
    const notDueCards: KnowledgeItem[] = []; // Cards not yet due but available for study
    
    // Count different types of cards (for debugging)
    let flashcardCount = 0;
    let quizCount = 0;
    
    filteredItems.forEach(item => {
      // Include both flashcards and quizzes
      if (item.type === 'flashcard') {
        flashcardCount++;
      } else if (item.type === 'quiz') {
        quizCount++;
      } else {
        return; // Skip other item types
      }
      
      if (!item.nextReviewDate || !item.lastReviewed) {
        // Never reviewed before - it's a new card
        newCards.push(item);
      } else {
        const nextReviewDate = new Date(item.nextReviewDate);
        const daysDiff = Math.floor((today.getTime() - nextReviewDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 7) {
          // More than a week overdue
          overdueCards.push(item);
        } else if (daysDiff >= 0) {
          // Due today or overdue but less than a week
          dueCards.push(item);
        } else {
          // Not yet due, but available for study
          notDueCards.push(item);
        }
      }
    });
    
    // Debug logging for card counts
    console.log(`Found ${flashcardCount} flashcards and ${quizCount} quizzes`);
    console.log(`Card categories: ${overdueCards.length} overdue, ${dueCards.length} due, ${newCards.length} new, ${notDueCards.length} not yet due`);
    
    // Sort overdue by how overdue they are (most overdue first)
    overdueCards.sort((a, b) => {
      const dateA = new Date(a.nextReviewDate || 0);
      const dateB = new Date(b.nextReviewDate || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Sort due cards by due date
    dueCards.sort((a, b) => {
      const dateA = new Date(a.nextReviewDate || 0);
      const dateB = new Date(b.nextReviewDate || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Sort not-due cards by how close they are to being due
    notDueCards.sort((a, b) => {
      const dateA = new Date(a.nextReviewDate || 0);
      const dateB = new Date(b.nextReviewDate || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Sort new cards randomly
    newCards.sort(() => Math.random() - 0.5);
    
    // Combine cards with priority: overdue > due > new > not yet due
    let sessionCards = [...overdueCards, ...dueCards, ...newCards];
    
    // If we don't have enough cards yet, include not due cards
    if (sessionCards.length < studySettings.maxCardsPerSession) {
      sessionCards = [...sessionCards, ...notDueCards];
    }
    
    // Limit to max cards per session
    sessionCards = sessionCards.slice(0, studySettings.maxCardsPerSession);
    
    console.log(`Final study session prepared with ${sessionCards.length} cards`);
    
    if (sessionCards.length === 0) {
      toast({
        title: 'No cards to study',
        description: 'There are no cards available for study at this time.',
        variant: 'default',
      });
      return false;
    }
    
    // Set up the study session
    setStudyItems(sessionCards);
    setStudyItemIndex(0);
    setCurrentStudyItem(sessionCards[0]);
    setIsFlashcardFlipped(false);
    
    toast({
      title: 'Study session prepared',
      description: `Ready to study ${sessionCards.length} cards`,
    });
    
    return true;
  };
  
  // Start study session with spaced repetition
  const startStudySession = () => {
    console.log("Starting study session...");
    
    // First reset any existing state
    setStudyItems([]);
    setCurrentStudyItem(null);
    setStudyItemIndex(0);
    setIsFlashcardFlipped(false);
    
    // Prepare the session
    const success = prepareStudySession();
    
    if (success) {
      console.log("Study session prepared successfully, enabling study mode");
      setIsStudyMode(true);
    } else {
      console.warn("Failed to prepare study session");
    }
  };
  
  // Move to next item in study session
  const goToNextStudyItem = () => {
    const nextIndex = studyItemIndex + 1;
    
    if (nextIndex < studyItems.length) {
      setStudyItemIndex(nextIndex);
      setCurrentStudyItem(studyItems[nextIndex]);
      setIsFlashcardFlipped(false);
    } else {
      // End of study session
      toast({
        title: 'Study session complete',
        description: `You've reviewed ${studySessionStats.totalReviewed} items (${studySessionStats.newCards} new, ${studySessionStats.reviewCards} review)`,
      });
      setIsStudyMode(false);
    }
  };
  
  // Record study result and update item
  const recordStudyResult = async (item: KnowledgeItem, quality: RecallQuality) => {
    if (!user) return;
    
    try {
      // Track if this is a new card or review card
      const isNewCard = !item.lastReviewed || !item.nextReviewDate;
      
      // Calculate next review date using spaced repetition algorithm
      const { nextReviewDate, easeFactor, interval } = calculateNextReview(item, quality);
      
      // Calculate new performance score
      const performance = calculatePerformance(item, quality);
      
      // Update item in database
      await updateKnowledgeItem(
        {
          lastReviewed: new Date().toISOString(),
          nextReviewDate: nextReviewDate.toISOString(),
          easeFactor,
          interval,
          performance,
          reviewCount: (item.reviewCount || 0) + 1,
        },
        item.id
      );
      
      // Update local state
      setItems(prevItems => 
        prevItems.map(i => 
          i.id === item.id 
            ? { 
                ...i, 
                lastReviewed: new Date().toISOString(), 
                nextReviewDate: nextReviewDate.toISOString(),
                easeFactor,
                interval,
                performance,
                reviewCount: (i.reviewCount || 0) + 1,
              } 
            : i
        )
      );
      
      // Update session stats
      if (isNewCard) {
        setStudySessionStats((prev) => ({
          ...prev,
          newCards: prev.newCards + 1,
          totalReviewed: prev.totalReviewed + 1
        }));
      } else {
        setStudySessionStats((prev) => ({
          ...prev,
          reviewCards: prev.reviewCards + 1,
          totalReviewed: prev.totalReviewed + 1
        }));
      }
      
      // Update daily progress
      setDailyProgress(prev => ({
        ...prev,
        cardsStudied: prev.cardsStudied + 1
      }));
      
      // Move to next item
      goToNextStudyItem();
    } catch (error) {
      console.error('Error updating knowledge item:', error);
      toast({
        title: 'Error',
        description: 'Failed to record study result',
        variant: 'destructive',
      });
    }
  };
  
  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  
  // Render flashcard study item
  const renderFlashcardStudyItem = () => {
    if (!currentStudyItem) return null;
    
    const content = getFlashcardContent(currentStudyItem);
    if (!content) return null;
    
    return (
      <div className="max-w-2xl mx-auto">
        <div 
          className="bg-[#1e1e2e] border border-[#4A4A67] rounded-lg p-8 shadow-xl cursor-pointer min-h-[300px]"
          onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
        >
          <div className="flex flex-col h-full justify-center items-center">
            {!isFlashcardFlipped ? (
              <>
                <div className="text-xs uppercase text-gray-400 mb-4">Question</div>
                <div className="text-xl text-white text-center">{content.front}</div>
                <div className="mt-6 text-sm text-gray-400">Click to flip</div>
              </>
            ) : (
              <>
                <div className="text-xs uppercase text-gray-400 mb-4">Answer</div>
                <div className="text-xl text-white text-center">{content.back}</div>
              </>
            )}
          </div>
        </div>
        
        {isFlashcardFlipped && (
          <div className="mt-6 flex justify-center space-x-4">
            <button 
              className="px-4 py-2 bg-red-800 text-white rounded"
              onClick={() => recordStudyResult(currentStudyItem, 0)}
            >
              Didn't Know
            </button>
            <button 
              className="px-4 py-2 bg-yellow-700 text-white rounded"
              onClick={() => recordStudyResult(currentStudyItem, 3)}
            >
              Hard
            </button>
            <button 
              className="px-4 py-2 bg-blue-700 text-white rounded" 
              onClick={() => recordStudyResult(currentStudyItem, 4)}
            >
              Good
            </button>
            <button 
              className="px-4 py-2 bg-green-700 text-white rounded"
              onClick={() => recordStudyResult(currentStudyItem, 5)}
            >
              Easy
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // Render quiz study item
  const renderQuizStudyItem = () => {
    if (!currentStudyItem) return null;
    
    const content = getQuizContent(currentStudyItem);
    if (!content) return null;
    
    // Find the correct option index
    const correctOptionIndex = content.options.findIndex(option => option.isCorrect);
    
    const handleOptionSelect = (index: number) => {
      if (hasAnswered) return;
      
      setSelectedOption(index);
      setHasAnswered(true);
      
      // Calculate quality score based on selection
      const quality: RecallQuality = index === correctOptionIndex ? 5 : 0;
      
      // Record the result after a short delay
      setTimeout(() => {
        recordStudyResult(currentStudyItem, quality);
        setSelectedOption(null);
        setHasAnswered(false);
      }, 1500);
    };
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#1e1e2e] border border-[#4A4A67] rounded-lg p-8 shadow-xl">
          <div className="text-xl text-white mb-6">{content.question}</div>
          
          <div className="space-y-3">
            {content.options.map((option, index) => {
              let optionClass = "p-4 rounded-lg cursor-pointer transition-colors";
              
              if (hasAnswered) {
                if (index === correctOptionIndex) {
                  optionClass += " bg-green-800 border border-green-500";
                } else if (index === selectedOption) {
                  optionClass += " bg-red-800 border border-red-500";
                } else {
                  optionClass += " bg-[#2d2d3a] opacity-50";
                }
              } else {
                optionClass += " bg-[#2d2d3a] hover:bg-[#3d3d4d]";
              }
              
              return (
                <div 
                  key={index}
                  className={optionClass}
                  onClick={() => handleOptionSelect(index)}
                >
                  <div className="text-white">{option.text}</div>
                </div>
              );
            })}
          </div>
          
          {hasAnswered && (
            <div className={`mt-6 p-4 rounded-lg ${selectedOption === correctOptionIndex ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
              {selectedOption === correctOptionIndex 
                ? 'Correct!' 
                : `Incorrect. The correct answer is: ${content.options[correctOptionIndex].text}`}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render study mode
  const renderStudyMode = () => {
    if (!currentStudyItem) return null;
    
    const isNewCard = !currentStudyItem.lastReviewed || !currentStudyItem.nextReviewDate;
    const cardType = isNewCard ? 'New' : 'Review';
    
    return (
      <div className="py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Study Session ({studyItemIndex + 1}/{studyItems.length})
            </h2>
            <div className="flex items-center mt-2 text-sm text-gray-400">
              <span className={isNewCard ? 'text-blue-400' : 'text-green-400'}>
                {cardType} Card
              </span>
              <span className="mx-2">•</span>
              <span>
                Session progress: {studySessionStats.totalReviewed} studied
                ({studySessionStats.newCards} new, {studySessionStats.reviewCards} review)
              </span>
            </div>
          </div>
          <button 
            className="px-4 py-2 bg-[#2d2d3a] text-white rounded hover:bg-[#3d3d4d]"
            onClick={() => setIsStudyMode(false)}
          >
            Exit
          </button>
        </div>
        
        {currentStudyItem.type === 'flashcard' 
          ? renderFlashcardStudyItem() 
          : renderQuizStudyItem()}
      </div>
    );
  };
  
  // Delete a knowledge item
  const handleDeleteItem = async (item: KnowledgeItem) => {
    if (!user) return;
    
    setEditingItem(item);
    setShowDeleteConfirm(true);
  };
  
  // Confirm delete action
  const confirmDelete = async () => {
    if (!editingItem) return;
    
    try {
      await deleteKnowledgeItem(editingItem.id);
      
      // Update local state
      const updatedItems = items.filter(item => item.id !== editingItem.id);
      setItems(updatedItems);
      setFilteredItems(filteredItems.filter(item => item.id !== editingItem.id));
      
      toast({
        title: 'Item deleted',
        description: 'Knowledge item has been removed',
      });
      
      setShowDeleteConfirm(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };
  
  // Edit a knowledge item
  const handleEditItem = (item: KnowledgeItem) => {
    setEditingItem(item);
    
    if (item.type === 'flashcard') {
      const content = getFlashcardContent(item);
      setEditedContent(content);
    } else if (item.type === 'quiz') {
      const content = getQuizContent(item);
      setEditedContent(content);
    }
    
    setShowEditModal(true);
  };
  
  // Save edited content
  const saveEditedContent = async () => {
    if (!editingItem || !editedContent) return;
    
    try {
      await updateKnowledgeItem(
        {
          content: editedContent,
          updatedAt: new Date().toISOString(),
        },
        editingItem.id
      );
      
      // Update local state
      const updatedItems = items.map(item => 
        item.id === editingItem.id 
          ? { ...item, content: editedContent, updatedAt: new Date().toISOString() } 
          : item
      );
      
      setItems(updatedItems);
      setFilteredItems(
        filteredItems.map(item => 
          item.id === editingItem.id 
            ? { ...item, content: editedContent, updatedAt: new Date().toISOString() } 
            : item
        )
      );
      
      toast({
        title: 'Item updated',
        description: 'Knowledge item has been updated',
      });
      
      setShowEditModal(false);
      setEditingItem(null);
      setEditedContent(null);
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      });
    }
  };
  
  // Manage tags
  const handleManageTags = (item: KnowledgeItem) => {
    setEditingItem(item);
    setShowTagsModal(true);
  };
  
  // Add a new tag
  const addTag = async () => {
    if (!editingItem || !editTagInput.trim()) return;
    
    const newTag = editTagInput.trim().toLowerCase();
    
    // Skip if tag already exists
    if ((editingItem.tags as string[] || []).includes(newTag)) {
      setEditTagInput('');
      return;
    }
    
    const updatedTags = [...(editingItem.tags as string[] || []), newTag];
    
    try {
      await updateKnowledgeItem(
        {
          tags: updatedTags,
          updatedAt: new Date().toISOString(),
        },
        editingItem.id
      );
      
      // Update local state
      const updatedItems = items.map(item => 
        item.id === editingItem.id 
          ? { ...item, tags: updatedTags, updatedAt: new Date().toISOString() } 
          : item
      );
      
      setItems(updatedItems);
      setFilteredItems(
        filteredItems.map(item => 
          item.id === editingItem.id 
            ? { ...item, tags: updatedTags, updatedAt: new Date().toISOString() } 
            : item
        )
      );
      
      // Update available tags
      if (!availableTags.includes(newTag)) {
        setAvailableTags([...availableTags, newTag].sort());
      }
      
      setEditTagInput('');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to add tag',
        variant: 'destructive',
      });
    }
  };
  
  // Remove a tag
  const removeTag = async (tagToRemove: string) => {
    if (!editingItem) return;
    
    const updatedTags = (editingItem.tags as string[] || []).filter(tag => tag !== tagToRemove);
    
    try {
      await updateKnowledgeItem(
        {
          tags: updatedTags,
          updatedAt: new Date().toISOString(),
        },
        editingItem.id
      );
      
      // Update local state
      const updatedItems = items.map(item => 
        item.id === editingItem.id 
          ? { ...item, tags: updatedTags, updatedAt: new Date().toISOString() } 
          : item
      );
      
      setItems(updatedItems);
      setFilteredItems(
        filteredItems.map(item => 
          item.id === editingItem.id 
            ? { ...item, tags: updatedTags, updatedAt: new Date().toISOString() } 
            : item
        )
      );
      
      // Check if tag should be removed from available tags
      const tagExists = updatedItems.some(item => 
        (item.tags as string[] || []).includes(tagToRemove)
      );
      
      if (!tagExists) {
        setAvailableTags(availableTags.filter(tag => tag !== tagToRemove));
      }
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove tag',
        variant: 'destructive',
      });
    }
  };
  
  // Start editing a tag
  const startEditTag = (tag: string) => {
    setEditingTag({ oldTag: tag, newTag: tag });
  };
  
  // Cancel tag edit
  const cancelEditTag = () => {
    setEditingTag(null);
  };
  
  // Save edited tag
  const saveEditTag = async () => {
    if (!editingItem || !editingTag) return;
    
    const { oldTag, newTag } = editingTag;
    
    if (!newTag.trim() || oldTag === newTag.trim()) {
      setEditingTag(null);
      return;
    }
    
    const formattedNewTag = newTag.trim().toLowerCase();
    
    // Skip if new tag already exists in the item
    if ((editingItem.tags as string[] || []).includes(formattedNewTag)) {
      toast({
        title: 'Tag already exists',
        description: 'This item already has this tag',
        variant: 'destructive',
      });
      setEditingTag(null);
      return;
    }
    
    // Replace the old tag with the new one
    const existingTags = editingItem.tags as string[] || [];
    const updatedTags = existingTags.map(tag => 
      tag === oldTag ? formattedNewTag : tag
    );
    
    try {
      await updateKnowledgeItem(
        {
          tags: updatedTags,
          updatedAt: new Date().toISOString(),
        },
        editingItem.id
      );
      
      // Update local state
      const updatedItems = items.map(item => 
        item.id === editingItem.id 
          ? { ...item, tags: updatedTags, updatedAt: new Date().toISOString() } 
          : item
      );
      
      setItems(updatedItems);
      setFilteredItems(
        filteredItems.map(item => 
          item.id === editingItem.id 
            ? { ...item, tags: updatedTags, updatedAt: new Date().toISOString() } 
            : item
        )
      );
      
      // Update available tags
      if (!availableTags.includes(formattedNewTag)) {
        const newAvailableTags = [...availableTags, formattedNewTag];
        
        // Check if old tag should be removed from available tags
        const oldTagExists = updatedItems.some(item => 
          (item.tags as string[] || []).includes(oldTag)
        );
        
        if (!oldTagExists) {
          const filteredTags = newAvailableTags.filter(tag => tag !== oldTag);
          setAvailableTags(filteredTags.sort());
        } else {
          setAvailableTags(newAvailableTags.sort());
        }
      }
      
      toast({
        title: 'Tag updated',
        description: `Changed "${oldTag}" to "${formattedNewTag}"`,
      });
      
      setEditingTag(null);
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tag',
        variant: 'destructive',
      });
    }
  };
  
  // Render item grid for normal view
  const renderItemGrid = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6052A8]"></div>
        </div>
      );
    }
    
    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="bg-[#2d2d3a] p-5 rounded-xl inline-block mb-4">
            <FiPlus className="text-[#8B5CF6] text-4xl" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No items found</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {activeView === 'due' 
              ? "You're all caught up! No items are due for review."
              : "Create flashcards and quizzes from your documents to start learning."}
          </p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div 
            key={item.id}
            className={`bg-[#1e1e2e] border ${selectedItems.includes(item.id) ? 'border-[#6052A8]' : 'border-[#4A4A67]'} rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col h-full relative`}
          >
            {/* Selection checkbox (only visible in selection mode) */}
            {selectionMode && (
              <div className="absolute top-3 left-3 z-10">
                <div 
                  className={`w-5 h-5 border rounded flex items-center justify-center transition-colors cursor-pointer
                    ${selectedItems.includes(item.id) 
                      ? 'bg-[#6052A8] border-[#6052A8]' 
                      : 'bg-[#2d2d3a] border-[#4A4A67] hover:bg-[#3d3d4d]'
                    }`}
                  onClick={() => toggleItemSelection(item.id)}
                >
                  {selectedItems.includes(item.id) && (
                    <FiCheck className="text-white text-sm" />
                  )}
                </div>
              </div>
            )}
            
            {/* Card header with type icon and title */}
            <div className={`mb-2 ${selectionMode ? 'pl-7' : ''}`}>
              <div className="flex items-center">
                <div className={`text-xl mr-2 ${item.type === 'flashcard' ? 'text-blue-400' : 'text-green-400'}`}>
                  {item.type === 'flashcard' ? '🗃️' : '❓'}
                </div>
                <div className="text-white font-medium line-clamp-2 overflow-hidden">
                  {item.type === 'flashcard' 
                    ? (getFlashcardContent(item)?.front || '').substring(0, 30) + (getFlashcardContent(item)?.front && getFlashcardContent(item)!.front.length > 30 ? '...' : '')
                    : (getQuizContent(item)?.question || '').substring(0, 30) + (getQuizContent(item)?.question && getQuizContent(item)!.question.length > 30 ? '...' : '')}
                </div>
              </div>
            </div>
            
            {/* Review metadata */}
            <div className="flex items-center text-xs text-gray-400 mt-1 mb-2">
              <div className="flex items-center mr-3">
                <FiClock className="mr-1" />
                <span>
                  {item.nextReviewDate 
                    ? new Date(item.nextReviewDate).toLocaleDateString() 
                    : 'Not reviewed'}
                </span>
              </div>
              
              {item.reviewCount !== undefined && item.reviewCount !== null && item.reviewCount > 0 && (
                <div className="flex items-center">
                  <FiCheck className="mr-1" />
                  <span>{item.reviewCount} reviews</span>
                </div>
              )}
            </div>
            
            {/* Tags */}
            {item.tags && (item.tags as string[]).length > 0 && (
              <div className="mt-1 mb-auto flex flex-wrap gap-1">
                {(item.tags as string[]).map(tag => (
                  <span 
                    key={tag}
                    className="inline-block px-2 py-0.5 bg-[#2d2d3a] text-xs rounded text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Action buttons at bottom */}
            <div className="flex justify-end mt-auto pt-3 border-t border-[#2d2d3a] space-x-2">
              {!selectionMode ? (
                <>
                  <button 
                    className="p-1.5 bg-[#2d2d3a] text-gray-300 rounded hover:bg-[#3d3d4d]"
                    onClick={() => handleEditItem(item)}
                    title="Edit content"
                  >
                    ✏️
                  </button>
                  <button 
                    className="p-1.5 bg-[#2d2d3a] text-gray-300 rounded hover:bg-[#3d3d4d]"
                    onClick={() => handleManageTags(item)}
                    title="Manage tags"
                  >
                    🏷️
                  </button>
                  <button 
                    className="p-1.5 bg-[#2d2d3a] text-gray-300 rounded hover:bg-red-700"
                    onClick={() => handleDeleteItem(item)}
                    title="Delete item"
                  >
                    🗑️
                  </button>
                </>
              ) : (
                <button 
                  className={`px-3 py-1.5 rounded text-sm ${
                    selectedItems.includes(item.id)
                      ? 'bg-[#6052A8] text-white'
                      : 'bg-[#2d2d3a] text-gray-300 hover:bg-[#3d3d4d]'
                  }`}
                  onClick={() => toggleItemSelection(item.id)}
                >
                  {selectedItems.includes(item.id) ? 'Selected' : 'Select'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render modals
  const renderModals = () => {
    return (
      <>
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e2e] rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Delete Item</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 bg-[#2d2d3a] text-white rounded hover:bg-[#3d3d4d]"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e2e] rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Delete Multiple Items</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete {selectedItems.length} selected item{selectedItems.length !== 1 ? 's' : ''}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 bg-[#2d2d3a] text-white rounded hover:bg-[#3d3d4d]"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={confirmBulkDelete}
                >
                  Delete {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Content Modal */}
        {showEditModal && editingItem && editedContent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e2e] rounded-lg p-6 max-w-xl w-full">
              <h3 className="text-xl font-semibold text-white mb-4">
                Edit {editingItem.type === 'flashcard' ? 'Flashcard' : 'Quiz'}
              </h3>
              
              {editingItem.type === 'flashcard' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Front (Question)</label>
                    <textarea 
                      className="w-full p-3 bg-[#2d2d3a] text-white rounded border border-[#4A4A67] focus:border-[#6052A8] focus:outline-none"
                      rows={4}
                      value={(editedContent as FlashcardContent).front}
                      onChange={(e) => setEditedContent({
                        ...(editedContent as FlashcardContent),
                        front: e.target.value
                      })}
                      aria-label="Flashcard front (question)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Back (Answer)</label>
                    <textarea 
                      className="w-full p-3 bg-[#2d2d3a] text-white rounded border border-[#4A4A67] focus:border-[#6052A8] focus:outline-none"
                      rows={4}
                      value={(editedContent as FlashcardContent).back}
                      onChange={(e) => setEditedContent({
                        ...(editedContent as FlashcardContent),
                        back: e.target.value
                      })}
                      aria-label="Flashcard back (answer)"
                    />
                  </div>
                </div>
              )}
              
              {editingItem.type === 'quiz' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Question</label>
                    <textarea 
                      className="w-full p-3 bg-[#2d2d3a] text-white rounded border border-[#4A4A67] focus:border-[#6052A8] focus:outline-none"
                      rows={3}
                      value={(editedContent as QuizContent).question}
                      onChange={(e) => setEditedContent({
                        ...(editedContent as QuizContent),
                        question: e.target.value
                      })}
                      aria-label="Quiz question"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Options</label>
                    {(editedContent as QuizContent).options.map((option, index) => (
                      <div key={index} className="flex items-center mb-2">
                        <input 
                          type="radio"
                          className="mr-2"
                          checked={option.isCorrect}
                          onChange={() => {
                            const updatedOptions = (editedContent as QuizContent).options.map((opt, i) => ({
                              ...opt,
                              isCorrect: i === index
                            }));
                            setEditedContent({
                              ...(editedContent as QuizContent),
                              options: updatedOptions
                            });
                          }}
                          aria-label={`Mark option ${index + 1} as correct answer`}
                        />
                        <input 
                          className="flex-1 p-2 bg-[#2d2d3a] text-white rounded border border-[#4A4A67] focus:border-[#6052A8] focus:outline-none"
                          value={option.text}
                          onChange={(e) => {
                            const updatedOptions = [...(editedContent as QuizContent).options];
                            updatedOptions[index] = {
                              ...updatedOptions[index],
                              text: e.target.value
                            };
                            setEditedContent({
                              ...(editedContent as QuizContent),
                              options: updatedOptions
                            });
                          }}
                          aria-label={`Option ${index + 1} text`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  className="px-4 py-2 bg-[#2d2d3a] text-white rounded hover:bg-[#3d3d4d]"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                    setEditedContent(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-[#6052A8] text-white rounded hover:bg-[#7262B8]"
                  onClick={saveEditedContent}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Manage Tags Modal */}
        {showTagsModal && editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1e1e2e] rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Manage Tags</h3>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Current Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {((editingItem.tags as string[]) || []).length > 0 ? (
                    ((editingItem.tags as string[]) || []).map(tag => (
                      <div 
                        key={tag} 
                        className="bg-[#2d2d3a] text-gray-300 rounded-full px-3 py-1 text-sm flex items-center"
                      >
                        {editingTag && editingTag.oldTag === tag ? (
                          <input
                            type="text"
                            className="w-20 bg-[#3d3d4d] text-white rounded border border-[#6052A8] px-1"
                            value={editingTag.newTag}
                            onChange={(e) => setEditingTag({
                              ...editingTag,
                              newTag: e.target.value
                            })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditTag();
                              if (e.key === 'Escape') cancelEditTag();
                            }}
                            autoFocus
                            aria-label="Edit tag name"
                          />
                        ) : (
                          <>
                            #{tag}
                            <div className="ml-2 flex">
                              <button 
                                className="text-gray-400 hover:text-white mr-1"
                                onClick={() => startEditTag(tag)}
                                title="Edit tag"
                              >
                                ✏️
                              </button>
                              <button 
                                className="text-gray-400 hover:text-white"
                                onClick={() => removeTag(tag)}
                                title="Remove tag"
                              >
                                ✕
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No tags yet</p>
                  )}
                </div>
                
                {editingTag && (
                  <div className="flex justify-end space-x-2 mt-2">
                    <button 
                      className="px-2 py-1 bg-[#2d2d3a] text-white text-sm rounded hover:bg-[#3d3d4d]"
                      onClick={cancelEditTag}
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-2 py-1 bg-[#6052A8] text-white text-sm rounded hover:bg-[#7262B8]"
                      onClick={saveEditTag}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Add New Tag</label>
                <div className="flex">
                  <input 
                    type="text"
                    className="flex-1 p-2 bg-[#2d2d3a] text-white rounded-l border border-[#4A4A67] focus:border-[#6052A8] focus:outline-none"
                    placeholder="Enter tag name"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTag();
                    }}
                    aria-label="New tag name"
                  />
                  <button 
                    className="px-4 py-2 bg-[#6052A8] text-white rounded-r hover:bg-[#7262B8]"
                    onClick={addTag}
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <button 
                  className="px-4 py-2 bg-[#2d2d3a] text-white rounded hover:bg-[#3d3d4d]"
                  onClick={() => {
                    setShowTagsModal(false);
                    setEditingItem(null);
                    setEditTagInput('');
                    setEditingTag(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };
  
  // Render study settings modal - simplified to just max cards per session
  const renderStudySettingsModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#1e1e2e] rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-semibold text-white mb-4">Study Settings</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2" id="max-cards-label">
              Maximum cards per session
            </label>
            <input 
              type="number" 
              min="1" 
              max="100"
              className="w-full p-2 bg-[#2d2d3a] border border-[#4A4A67] rounded text-white"
              value={studySettings.maxCardsPerSession}
              onChange={(e) => setStudySettings({
                ...studySettings,
                maxCardsPerSession: parseInt(e.target.value) || 20
              })}
              aria-labelledby="max-cards-label"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 20 cards to avoid study fatigue
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <button
              className="px-4 py-2 bg-[#2d2d3a] text-white rounded hover:bg-[#3d3d4d] mr-2"
              onClick={() => setShowStudySettingsModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Add toggle item selection function
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };
  
  // Add selectAll function
  const selectAll = () => {
    setSelectedItems(filteredItems.map(item => item.id));
  };
  
  // Add deselectAll function
  const deselectAll = () => {
    setSelectedItems([]);
  };
  
  // Add handleBulkDeleteConfirm function
  const handleBulkDeleteConfirm = () => {
    if (selectedItems.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };
  
  // Add confirmBulkDelete function
  const confirmBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Process deletions sequentially
      for (const itemId of selectedItems) {
        await deleteKnowledgeItem(itemId);
      }
      
      // Update local state
      const updatedItems = items.filter(item => !selectedItems.includes(item.id));
      setItems(updatedItems);
      setFilteredItems(filteredItems.filter(item => !selectedItems.includes(item.id)));
      
      toast({
        title: 'Items deleted',
        description: `Successfully deleted ${selectedItems.length} items`,
      });
      
      // Reset selection states
      setSelectedItems([]);
      setSelectionMode(false);
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting items:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Navigation/Filter Bar */}
      {!isStudyMode && (
        <div className="mb-6 border-b border-[#2d2d3a] pb-4">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Knowledge Base</h2>
            
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-300 mr-2">
                      {selectedItems.length} selected
                    </span>
                    {selectedItems.length > 0 && (
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center mr-2"
                        onClick={handleBulkDeleteConfirm}
                      >
                        <FiTrash2 className="mr-2" />
                        Delete Selected
                      </button>
                    )}
                    {filteredItems.length > 0 && (
                      <div className="flex space-x-2 mr-2">
                        <button
                          className="px-3 py-2 bg-[#2d2d3a] text-gray-300 rounded hover:bg-[#3d3d4d] text-sm"
                          onClick={selectAll}
                        >
                          Select All
                        </button>
                        {selectedItems.length > 0 && (
                          <button
                            className="px-3 py-2 bg-[#2d2d3a] text-gray-300 rounded hover:bg-[#3d3d4d] text-sm"
                            onClick={deselectAll}
                          >
                            Deselect All
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    className="px-3 py-2 bg-[#2d2d3a] text-gray-300 rounded-lg hover:bg-[#3d3d4d] flex items-center"
                    onClick={() => setSelectionMode(false)}
                  >
                    <FiX className="mr-1" />
                    Exit Selection
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="px-4 py-2 bg-[#2d2d3a] text-gray-300 rounded-lg hover:bg-[#3d3d4d] flex items-center mr-2"
                    onClick={() => setSelectionMode(true)}
                  >
                    <FiCheck className="mr-2" />
                    Select Multiple
                  </button>
                  
                  <button
                    className="px-4 py-2 bg-[#2d2d3a] text-gray-300 rounded-lg hover:bg-[#3d3d4d] flex items-center mr-2"
                    onClick={() => setShowStudySettingsModal(true)}
                    title="Study Settings"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Study Settings
                  </button>
                  
                  <button
                    className="px-4 py-2 bg-[#6052A8] text-white rounded-lg hover:bg-[#7262B8] flex items-center"
                    onClick={() => {
                      console.log("Study button clicked");
                      // Force a re-render first
                      setIsLoading(true);
                      setTimeout(() => {
                        setIsLoading(false);
                        startStudySession();
                      }, 100);
                    }}
                  >
                    <FiClock className="mr-2" />
                    Start Study Session
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-2 rounded-lg ${activeView === 'all' ? 'bg-[#6052A8] text-white' : 'bg-[#2d2d3a] text-gray-300 hover:bg-[#3d3d4d]'}`}
              onClick={() => {
                setActiveView('all');
                // Clear tag filters when switching views to avoid confusion
                setSelectedTags([]);
              }}
            >
              All Items
            </button>
            <button
              className={`px-3 py-2 rounded-lg flex items-center ${activeView === 'due' ? 'bg-[#6052A8] text-white' : 'bg-[#2d2d3a] text-gray-300 hover:bg-[#3d3d4d]'}`}
              onClick={() => {
                setActiveView('due');
                setSelectedTags([]);
              }}
            >
              <FiClock className="mr-1" /> Due for Review
            </button>
            <button
              className={`px-3 py-2 rounded-lg ${activeView === 'flashcards' ? 'bg-[#6052A8] text-white' : 'bg-[#2d2d3a] text-gray-300 hover:bg-[#3d3d4d]'}`}
              onClick={() => {
                setActiveView('flashcards');
                setSelectedTags([]);
              }}
            >
              Flashcards
            </button>
            <button
              className={`px-3 py-2 rounded-lg ${activeView === 'quizzes' ? 'bg-[#6052A8] text-white' : 'bg-[#2d2d3a] text-gray-300 hover:bg-[#3d3d4d]'}`}
              onClick={() => {
                setActiveView('quizzes');
                setSelectedTags([]);
              }}
            >
              Quizzes
            </button>
          </div>
          
          {/* Daily Study Progress Bar */}
          <div className="mb-4 mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Today's Review Progress</span>
              <span>
                {dailyProgress.cardsStudied} of {dailyProgress.totalDueCards} due cards reviewed
              </span>
            </div>
            <div className="w-full h-2 bg-[#2d2d3a] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#6052A8] rounded-full"
                style={{ 
                  width: `${dailyProgress.totalDueCards > 0 ? 
                    Math.min(100, (dailyProgress.cardsStudied / dailyProgress.totalDueCards) * 100) : 0}%` 
                }}
              ></div>
            </div>
          </div>
          
          {/* Tag filters */}
          {availableTags.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="text-gray-400 flex items-center">
                <FiTag className="mr-1" /> Tags:
              </div>
              {availableTags.map(tag => (
                <button
                  key={tag}
                  className={`px-2 py-1 text-sm rounded-full ${selectedTags.includes(tag) ? 'bg-[#6052A8] text-white' : 'bg-[#2d2d3a] text-gray-300 hover:bg-[#3d3d4d]'}`}
                  onClick={() => toggleTag(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {isStudyMode ? renderStudyMode() : renderItemGrid()}
      </div>
      
      {/* Modals */}
      {renderModals()}
      {showStudySettingsModal && renderStudySettingsModal()}
    </div>
  );
};

export default KnowledgeBaseDashboard; 