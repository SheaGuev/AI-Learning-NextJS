'use client';

import React, { useState, useEffect } from 'react';
import { FiSend, FiFolder, FiFile, FiChevronRight, FiChevronDown, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { useAppState } from '@/lib/providers/state-provider';
import { getFiles, getFolders } from '@/supabase/queries';
import { createSClient } from '@/lib/server-actions/createServerClient';
import { File, Folder } from '@/supabase/supabase';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const selectedFileNames = getSelectedFileNames();
    const contextPrefix = selectedFileNames.length > 0 
      ? `[Context: ${selectedFileNames.join(', ')}]\n` 
      : '';

    // Add user message to chat
    const userMessage: Message = { 
      role: 'user', 
      content: selectedFileNames.length > 0 
        ? `${contextPrefix}${input}`
        : input 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // TODO: Replace with your actual API endpoint
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input,
          context: selectedFileNames
        }),
      });

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || "I'm currently in development mode. I'll be able to help you with your code soon!",
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      // Add fallback response in case of error
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm currently in development mode. I'll be able to help you with your code soon!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[400px] w-full max-w-6xl bg-gray-900 rounded-lg shadow-lg border border-gray-700">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">AI Tutor</h2>
        </div>
        
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