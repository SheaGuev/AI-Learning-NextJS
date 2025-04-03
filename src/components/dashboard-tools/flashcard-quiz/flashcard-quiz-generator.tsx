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
            className="flex items-center hover:bg-[#2d2d3a] rounded px-1 py-0.5 cursor-pointer text-sm"
            onClick={() => item.type === 'folder' ? toggleFolder(item.id) : toggleFileSelection(item)}
          >
            <div className="mr-1.5" style={{ marginLeft: `${level * 4}px` }}>
              {item.type === 'folder' ? (
                expandedFolders[item.id] ? <FiChevronDown className="text-gray-400" /> : <FiChevronRight className="text-gray-400" />
              ) : (
                <div className="w-4 h-4 flex justify-center items-center">
                  {selectedFiles[item.id] ? 
                    <FiCheckSquare className="text-[#6052A8]" /> : 
                    <FiSquare className="text-gray-400" />
                  }
                </div>
              )}
            </div>
            <div className="flex items-center min-w-[20px]">
              {item.type === 'folder' ? (
                <FiFolder className="mr-1.5 text-[#6052A8]" />
              ) : (
                <FiFile className="mr-1.5 text-[#6052A8]" />
              )}
            </div>
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
      className={`w-full bg-[#282a36] rounded-lg shadow-md cursor-pointer transform transition-transform hover:scale-105 mb-4`}
      style={{ height: '220px' }}
      onClick={() => toggleFlip(flashcard.id)}
    >
      <div className="h-full flex items-center justify-center p-4">
        <div className="w-full h-full relative">
          <div 
            className={`absolute inset-0 backface-visibility-hidden bg-[#282a36] border border-[#44475a] rounded-lg flex flex-col justify-center items-center p-4 text-center transition-opacity duration-200 ${flashcard.flipped ? 'opacity-0' : 'opacity-100'}`}
          >
            <h3 className="text-white font-medium text-lg">{flashcard.question}</h3>
            <div className="mt-2 text-sm text-gray-400">Click to reveal answer</div>
          </div>
          <div 
            className={`absolute inset-0 backface-visibility-hidden bg-[#1a1b26] border border-[#44475a] rounded-lg flex flex-col justify-center items-center p-6 text-center transition-opacity duration-200 ${flashcard.flipped ? 'opacity-100' : 'opacity-0'}`}
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
    <div className="mb-6 bg-[#282a36] p-4 rounded-lg">
      <h3 className="text-white font-medium mb-3">{question.question}</h3>
      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isSelected = question.userAnswerIndex === index;
          const isCorrect = question.userAnswerIndex !== null && index === question.correctAnswerIndex;
          const isWrong = isSelected && !isCorrect;
          
          return (
            <div 
              key={index}
              className={`p-3 rounded-md transition-colors
                ${isSelected ? 'bg-[#3d3d4d] border border-[#7c3aed]' : 'bg-[#2d2d3a]'} 
                ${isCorrect ? 'bg-green-800 border border-green-500' : ''}
                ${isWrong ? 'bg-red-800 border border-red-500' : ''}
                ${question.userAnswerIndex === null ? 'hover:bg-[#3d3d4d] cursor-pointer' : ''}`}
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
    <div className="bg-[#1e1e2e] border border-[#4A4A67] rounded-lg p-5 shadow-lg">
      <div className="flex flex-col space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* File Browser */}
          <div className="lg:col-span-1 bg-[#282a36] rounded-lg p-4 max-h-[600px] overflow-auto">
            <h3 className="text-[#8B5CF6] font-semibold mb-3 flex items-center">
              <FiFolder className="mr-2" /> Files
              <span className="ml-auto text-sm text-gray-400">
                {selectedCount} selected
              </span>
            </h3>
            {isLoadingFiles ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#8B5CF6]"></div>
              </div>
            ) : fileStructure.length > 0 ? (
              <FileTree 
                items={fileStructure}
                level={0}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                selectedFiles={selectedFiles}
                toggleFileSelection={toggleFileSelection}
              />
            ) : (
              <p className="text-gray-400 text-sm italic">No files found in this workspace</p>
            )}
          </div>

          {/* Generator & Results */}
          <div className="lg:col-span-3 flex flex-col bg-[#282a36] rounded-lg overflow-hidden">
            {/* Generator Controls */}
            <div className="p-4 border-b border-[#44475a]">
              <div className="flex flex-wrap gap-4 mb-4">
                <button
                  onClick={() => setContentType('flashcards')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    contentType === 'flashcards' 
                      ? 'bg-[#8B5CF6] text-white' 
                      : 'bg-[#2d2d3a] text-gray-300 hover:bg-[#3d3d4d]'
                  }`}
                >
                  Flashcards
                </button>
                <button
                  onClick={() => setContentType('quiz')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    contentType === 'quiz' 
                      ? 'bg-[#8B5CF6] text-white' 
                      : 'bg-[#2d2d3a] text-gray-300 hover:bg-[#3d3d4d]'
                  }`}
                >
                  Quiz
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Topic (optional)
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={`Topic for ${contentType === 'flashcards' ? 'flashcards' : 'quiz questions'}`}
                    className="w-full bg-[#1a1b26] text-white p-3 rounded-lg focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {contentType === 'flashcards' ? 'Number of flashcards' : 'Number of questions'}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-[#44475a] rounded-lg appearance-none cursor-pointer"
                      title={`Number of ${contentType === 'flashcards' ? 'flashcards' : 'questions'} to generate`}
                    />
                    <span className="ml-3 text-white font-medium w-8 text-center">{count}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || selectedCount === 0}
                    className="w-full flex items-center justify-center py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="mr-2" />
                        Generate {contentType === 'flashcards' ? 'Flashcards' : 'Quiz'}
                      </>
                    )}
                  </button>
                  {!apiKey && (
                    <button
                      onClick={() => setShowApiKeyInput(true)}
                      className="mt-2 w-full text-xs text-[#8B5CF6] hover:text-[#9d5bff]"
                    >
                      Set API key for generation
                    </button>
                  )}
                  {selectedCount === 0 && (
                    <p className="text-yellow-400 text-xs mt-2">
                      Please select at least one file to provide context
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Content Display */}
            <div className="flex-1 overflow-y-auto p-4">
              {contentType === 'flashcards' ? (
                flashcards.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {flashcards.map((card) => (
                      <FlashcardComponent 
                        key={card.id} 
                        flashcard={card} 
                        toggleFlip={toggleFlashcard} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="bg-[#2d2d3a] p-5 rounded-xl mb-4">
                      <FiPlus className="text-[#8B5CF6] mx-auto text-4xl mb-2" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Create Flashcards</h3>
                    <p className="text-gray-400 max-w-md">
                      Select files from your workspace, then generate flashcards to help you memorize key concepts.
                    </p>
                  </div>
                )
              ) : (
                quiz.length > 0 ? (
                  <div>
                    {quiz.map((question) => (
                      <QuizComponent 
                        key={question.id} 
                        question={question} 
                        onAnswer={handleQuizAnswer} 
                      />
                    ))}
                    <div className="mt-4 p-4 bg-[#2d2d3a] rounded-lg">
                      <h3 className="text-white font-medium mb-2">Score</h3>
                      <div className="text-2xl font-bold text-[#8B5CF6]">
                        {quiz.filter(q => q.userAnswerIndex === q.correctAnswerIndex).length} / {quiz.length}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="bg-[#2d2d3a] p-5 rounded-xl mb-4">
                      <FiPlus className="text-[#8B5CF6] mx-auto text-4xl mb-2" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Create Quiz</h3>
                    <p className="text-gray-400 max-w-md">
                      Select files from your workspace, then generate quiz questions to test your knowledge.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* API Key Modal */}
        {showApiKeyInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#282a36] rounded-lg max-w-md w-full p-6">
              <h3 className="text-[#8B5CF6] font-semibold mb-4">Enter your Google Gemini API key</h3>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="API Key"
                className="w-full bg-[#1a1b26] text-white p-3 rounded-lg focus:outline-none focus:border-[#8B5CF6] mb-4"
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="px-4 py-2 rounded-lg text-gray-300 hover:bg-[#2d2d3a]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                  disabled={!apiKey.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardQuizGenerator; 