'use client';

import React, { useState, useEffect } from 'react';
import { FiSend, FiFolder, FiFile, FiChevronRight, FiChevronDown, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { useAppState } from '@/lib/providers/state-provider';
import { getFiles, getFolders, getFileDetails } from '@/supabase/queries';
import { createSClient } from '@/lib/server-actions/createServerClient';
import { File, Folder } from '@/supabase/supabase';
import { useGemini } from '@/lib/hooks/useGemini';

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
      
      // Extract text content from any format
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
    <div className="flex h-[400px] w-full max-w-6xl bg-gray-900 rounded-lg shadow-lg border border-gray-700">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">AI Tutor</h2>
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showApiKeyInput ? 'Hide API Key' : 'Set API Key'}
          </button>
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
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-2.5 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-2.5">
                <div className="animate-pulse text-gray-300">Thinking...</div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedCount > 0 ? "Ask about the selected files..." : "Ask about your code..."}
              className="flex-1 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white placeholder-gray-400 border border-gray-700"
            />
            <button
              title="Send"
              type="submit"
              disabled={isLoading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              <FiSend />
            </button>
          </div>
        </form>
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

export default AiTutor; 