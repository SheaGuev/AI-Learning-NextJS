'use client';

import React, { useState, useEffect } from 'react';
import { FiSearch, FiExternalLink, FiFolder, FiFile, FiChevronRight, FiChevronDown, FiCheckSquare, FiSquare, FiPlus } from 'react-icons/fi';
import { useAppState } from '@/lib/providers/state-provider';
import { getFiles, getFolders, getFileDetails, updateFile } from '@/supabase/queries';
import { File, Folder } from '@/supabase/supabase';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  title: string;
  url: string;
  description: string;
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

const ResearchTool: React.FC = () => {
  const { state, workspaceId } = useAppState();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [selectedCount, setSelectedCount] = useState(0);
  const [fileStructure, setFileStructure] = useState<(FileItem | FolderItem)[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [searchEngineId, setSearchEngineId] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempSearchEngineId, setTempSearchEngineId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usingMockResults, setUsingMockResults] = useState(false);
  const [addingToFile, setAddingToFile] = useState<string>('');

  // Load API key and search engine ID from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('google_search_api_key');
    const savedSearchEngineId = localStorage.getItem('google_search_engine_id');
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setTempApiKey(savedApiKey);
    }
    
    if (savedSearchEngineId) {
      setSearchEngineId(savedSearchEngineId);
      setTempSearchEngineId(savedSearchEngineId);
    }
  }, []);

  // Save API key and search engine ID to localStorage when they change
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('google_search_api_key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    if (searchEngineId) {
      localStorage.setItem('google_search_engine_id', searchEngineId);
    }
  }, [searchEngineId]);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResults([]);
    setErrorMessage(null);
    setUsingMockResults(false);
    
    try {
      // Get content of selected files to use as context
      const selectedFilesContent = await getSelectedFilesContent();
      
      // Build a more specific query if we have file context
      let searchQuery = query;
      if (selectedFilesContent.length > 0) {
        // Extract keywords from file content to enhance the search
        const keywords = extractKeywords(selectedFilesContent);
        searchQuery = `${query} ${keywords.join(' ')}`;
      }
      
      // Check if we have API credentials
      if (apiKey && searchEngineId) {
        try {
          // Call Google Search API
          const url = new URL('https://www.googleapis.com/customsearch/v1');
          url.searchParams.append('key', apiKey);
          url.searchParams.append('cx', searchEngineId);
          url.searchParams.append('q', searchQuery);
          
          const response = await fetch(url.toString());
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Search API error: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Transform API results to our format
          if (data.items && data.items.length > 0) {
            const searchResults: SearchResult[] = data.items.map((item: any) => ({
              title: item.title,
              url: item.link,
              description: item.snippet
            }));
            
            setResults(searchResults);
          } else {
            // No results found
            setResults([]);
          }
        } catch (apiError: any) {
          console.error('API search error:', apiError);
          setErrorMessage(`API Error: ${apiError.message}. Falling back to mock results.`);
          
          // Fall back to mock results
          setUsingMockResults(true);
          useMockResults(searchQuery, selectedFilesContent.length > 0);
        }
      } else {
        // No API key, use mock results
        console.log('No API key provided, using mock results');
        setUsingMockResults(true);
        useMockResults(searchQuery, selectedFilesContent.length > 0);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setErrorMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to use mock results
  const useMockResults = (searchQuery: string, hasContext: boolean) => {
    // Create mock results based on the query
    const mockResults = [
      {
        title: `${searchQuery} - Documentation`,
        url: `https://docs.example.com/search?q=${encodeURIComponent(searchQuery)}`,
        description: hasContext ? 
          `Documentation specifically related to ${searchQuery} in the context of your selected files.` : 
          `Official documentation related to ${searchQuery} with examples and tutorials.`
      },
      {
        title: `Learn ${searchQuery} - Tutorial`,
        url: `https://tutorial.example.com/${encodeURIComponent(searchQuery)}`,
        description: hasContext ? 
          `Tutorials that match both ${searchQuery} and the concepts in your files.` :
          `Comprehensive tutorial on ${searchQuery} with practical examples.`
      },
      {
        title: `${searchQuery} on GitHub`,
        url: `https://github.com/topics/${encodeURIComponent(searchQuery)}`,
        description: hasContext ? 
          `GitHub repositories similar to your project that implement ${searchQuery}.` :
          `Open source projects and repositories related to ${searchQuery}.`
      },
      {
        title: `${searchQuery} - Research Papers`,
        url: `https://arxiv.org/search/?query=${encodeURIComponent(searchQuery)}`,
        description: hasContext ? 
          `Academic research on ${searchQuery} relevant to your file context.` :
          `Academic research papers and publications on ${searchQuery}.`
      },
    ];
    
    // Add a small delay to simulate API call
    setTimeout(() => {
      setResults(mockResults);
    }, 500);
  };

  // Helper function to extract important keywords from file content
  const extractKeywords = (files: FileContext[]): string[] => {
    // Basic implementation - extract common programming terms
    // In a real app, you might use NLP or more sophisticated analysis
    const allText = files.map(file => file.content).join(' ');
    const programmingTerms = ['javascript', 'react', 'node', 'python', 'api', 
                             'function', 'component', 'class', 'interface'];
    
    const foundTerms = programmingTerms.filter(term => 
      allText.toLowerCase().includes(term.toLowerCase())
    );
    
    return foundTerms.slice(0, 5); // Limit to 5 keywords
  };

  const handleSaveApiSettings = () => {
    // Don't save if values are empty
    if (!tempApiKey.trim() || !tempSearchEngineId.trim()) {
      return;
    }
    
    setApiKey(tempApiKey.trim());
    setSearchEngineId(tempSearchEngineId.trim());
    setApiKeySaved(true);
    
    // Hide the saved message after 3 seconds
    setTimeout(() => {
      setApiKeySaved(false);
    }, 3000);
  };

  // Function to add search result content to selected files
  const addToSelectedFiles = async (result: SearchResult) => {
    // Check if any files are selected
    const selectedFileIds = Object.entries(selectedFiles)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (selectedFileIds.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to add content to.",
        variant: "destructive"
      });
      return;
    }
    
    setAddingToFile(result.title);
    
    try {
      for (const fileId of selectedFileIds) {
        // Get current file content
        const { data, error } = await getFileDetails(fileId);
        
        if (error || !data || data.length === 0) {
          console.error(`Error getting file details for ${fileId}:`, error);
          continue;
        }
        
        const file = data[0];
        let fileData: any;
        
        try {
          if (file.data) {
            fileData = JSON.parse(file.data);
          } else {
            fileData = { ops: [] };
          }
        } catch (err) {
          console.error("Error parsing file data:", err);
          fileData = { ops: [] };
        }
        
        // Create content to append
        const currentDate = new Date().toLocaleString();
        const contentToAdd = {
          ops: [
            { insert: "\n\n" },
            { insert: "Reference from Research Tool", attributes: { bold: true } },
            { insert: "\n" },
            { insert: `Title: ${result.title}` },
            { insert: "\n" },
            { insert: "Link: ", attributes: { bold: true } },
            { insert: result.url, attributes: { link: result.url } },
            { insert: "\n" },
            { insert: `Description: ${result.description}` },
            { insert: "\n" },
            { insert: `Added on: ${currentDate}` },
            { insert: "\n\n" }
          ]
        };
        
        // Merge existing content with new content
        if (fileData.ops) {
          fileData.ops = [...fileData.ops, ...contentToAdd.ops];
        } else {
          fileData = contentToAdd;
        }
        
        // Update the file
        await updateFile({ data: JSON.stringify(fileData) }, fileId);
      }
      
      toast({
        title: "Added to files",
        description: `Reference added to ${selectedFileIds.length} file(s).`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error adding to files:", error);
      toast({
        title: "Error",
        description: "Failed to add reference to file(s).",
        variant: "destructive"
      });
    } finally {
      setAddingToFile('');
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-6xl bg-gray-900 rounded-lg shadow-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Research Tool</h2>
        <p className="text-gray-400 text-sm mt-1">Find relevant sources and references for your learning journey</p>
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showApiKeyInput ? 'Hide API Settings' : 'Set Search API'}
          </button>
        </div>
      </div>
      
      {showApiKeyInput && (
        <div className="p-3 border-b border-gray-700 bg-gray-800">
          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Enter your Google API Key"
              className="p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
            />
            <input
              type="text"
              value={tempSearchEngineId}
              onChange={(e) => setTempSearchEngineId(e.target.value)}
              placeholder="Enter your Search Engine ID"
              className="p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
            />
            <div className="mt-1 text-xs text-gray-400">
              Get your API key at: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">console.cloud.google.com</a>
              <br />
              Set up a search engine at: <a href="https://programmablesearchengine.google.com/create/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">programmablesearchengine.google.com</a>
            </div>
            <button
              onClick={handleSaveApiSettings}
              disabled={!tempApiKey.trim() || !tempSearchEngineId.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              Save
            </button>
            {apiKeySaved && (
              <div className="text-center text-green-400 text-sm mt-2">API settings saved successfully!</div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-4 border-b border-gray-700">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selectedCount > 0 ? "Search with selected files as context..." : "Search for learning resources, documentation, or topics..."}
            className="flex-1 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-white placeholder-gray-400 border border-gray-700"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center gap-2"
          >
            <FiSearch />
            Search
          </button>
        </form>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main results area */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-pulse text-gray-300">Searching...</div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-200">
                Search Results for "{query}" {selectedCount > 0 ? `(with ${selectedCount} files as context)` : ''}
              </h3>
              {errorMessage && (
                <div className="bg-red-900/30 border border-red-700 p-3 rounded-md text-red-300 text-sm mb-4">
                  {errorMessage}
                </div>
              )}
              {usingMockResults && !errorMessage && (
                <div className="bg-yellow-900/30 border border-yellow-700 p-3 rounded-md text-yellow-300 text-sm mb-4">
                  Using sample results. Set up your Google Search API for real results.
                </div>
              )}
              {results.map((result, index) => (
                <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start">
                    <h4 className="text-blue-400 font-medium">{result.title}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToSelectedFiles(result)}
                        disabled={selectedCount === 0 || addingToFile === result.title}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${
                          selectedCount > 0 
                            ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' 
                            : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                        }`}
                        title={selectedCount > 0 ? "Add to selected files" : "Select files first"}
                      >
                        {addingToFile === result.title ? (
                          <span className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent border-blue-400 animate-spin"></span>
                        ) : (
                          <FiPlus className="w-3 h-3" />
                        )}
                        {addingToFile === result.title ? "Adding..." : "Add to file"}
                      </button>
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-400"
                        title="Open link in new tab"
                      >
                        <FiExternalLink />
                      </a>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm mt-1">{result.description}</p>
                  <div className="text-gray-500 text-xs mt-2 truncate">{result.url}</div>
                </div>
              ))}
            </div>
          ) : query ? (
            <div className="text-center text-gray-400 mt-8">
              No results found. Try a different search term.
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FiSearch className="text-gray-600 text-5xl mb-4" />
              <p className="text-gray-400">Search for a topic to find relevant resources</p>
              {selectedCount > 0 && (
                <p className="text-gray-500 text-sm mt-2">Using {selectedCount} files as context</p>
              )}
            </div>
          )}
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
    </div>
  );
};

export default ResearchTool; 