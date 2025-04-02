'use client';

import React, { useState, useEffect } from 'react';
import { FiFolder, FiFile, FiChevronRight, FiChevronDown, FiCheckSquare, FiSquare, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { useAppState } from '@/lib/providers/state-provider';
import { getFiles, getFolders, getFileDetails } from '@/supabase/queries';
import { File, Folder } from '@/supabase/supabase';
import { useGemini } from '@/lib/hooks/useGemini';

interface FileItem extends File {
  type: 'file';
}

interface FolderItem extends Folder {
  type: 'folder';
  children?: (FileItem | FolderItem)[];
}

interface FileContext {
  title: string;
  content: string;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  flipped: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  userAnswerIndex: number | null;
}

type ContentType = 'flashcards' | 'quiz';

// Component to render file tree
const FileTree: React.FC<{
  items: (FileItem | FolderItem)[];
  level: number;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (id: string) => void;
  selectedFiles: Record<string, boolean>;
  toggleFileSelection: (item: FileItem | FolderItem) => void;
}> = ({ items, level, expandedFolders, toggleFolder, selectedFiles, toggleFileSelection }) => {
  if (!items || items.length === 0) return null;

  return (
    <ul className="ml-4">
      {items.map((item) => (
        <li key={item.id} className="py-1">
          <div 
            className="flex items-center hover:bg-gray-700 rounded px-1 py-0.5 cursor-pointer text-sm"
            onClick={() => item.type === 'folder' ? toggleFolder(item.id) : toggleFileSelection(item)}
          >
            <div className="mr-1.5" style={{ marginLeft: `${level * 4}px` }}>
              {item.type === 'folder' ? (
                expandedFolders[item.id] ? <FiChevronDown className="text-gray-400" /> : <FiChevronRight className="text-gray-400" />
              ) : (
                <div className="w-4 h-4 flex justify-center items-center">
                  {selectedFiles[item.id] ? 
                    <FiCheckSquare className="text-blue-500" /> : 
                    <FiSquare className="text-gray-400" />
                  }
                </div>
              )}
            </div>
            {item.type === 'folder' ? (
              <FiFolder className="mr-1.5 text-yellow-500" />
            ) : (
              <FiFile className="mr-1.5 text-blue-400" />
            )}
            <span className="text-gray-300 truncate">{item.title}</span>
          </div>
          
          {item.type === 'folder' && expandedFolders[item.id] && item.children && (
            <FileTree 
              items={item.children} 
              level={level + 1} 
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedFiles={selectedFiles}
              toggleFileSelection={toggleFileSelection}
            />
          )}
        </li>
      ))}
    </ul>
  );
};

// Component to render a flashcard
const FlashcardComponent: React.FC<{
  flashcard: Flashcard;
  toggleFlip: (id: string) => void;
}> = ({ flashcard, toggleFlip }) => {
  return (
    <div 
      className={`w-full bg-gray-800 rounded-lg shadow-md cursor-pointer transform transition-transform hover:scale-105 mb-4`}
      style={{ height: '220px' }}
      onClick={() => toggleFlip(flashcard.id)}
    >
      <div className="h-full flex items-center justify-center p-4">
        <div className="w-full h-full relative">
          <div 
            className={`absolute inset-0 backface-visibility-hidden bg-gray-800 border border-gray-700 rounded-lg flex flex-col justify-center items-center p-4 text-center transition-opacity duration-200 ${flashcard.flipped ? 'opacity-0' : 'opacity-100'}`}
          >
            <h3 className="text-white font-medium text-lg">{flashcard.question}</h3>
            <div className="mt-2 text-sm text-gray-400">Click to reveal answer</div>
          </div>
          <div 
            className={`absolute inset-0 backface-visibility-hidden bg-indigo-800 border border-indigo-700 rounded-lg flex flex-col justify-center items-center p-6 text-center transition-opacity duration-200 ${flashcard.flipped ? 'opacity-100' : 'opacity-0'}`}
          >
            <p className="text-white text-lg">{flashcard.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component to render a quiz question
const QuizComponent: React.FC<{
  question: QuizQuestion;
  onAnswer: (questionId: string, answerIndex: number) => void;
}> = ({ question, onAnswer }) => {
  return (
    <div className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h3 className="text-white font-medium mb-3">{question.question}</h3>
      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isSelected = question.userAnswerIndex === index;
          const isCorrect = question.userAnswerIndex !== null && index === question.correctAnswerIndex;
          const isWrong = isSelected && !isCorrect;
          
          return (
            <div 
              key={index}
              className={`p-3 rounded-md border cursor-pointer transition-colors
                ${isSelected ? 'border-blue-500' : 'border-gray-600'} 
                ${isCorrect ? 'bg-green-800 border-green-500' : ''}
                ${isWrong ? 'bg-red-800 border-red-500' : ''}
                ${question.userAnswerIndex === null ? 'hover:bg-gray-700' : ''}`}
              onClick={() => question.userAnswerIndex === null && onAnswer(question.id, index)}
            >
              <p className="text-white">{option}</p>
            </div>
          );
        })}
      </div>
      {question.userAnswerIndex !== null && (
        <div className={`mt-3 p-2 rounded ${question.userAnswerIndex === question.correctAnswerIndex ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
          {question.userAnswerIndex === question.correctAnswerIndex 
            ? 'Correct!' 
            : `Incorrect. The correct answer is: ${question.options[question.correctAnswerIndex]}`}
        </div>
      )}
    </div>
  );
};

const FlashcardQuizGenerator: React.FC = () => {
  const { state, workspaceId } = useAppState();
  const [contentType, setContentType] = useState<ContentType>('flashcards');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [selectedCount, setSelectedCount] = useState(0);
  const [fileStructure, setFileStructure] = useState<(FileItem | FolderItem)[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const { generateResponse, setApiKey } = useGemini();
  const [apiKey, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);

  // Load folders and files from database (similar to AiTutor)
  useEffect(() => {
    const fetchFilesAndFolders = async () => {
      if (!workspaceId) return;
      
      setIsLoadingFiles(true);

      try {
        const { data: foldersData, error: foldersError } = await getFolders(workspaceId);
        
        if (foldersError) {
          console.error('Error loading folders:', foldersError);
          setIsLoadingFiles(false);
          return;
        }

        const folderStructure: FolderItem[] = [];

        for (const folder of foldersData || []) {
          if (folder.inTrash) continue;
          
          const folderItem: FolderItem = {
            ...folder,
            type: 'folder',
            children: []
          };

          const { data: filesData, error: filesError } = await getFiles(folder.id);
          
          if (!filesError && filesData) {
            folderItem.children = filesData
              .filter(file => !file.inTrash)
              .map(file => ({
                ...file,
                type: 'file'
              }));
          }

          folderStructure.push(folderItem);
        }

        setFileStructure(folderStructure);
        
        if (folderStructure.length > 0) {
          setExpandedFolders(prev => ({
            ...prev,
            [folderStructure[0].id]: true
          }));
        }
      } catch (error) {
        console.error('Error setting up file structure:', error);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    fetchFilesAndFolders();
  }, [workspaceId]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleFileSelection = (item: FileItem | FolderItem) => {
    if (item.type === 'file') {
      setSelectedFiles(prev => {
        const newState = { ...prev };
        if (newState[item.id]) {
          delete newState[item.id];
          setSelectedCount(prev => prev - 1);
        } else {
          newState[item.id] = true;
          setSelectedCount(prev => prev + 1);
        }
        return newState;
      });
    }
  };

  // Get file content for a selected file by its ID
  const getFileContent = async (fileId: string): Promise<FileContext | null> => {
    try {
      const { data, error } = await getFileDetails(fileId);
      
      if (error || !data || data.length === 0 || !data[0].data) {
        console.error('Error fetching file content:', error || 'No data returned');
        return null;
      }
      
      // Use extractContentFromFileData helper if available or implement inline
      let textContent = '';
      try {
        const parsedData = JSON.parse(data[0].data);
        
        // Handle markdown content format
        if (parsedData.markdown && parsedData.content) {
          textContent = parsedData.content;
        } 
        // Handle regular Quill delta format
        else if (parsedData.ops) {
          textContent = parsedData.ops
            .map((op: any) => op.insert || '')
            .join('');
        }
        // Fallback
        else {
          textContent = data[0].data;
        }
      } catch (err) {
        console.error('Error parsing file data:', err);
        textContent = data[0].data;
      }
      
      return {
        title: data[0].title,
        content: textContent
      };
    } catch (error) {
      console.error('Error fetching file content:', error);
      return null;
    }
  };

  // Get content for all selected files
  const getSelectedFilesContent = async (): Promise<FileContext[]> => {
    const selectedFileIds = Object.entries(selectedFiles)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    const fileContents: FileContext[] = [];
    
    for (const fileId of selectedFileIds) {
      const fileContext = await getFileContent(fileId);
      if (fileContext) {
        fileContents.push(fileContext);
      }
    }
    
    return fileContents;
  };

  const toggleFlashcard = (id: string) => {
    setFlashcards(prevCards => 
      prevCards.map(card => 
        card.id === id ? { ...card, flipped: !card.flipped } : card
      )
    );
  };

  const handleQuizAnswer = (questionId: string, answerIndex: number) => {
    setQuiz(prevQuiz => 
      prevQuiz.map(question => 
        question.id === questionId ? { ...question, userAnswerIndex: answerIndex } : question
      )
    );
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim());
      setShowApiKeyInput(false);
      setApiKeyInput('');
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    setIsLoading(true);

    try {
      // Get content of selected files
      const selectedFilesContent = await getSelectedFilesContent();
      
      const prompt = contentType === 'flashcards'
        ? `Generate ${count} flashcards about "${topic}" based on the content of the files. Return in JSON format with this exact structure: [{"id": "1", "question": "question text", "answer": "answer text"}]`
        : `Generate a quiz with ${count} multiple choice questions about "${topic}" based on the content of the files. Each question should have 4 options with one correct answer. Return in JSON format with this exact structure: [{"id": "1", "question": "question text", "options": ["option1", "option2", "option3", "option4"], "correctAnswerIndex": 0}]`;
      
      // Call Gemini API with file content as context
      const response = await generateResponse(prompt, selectedFilesContent);

      // Parse the response to get flashcards or quiz questions
      try {
        const jsonStart = response.indexOf('[');
        const jsonEnd = response.lastIndexOf(']') + 1;
        const jsonStr = response.substring(jsonStart, jsonEnd);
        const parsedData = JSON.parse(jsonStr);
        
        if (contentType === 'flashcards') {
          setFlashcards(parsedData.map((item: any) => ({
            ...item,
            flipped: false
          })));
        } else {
          setQuiz(parsedData.map((item: any) => ({
            ...item,
            userAnswerIndex: null
          })));
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        alert('Failed to parse response from AI. Please try again.');
      }
    } catch (error: any) {
      console.error('Error:', error);
      
      // If error is due to missing API key, prompt user to enter key
      if (error.message.includes('API key is required') || error.message.includes('API key')) {
        setShowApiKeyInput(true);
      } else {
        alert(`Error: ${error.message || "Something went wrong. Please try again."}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[400px] h-full w-full max-w-6xl bg-gray-900 rounded-lg shadow-lg border border-gray-700">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            {contentType === 'flashcards' ? 'Flashcard Generator' : 'Quiz Generator'}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setContentType('flashcards')}
              className={`px-3 py-1 text-sm rounded ${contentType === 'flashcards' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Flashcards
            </button>
            <button
              onClick={() => setContentType('quiz')}
              className={`px-3 py-1 text-sm rounded ${contentType === 'quiz' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Quiz
            </button>
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showApiKeyInput ? 'Hide API Key' : 'Set API Key'}
            </button>
          </div>
        </div>
        
        {showApiKeyInput && (
          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="flex-1 p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
              />
              <button
                onClick={handleSaveApiKey}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Save
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Get your API key at: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">aistudio.google.com/app/apikey</a>
            </div>
          </div>
        )}
        
        <div className="p-3 border-b border-gray-700 bg-gray-800">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={contentType === 'flashcards' ? "e.g., React Hooks" : "e.g., JavaScript Promises"}
                className="w-full p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400 border border-gray-700"
              />
            </div>
            <div className="w-20">
              <label className="block text-sm font-medium text-gray-300 mb-1">Count</label>
              <input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                aria-label="Number of items to generate"
                className="w-full p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white border border-gray-700"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading || selectedCount === 0}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center"
            >
              {isLoading ? <FiRefreshCw className="animate-spin" /> : <FiPlus />}
              <span className="ml-1">Generate</span>
            </button>
          </div>
          {selectedCount === 0 && (
            <div className="mt-2 text-xs text-yellow-500">Please select at least one file from the sidebar</div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-gray-300 flex items-center">
                <FiRefreshCw className="animate-spin mr-2" />
                Generating...
              </div>
            </div>
          ) : contentType === 'flashcards' ? (
            flashcards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {flashcards.map(card => (
                  <FlashcardComponent 
                    key={card.id} 
                    flashcard={card} 
                    toggleFlip={toggleFlashcard} 
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>No flashcards yet. Generate some!</p>
              </div>
            )
          ) : (
            quiz.length > 0 ? (
              <div className="space-y-4">
                {quiz.map(question => (
                  <QuizComponent 
                    key={question.id} 
                    question={question} 
                    onAnswer={handleQuizAnswer} 
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p>No quiz questions yet. Generate some!</p>
              </div>
            )
          )}
        </div>
      </div>
      
      {/* File Browser Side Panel */}
      <div className="w-64 border-l border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Files ({selectedCount} selected)</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-sm">
          <div className="text-gray-400 text-xs mb-2 px-2">Not in Trash</div>
          
          {isLoadingFiles ? (
            <div className="text-gray-400 text-center p-4">Loading files...</div>
          ) : fileStructure.length === 0 ? (
            <div className="text-gray-400 text-center p-4">No files found</div>
          ) : (
            <FileTree 
              items={fileStructure} 
              level={0} 
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedFiles={selectedFiles}
              toggleFileSelection={toggleFileSelection}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashcardQuizGenerator; 