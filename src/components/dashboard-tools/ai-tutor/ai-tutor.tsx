'use client';

import React, { useState, useEffect } from 'react';
import { FiSend, FiFolder, FiFile, FiChevronRight, FiChevronDown, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { useAppState } from '@/lib/providers/state-provider';
import { getFiles, getFolders, getFileDetails } from '@/supabase/queries';
import { createSClient } from '@/lib/server-actions/createServerClient';
import { File, Folder } from '@/supabase/supabase';
import { useGemini } from '@/lib/hooks/useGemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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

// Create a separate markdown renderer component to handle the rendering logic
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            return isInline ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <div className="rounded-md text-sm">
                <SyntaxHighlighter
                  style={atomDark}
                  language={match[1]}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          p: ({ children }) => <p className="mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-6 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-6 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mb-2">{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const AiTutor: React.FC = () => {
  const { state, workspaceId } = useAppState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [selectedCount, setSelectedCount] = useState(0);
  const [fileStructure, setFileStructure] = useState<(FileItem | FolderItem)[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const { generateResponse, isLoading: isGenerating, error: apiError, setApiKey } = useGemini();
  const [apiKey, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Load folders and files from database
  useEffect(() => {
    const fetchFilesAndFolders = async () => {
      if (!workspaceId) return;
      
      setIsLoadingFiles(true);

      try {
        // Fetch folders
        const { data: foldersData, error: foldersError } = await getFolders(workspaceId);
        
        if (foldersError) {
          console.error('Error loading folders:', foldersError);
          setIsLoadingFiles(false);
          return;
        }

        // Transform folders and load files for each folder
        const folderStructure: FolderItem[] = [];

        for (const folder of foldersData || []) {
          if (folder.inTrash) continue; // Skip folders in trash
          
          // Convert to FolderItem
          const folderItem: FolderItem = {
            ...folder,
            type: 'folder',
            children: []
          };

          // Fetch files for this folder
          const { data: filesData, error: filesError } = await getFiles(folder.id);
          
          if (!filesError && filesData) {
            // Add non-trashed files to the folder
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
        
        // Expand the first folder by default
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

  const getSelectedFileNames = () => {
    return Object.entries(selectedFiles)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => {
        // Find file in file structure
        const findFile = (items: (FileItem | FolderItem)[]): FileItem | null => {
          for (const item of items) {
            if (item.id === id && item.type === 'file') return item as FileItem;
            if (item.type === 'folder' && item.children) {
              const found = findFile(item.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const file = findFile(fileStructure);
        return file ? file.title : '';
      })
      .filter(Boolean);
  };

  // Get file content for a selected file by its ID
  const getFileContent = async (fileId: string): Promise<FileContext | null> => {
    try {
      const { data, error } = await getFileDetails(fileId);
      
      if (error || !data || data.length === 0 || !data[0].data) {
        console.error('Error fetching file content:', error || 'No data returned');
        return null;
      }
      
      return {
        title: data[0].title,
        content: data[0].data || 'No content available'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = { 
      role: 'user', 
      content: input 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get content of selected files
      const selectedFilesContent = await getSelectedFilesContent();
      
      // Call Gemini API with file content as context
      const response = await generateResponse(input, selectedFilesContent);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error:', error);
      
      // If error is due to missing API key, prompt user to enter key
      if (error.message.includes('API key is required') || error.message.includes('API key')) {
        setShowApiKeyInput(true);
      }
      
      // Add error message to chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || "Something went wrong. Please try again."}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim());
      setShowApiKeyInput(false);
      setApiKeyInput('');
    }
  };

  return (
    <div className="bg-[#1e1e2e] border border-[#4A4A67] rounded-lg p-5 shadow-lg">
      <div className="flex flex-col h-full space-y-4">
        {!showApiKeyInput ? (
          <>
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

              {/* Chat Area */}
              <div className="lg:col-span-3 flex flex-col h-[600px] bg-[#282a36] rounded-lg overflow-hidden">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="bg-[#2d2d3a] p-5 rounded-xl mb-4">
                        <FiSquare className="text-[#8B5CF6] mx-auto text-4xl mb-2" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">AI Tutor Assistant</h3>
                      <p className="text-gray-400 max-w-md">
                        Select files from your workspace to provide context, then ask questions to get personalized learning assistance.
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div 
                        key={index}
                        className={`${
                          message.role === 'user' 
                            ? 'bg-[#2d2d3a] ml-8' 
                            : 'bg-[#1a1b26] ml-0 mr-8'
                        } p-4 rounded-lg`}
                      >
                        <div className="flex items-center mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === 'user' ? 'bg-[#7C3AED]' : 'bg-[#8B5CF6]'
                          }`}>
                            {message.role === 'user' ? 'U' : 'AI'}
                          </div>
                          <span className="ml-2 text-sm font-medium text-gray-300">
                            {message.role === 'user' ? 'You' : 'AI Tutor'}
                          </span>
                        </div>
                        {message.role === 'assistant' ? (
                          <MarkdownRenderer content={message.content} />
                        ) : (
                          <p className="text-gray-300">{message.content}</p>
                        )}
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#8B5CF6]"></div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t border-[#44475a] p-4">
                  <form onSubmit={handleSubmit} className="flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask your learning question..."
                      className="flex-1 bg-[#1a1b26] text-white p-3 rounded-l-lg focus:outline-none focus:border-[#8B5CF6]"
                      disabled={isLoading || isGenerating || selectedCount === 0}
                    />
                    <button
                      type="submit"
                      title="Send message"
                      className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white p-3 rounded-r-lg flex items-center"
                      disabled={!input.trim() || isLoading || isGenerating || selectedCount === 0}
                    >
                      <FiSend />
                    </button>
                  </form>
                  {selectedCount === 0 && (
                    <p className="text-yellow-400 text-xs mt-2">
                      Please select at least one file to provide context
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-[#282a36] rounded-lg p-6 max-w-md mx-auto">
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
        )}
      </div>
    </div>
  );
};

export default AiTutor; 