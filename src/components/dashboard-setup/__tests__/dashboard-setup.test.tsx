import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/use-toast';
import { useAppState } from '@/lib/providers/state-provider';
import { createWorkspace } from '@/supabase/queries';
import DashboardSetup from '../dashboard-setup';
import { createWorkspaceFormSchema } from '@/lib/types';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/lib/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));
jest.mock('@/lib/providers/state-provider', () => ({
  useAppState: jest.fn(),
}));
jest.mock('@/supabase/queries', () => ({
  createWorkspace: jest.fn(),
}));
// Mock the EmojiPicker as it might be complex or external
jest.mock('../../global/emoji-picker', () => ({
  __esModule: true, // This is important for modules with default exports
  default: ({ children, getValue }: { children: React.ReactNode; getValue: (emoji: string) => void }) => (
    <div data-testid="emoji-picker" onClick={() => getValue('🚀')}>
      {children}
    </div>
  ),
}));
// Mock createBClient as it likely involves external connections
jest.mock('@/lib/server-actions/createClient', () => ({
    createBClient: jest.fn().mockReturnValue({
      // Mock necessary Supabase client methods if needed, e.g., storage
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ data: { path: 'mock/path' }, error: null }),
      }
    }),
  }));


// Mock user data
const mockUser = { id: 'user-123' } as any; // Cast to any to bypass strict AuthUser typing if needed
const mockSubscription = {}; // Or null, depending on test case

describe('DashboardSetup Component', () => {
  let mockRouterPush: jest.Mock;
  let mockToast: jest.Mock;
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockRouterPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockRouterPush });

    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    mockDispatch = jest.fn();
    (useAppState as jest.Mock).mockReturnValue({ dispatch: mockDispatch });

    (createWorkspace as jest.Mock).mockClear();
    (createWorkspace as jest.Mock).mockResolvedValue({ data: { id: 'new-workspace-id' }, error: null });
  });

  it('should render the form correctly', () => {
    render(<DashboardSetup user={mockUser} subscription={mockSubscription} />);

    expect(screen.getByText('Create A Workspace')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Workspace/i })).toBeInTheDocument();
    expect(screen.getByText('💼')).toBeInTheDocument(); // Initial emoji
  });

  it('should allow changing the emoji', async () => {
    const user = userEvent.setup();
    render(<DashboardSetup user={mockUser} subscription={mockSubscription} />);

    const emojiPickerTrigger = screen.getByTestId('emoji-picker');
    await user.click(emojiPickerTrigger); // Simulate clicking the picker trigger

    // The mock EmojiPicker immediately calls getValue with '🚀' on click
    expect(await screen.findByText('🚀')).toBeInTheDocument(); // Check if emoji changed
    expect(screen.queryByText('💼')).not.toBeInTheDocument(); // Initial emoji should be gone
  });

  it('should display validation error for empty workspace name', async () => {
     const user = userEvent.setup();
    render(<DashboardSetup user={mockUser} subscription={mockSubscription} />);

    const submitButton = screen.getByRole('button', { name: /Create Workspace/i });
    await user.click(submitButton);

    expect(await screen.findByText(/Workspace name is required/i)).toBeInTheDocument();
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  it('should submit the form with valid data and navigate on success', async () => {
     const user = userEvent.setup();
    render(<DashboardSetup user={mockUser} subscription={mockSubscription} />);

    const workspaceNameInput = screen.getByLabelText(/Name/i);
    const submitButton = screen.getByRole('button', { name: /Create Workspace/i });
    const emojiPickerTrigger = screen.getByTestId('emoji-picker');

    // Change emoji
    await user.click(emojiPickerTrigger);
    expect(await screen.findByText('🚀')).toBeInTheDocument();

    // Fill in workspace name
    await user.type(workspaceNameInput, 'My Test Workspace');
    await user.click(submitButton);

    await waitFor(() => {
      expect(createWorkspace).toHaveBeenCalledTimes(1);
    });

    // Check the arguments passed to createWorkspace
    const expectedWorkspaceData = expect.objectContaining({
      iconId: '🚀',
      title: 'My Test Workspace',
      workspaceOwner: mockUser.id,
      logo: null, // Logo upload is commented out in component
      // data: null, // These are likely part of the type but might not be explicitly set
      // inTrash: '',
      // bannerUrl: '',
    });
    expect(createWorkspace).toHaveBeenCalledWith(expectedWorkspaceData);


    // Check dispatch call
     await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
            type: 'ADD_WORKSPACE',
            payload: expect.objectContaining({
              id: expect.any(String), // The ID is generated, so we expect any string
              title: 'My Test Workspace',
              iconId: '🚀',
              folders: [],
              workspaceOwner: mockUser.id,
            }),
          });
     });


    // Check toast message
    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Workspace Created',
          description: 'My Test Workspace has been created successfully.',
        }));
    });


    // Check navigation
    await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith(expect.stringMatching(/\/dashboard\/[a-f0-9-]+/)); // Match UUID pattern
    });

  });

   it('should display error toast if workspace creation fails', async () => {
     const user = userEvent.setup();
    // Mock createWorkspace to simulate an error
    (createWorkspace as jest.Mock).mockResolvedValueOnce({ data: null, error: new Error('Creation failed') });

    render(<DashboardSetup user={mockUser} subscription={mockSubscription} />);

    const workspaceNameInput = screen.getByLabelText(/Name/i);
    const submitButton = screen.getByRole('button', { name: /Create Workspace/i });

    await user.type(workspaceNameInput, 'Failing Workspace');
    await user.click(submitButton);

     await waitFor(() => {
      expect(createWorkspace).toHaveBeenCalledTimes(1);
     });

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          variant: 'destructive',
          title: 'Could not create your workspace',
        }));
    });


    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  // Add more tests:
  // - Test with different subscription statuses (if logic depends on it)
  // - Test file upload logic if it gets uncommented
}); 