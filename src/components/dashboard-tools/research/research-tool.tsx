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

          {/* Research and Results */}
          <div className="lg:col-span-3 flex flex-col h-[600px] bg-[#282a36] rounded-lg overflow-hidden">
            {/* Search Section */}
            <div className="p-4 border-b border-[#44475a]">
              <form onSubmit={handleSearch} className="flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for research topics..."
                  className="flex-1 bg-[#1a1b26] text-white p-3 rounded-l-lg focus:outline-none focus:border-[#7c3aed]"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  title="Search"
                  className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white p-3 rounded-r-lg flex items-center"
                  disabled={!query.trim() || isLoading}
                >
                  {isLoading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full"></div>
                  ) : (
                    <FiSearch />
                  )}
                </button>
              </form>
              {!apiKey && !searchEngineId && (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="mt-2 text-xs text-[#8B5CF6] hover:text-[#9d5bff]"
                >
                  Set API key for real search results
                </button>
              )}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {results.length === 0 && !isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="bg-[#2d2d3a] p-5 rounded-xl mb-4">
                    <FiSearch className="text-[#8B5CF6] mx-auto text-4xl mb-2" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Research Assistant</h3>
                  <p className="text-gray-400 max-w-md">
                    Search for topics to research. Your queries will be enhanced with context from your selected files.
                  </p>
                </div>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="bg-[#1a1b26] rounded-lg p-4">
                    <h3 className="text-white font-medium mb-1">
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center"
                      >
                        {result.title}
                        <FiExternalLink className="ml-2 text-sm text-[#8B5CF6]" />
                      </a>
                    </h3>
                    <p className="text-gray-300 text-sm mb-2">{result.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500 truncate max-w-[300px]">{result.url}</span>
                      <button
                        onClick={() => addToSelectedFiles(result)}
                        disabled={addingToFile === result.url}
                        className="flex items-center text-xs px-2 py-1 bg-[#2d2d3a] text-[#8B5CF6] rounded hover:bg-[#3d3d4d]"
                      >
                        {addingToFile === result.url ? (
                          <div className="animate-spin h-3 w-3 border border-t-transparent border-[#8B5CF6] rounded-full mr-1"></div>
                        ) : (
                          <FiPlus className="mr-1" />
                        )}
                        Add to Notes
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* API Key Modal */}
        {showApiKeyInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#282a36] rounded-lg max-w-md w-full p-6">
              <h3 className="text-[#8B5CF6] font-semibold mb-4">Set Google Custom Search API</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Enter your Google API Key"
                    className="w-full bg-[#1a1b26] text-white p-3 rounded-lg focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Search Engine ID
                  </label>
                  <input
                    type="text"
                    value={tempSearchEngineId}
                    onChange={(e) => setTempSearchEngineId(e.target.value)}
                    placeholder="Enter your Custom Search Engine ID"
                    className="w-full bg-[#1a1b26] text-white p-3 rounded-lg focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>
                
                {errorMessage && (
                  <div className="text-red-500 text-sm">{errorMessage}</div>
                )}
                
                <div className="text-xs text-gray-400">
                  <p>Need API key? Get one at: <a href="https://developers.google.com/custom-search/v1/overview" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:underline">Google Custom Search API</a></p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  className="px-4 py-2 rounded-lg text-gray-300 hover:bg-[#2d2d3a]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiSettings}
                  className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
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

export default ResearchTool; 