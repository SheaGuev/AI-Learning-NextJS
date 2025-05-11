import { renderHook } from '@testing-library/react';
import { useContentLoader } from '../use-content-loader';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/lib/providers/state-provider';
import { getFileDetails, getFolderDetails, getWorkspaceDetails } from '@/supabase/queries';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/providers/state-provider', () => ({
  useAppState: jest.fn(),
}));

jest.mock('@/supabase/queries', () => ({
  getFileDetails: jest.fn(),
  getFolderDetails: jest.fn(),
  getWorkspaceDetails: jest.fn(),
}));

describe('useContentLoader', () => {
  // Mock functions and values
  const mockQuill = {
    setText: jest.fn(),
    setContents: jest.fn(),
  };
  
  const mockRouter = {
    replace: jest.fn(),
  };
  
  const mockDispatch = jest.fn();
  
  const mockImportMarkdown = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAppState as jest.Mock).mockReturnValue({
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
      dispatch: mockDispatch,
    });
  });
  
  describe('when dirType is "file"', () => {
    it('should redirect to dashboard if file details have error', async () => {
      // Mock getFileDetails to return an error
      (getFileDetails as jest.Mock).mockResolvedValueOnce({
        error: new Error('File not found'),
        data: null,
      });
      
      renderHook(() => useContentLoader(mockQuill, 'file-1', 'file', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify router redirection
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
    
    it('should redirect to workspace if file not found', async () => {
      // Mock getFileDetails to return empty array
      (getFileDetails as jest.Mock).mockResolvedValueOnce({
        error: null,
        data: [],
      });
      
      renderHook(() => useContentLoader(mockQuill, 'file-1', 'file', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify router redirection
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/workspace-1');
    });
    
    it('should load and parse Quill Delta content', async () => {
      const mockDelta = { ops: [{ insert: 'Test content' }] };
      
      // Mock getFileDetails to return file with Delta content
      (getFileDetails as jest.Mock).mockResolvedValueOnce({
        error: null,
        data: [{
          data: JSON.stringify(mockDelta),
          folderId: 'folder-1',
        }],
      });
      
      renderHook(() => useContentLoader(mockQuill, 'file-1', 'file', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify quill content was set
      expect(mockQuill.setContents).toHaveBeenCalledWith(mockDelta);
      
      // Verify the dispatch was called to update state
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_FILE',
        payload: {
          file: { data: JSON.stringify(mockDelta) },
          fileId: 'file-1',
          folderId: 'folder-1',
          workspaceId: 'workspace-1',
        },
      });
    });
    
    it('should load and process markdown content', async () => {
      const markdownContent = '# Heading\n\nThis is markdown content';
      const mockMarkdownData = { 
        markdown: true, 
        content: markdownContent 
      };
      
      // Mock getFileDetails to return file with markdown content
      (getFileDetails as jest.Mock).mockResolvedValueOnce({
        error: null,
        data: [{
          data: JSON.stringify(mockMarkdownData),
          folderId: 'folder-1',
        }],
      });
      
      renderHook(() => useContentLoader(mockQuill, 'file-1', 'file', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify importMarkdown was called with the content
      expect(mockImportMarkdown).toHaveBeenCalledWith(markdownContent);
      
      // Verify the dispatch was called to update state
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_FILE',
        payload: {
          file: { data: JSON.stringify(mockMarkdownData) },
          fileId: 'file-1',
          folderId: 'folder-1',
          workspaceId: 'workspace-1',
        },
      });
    });
    
    it('should handle JSON parsing errors by setting raw text', async () => {
      const invalidJson = '{invalid json}';
      
      // Mock getFileDetails to return file with invalid JSON
      (getFileDetails as jest.Mock).mockResolvedValueOnce({
        error: null,
        data: [{
          data: invalidJson,
          folderId: 'folder-1',
        }],
      });
      
      renderHook(() => useContentLoader(mockQuill, 'file-1', 'file', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify setText was called with the raw content
      expect(mockQuill.setText).toHaveBeenCalledWith(invalidJson);
    });
  });
  
  describe('when dirType is "folder"', () => {
    it('should redirect to dashboard if folder details have error', async () => {
      // Mock getFolderDetails to return an error
      (getFolderDetails as jest.Mock).mockResolvedValueOnce({
        error: new Error('Folder not found'),
        data: null,
      });
      
      renderHook(() => useContentLoader(mockQuill, 'folder-1', 'folder', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify router redirection
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
    
    it('should load and parse folder content as Quill Delta', async () => {
      const mockDelta = { ops: [{ insert: 'Folder content' }] };
      
      // Mock getFolderDetails to return folder with Delta content
      (getFolderDetails as jest.Mock).mockResolvedValueOnce({
        error: null,
        data: [{
          data: JSON.stringify(mockDelta),
          workspaceId: 'workspace-1',
        }],
      });
      
      renderHook(() => useContentLoader(mockQuill, 'folder-1', 'folder', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify quill content was set
      expect(mockQuill.setContents).toHaveBeenCalledWith(mockDelta);
      
      // Verify the dispatch was called to update state
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_FOLDER',
        payload: {
          folder: { data: JSON.stringify(mockDelta) },
          folderId: 'folder-1',
          workspaceId: 'workspace-1',
        },
      });
    });
    
    it('should load and process markdown content in folder', async () => {
      const markdownContent = '# Folder Heading\n\nThis is folder markdown content';
      const mockMarkdownData = { 
        markdown: true, 
        content: markdownContent 
      };
      
      // Mock getFolderDetails to return folder with markdown content
      (getFolderDetails as jest.Mock).mockResolvedValueOnce({
        error: null,
        data: [{
          data: JSON.stringify(mockMarkdownData),
          workspaceId: 'workspace-1',
        }],
      });
      
      renderHook(() => useContentLoader(mockQuill, 'folder-1', 'folder', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify importMarkdown was called with the content
      expect(mockImportMarkdown).toHaveBeenCalledWith(markdownContent);
    });
  });
  
  describe('when dirType is "workspace"', () => {
    it('should redirect to dashboard if workspace details have error', async () => {
      // Mock getWorkspaceDetails to return an error
      (getWorkspaceDetails as jest.Mock).mockResolvedValueOnce({
        error: new Error('Workspace not found'),
        data: null,
      });
      
      renderHook(() => useContentLoader(mockQuill, 'workspace-1', 'workspace', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify router redirection
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
    
    it('should load and parse workspace content as Quill Delta', async () => {
      const mockDelta = { ops: [{ insert: 'Workspace content' }] };
      
      // Mock getWorkspaceDetails to return workspace with Delta content
      (getWorkspaceDetails as jest.Mock).mockResolvedValueOnce({
        error: null,
        data: [{
          data: JSON.stringify(mockDelta),
        }],
      });
      
      renderHook(() => useContentLoader(mockQuill, 'workspace-1', 'workspace', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify quill content was set
      expect(mockQuill.setContents).toHaveBeenCalledWith(mockDelta);
      
      // Verify the dispatch was called to update state
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_WORKSPACE',
        payload: {
          workspace: { data: JSON.stringify(mockDelta) },
          workspaceId: 'workspace-1',
        },
      });
    });
    
    it('should load and process markdown content in workspace', async () => {
      const markdownContent = '# Workspace Heading\n\nThis is workspace markdown content';
      const mockMarkdownData = { 
        markdown: true, 
        content: markdownContent 
      };
      
      // Mock getWorkspaceDetails to return workspace with markdown content
      (getWorkspaceDetails as jest.Mock).mockResolvedValueOnce({
        error: null,
        data: [{
          data: JSON.stringify(mockMarkdownData),
        }],
      });
      
      renderHook(() => useContentLoader(mockQuill, 'workspace-1', 'workspace', mockImportMarkdown));
      
      // Wait for the useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify importMarkdown was called with the content
      expect(mockImportMarkdown).toHaveBeenCalledWith(markdownContent);
    });
  });
}); 