import { renderHook } from '@testing-library/react';
import { useDocumentDetails } from '../use-document-details';
import { useAppState } from '@/lib/providers/state-provider';
import { usePathname } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/providers/state-provider', () => ({
  useAppState: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

describe('useDocumentDetails', () => {
  // Test data
  const mockWorkspace = {
    id: 'workspace-1',
    title: 'Workspace 1',
    iconId: '📝',
    createdAt: new Date().toISOString(),
    data: null,
    inTrash: null,
    bannerUrl: 'banner-url',
    workspaceOwner: 'user-1',
    logo: null,
    folders: [
      {
        id: 'folder-1',
        title: 'Folder 1',
        iconId: '📁',
        createdAt: new Date().toISOString(),
        data: null,
        inTrash: null,
        bannerUrl: 'folder-banner',
        workspaceId: 'workspace-1',
        files: [
          {
            id: 'file-1',
            title: 'File 1',
            iconId: '📄',
            createdAt: new Date().toISOString(),
            data: null,
            inTrash: null,
            bannerUrl: 'file-banner',
            workspaceId: 'workspace-1',
            folderId: 'folder-1',
          },
        ],
      },
    ],
  };

  const mockState = {
    workspaces: [mockWorkspace],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return document details for a file', () => {
    // Setup mocks
    (useAppState as jest.Mock).mockReturnValue({
      state: mockState,
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard/workspace-1/folder-1/file-1');

    const fileDetails = {
      id: 'file-1',
      title: 'File 1',
      iconId: '📄',
      createdAt: new Date().toISOString(),
      data: null,
      inTrash: null,
      bannerUrl: 'file-banner',
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
    };

    const { result } = renderHook(() => 
      useDocumentDetails(fileDetails, 'file', 'file-1')
    );

    expect(result.current.details).toEqual(mockWorkspace.folders[0].files[0]);
  });

  it('should return document details for a folder', () => {
    // Setup mocks
    (useAppState as jest.Mock).mockReturnValue({
      state: mockState,
      workspaceId: 'workspace-1',
      folderId: null,
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard/workspace-1/folder-1');

    const folderDetails = {
      id: 'folder-1',
      title: 'Folder 1',
      iconId: '📁',
      createdAt: new Date().toISOString(),
      data: null,
      inTrash: null,
      bannerUrl: 'folder-banner',
      workspaceId: 'workspace-1',
    };

    const { result } = renderHook(() => 
      useDocumentDetails(folderDetails, 'folder', 'folder-1')
    );

    expect(result.current.details).toEqual(mockWorkspace.folders[0]);
  });

  it('should return document details for a workspace', () => {
    // Setup mocks
    (useAppState as jest.Mock).mockReturnValue({
      state: mockState,
      workspaceId: 'workspace-1',
      folderId: null,
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard/workspace-1');

    const workspaceDetails = {
      id: 'workspace-1',
      title: 'Workspace 1',
      iconId: '📝',
      createdAt: new Date().toISOString(),
      data: null,
      inTrash: null,
      bannerUrl: 'banner-url',
      workspaceOwner: 'user-1',
      logo: null,
    };

    const { result } = renderHook(() => 
      useDocumentDetails(workspaceDetails, 'workspace', 'workspace-1')
    );

    expect(result.current.details).toEqual(mockWorkspace);
  });

  it('should fallback to provided details when item is not found in state', () => {
    // Setup mocks with a non-existent item
    (useAppState as jest.Mock).mockReturnValue({
      state: mockState,
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard/workspace-1/folder-1/non-existent-file');

    const fileDetails = {
      id: 'non-existent-file',
      title: 'Non-existent File',
      iconId: '❓',
      createdAt: new Date().toISOString(),
      data: null,
      inTrash: null,
      bannerUrl: 'unknown-banner',
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
    };

    const { result } = renderHook(() => 
      useDocumentDetails(fileDetails, 'file', 'non-existent-file')
    );

    // Check that we get back details with the same title, iconId, etc., but ID might not be included
    const expectedDetails = {
      title: fileDetails.title,
      iconId: fileDetails.iconId,
      createdAt: fileDetails.createdAt,
      data: fileDetails.data,
      inTrash: fileDetails.inTrash,
      bannerUrl: fileDetails.bannerUrl,
    };
    
    // Use a partial match to check just these fields
    expect(result.current.details).toMatchObject(expectedDetails);
  });

  it('should generate breadcrumbs for workspace path', () => {
    // Setup mocks
    (useAppState as jest.Mock).mockReturnValue({
      state: mockState,
      workspaceId: 'workspace-1',
      folderId: null,
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard/workspace-1');

    const workspaceDetails = {
      id: 'workspace-1',
      title: 'Workspace 1',
      iconId: '📝',
      createdAt: new Date().toISOString(),
      data: null,
      inTrash: null,
      bannerUrl: 'banner-url',
      workspaceOwner: 'user-1',
      logo: null,
    };

    const { result } = renderHook(() => 
      useDocumentDetails(workspaceDetails, 'workspace', 'workspace-1')
    );

    expect(result.current.breadCrumbs).toBe('📝 Workspace 1');
  });

  it('should generate breadcrumbs for folder path', () => {
    // Setup mocks
    (useAppState as jest.Mock).mockReturnValue({
      state: mockState,
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard/workspace-1/folder-1');

    const folderDetails = {
      id: 'folder-1',
      title: 'Folder 1',
      iconId: '📁',
      createdAt: new Date().toISOString(),
      data: null,
      inTrash: null,
      bannerUrl: 'folder-banner',
      workspaceId: 'workspace-1',
    };

    const { result } = renderHook(() => 
      useDocumentDetails(folderDetails, 'folder', 'folder-1')
    );

    expect(result.current.breadCrumbs).toBe('📝 Workspace 1 / 📁 Folder 1');
  });

  it('should generate breadcrumbs for file path', () => {
    // Setup mocks
    (useAppState as jest.Mock).mockReturnValue({
      state: mockState,
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard/workspace-1/folder-1/file-1');

    const fileDetails = {
      id: 'file-1',
      title: 'File 1',
      iconId: '📄',
      createdAt: new Date().toISOString(),
      data: null,
      inTrash: null,
      bannerUrl: 'file-banner',
      workspaceId: 'workspace-1',
      folderId: 'folder-1',
    };

    const { result } = renderHook(() => 
      useDocumentDetails(fileDetails, 'file', 'file-1')
    );

    expect(result.current.breadCrumbs).toBe('📝 Workspace 1 / 📁 Folder 1 / 📄 File 1');
  });
}); 