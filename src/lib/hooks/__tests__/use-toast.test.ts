import { act, renderHook } from '@testing-library/react';
import { useToast, reducer } from '../use-toast';

describe('useToast', () => {
  beforeEach(() => {
    // Clear any timeouts
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it('should initialize with empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast when toast() is called', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'This is a test toast',
      });
    });
    
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].description).toBe('This is a test toast');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('should dismiss a toast when dismiss() is called with id', () => {
    const { result } = renderHook(() => useToast());
    
    let toastId: string;
    
    act(() => {
      const response = result.current.toast({ title: 'Test Toast' });
      toastId = response.id;
    });
    
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].open).toBe(true);
    
    act(() => {
      result.current.dismiss(toastId);
    });
    
    // Toast should still be in the array but with open=false
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should dismiss all toasts when dismiss() is called without id', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'Toast 1' });
      result.current.toast({ title: 'Toast 2' });
    });
    
    // Due to TOAST_LIMIT = 1, we should only have one toast
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].open).toBe(true);
    
    act(() => {
      result.current.dismiss();
    });
    
    // All toasts should be marked as closed
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should allow updating a toast', () => {
    const { result } = renderHook(() => useToast());
    
    let toastResponse: { id: string; dismiss: () => void; update: (props: any) => void };
    
    act(() => {
      toastResponse = result.current.toast({
        title: 'Original Title',
        description: 'Original Description',
      });
    });
    
    act(() => {
      toastResponse.update({
        id: toastResponse.id,
        title: 'Updated Title',
        description: 'Updated Description',
      });
    });
    
    expect(result.current.toasts[0].title).toBe('Updated Title');
    expect(result.current.toasts[0].description).toBe('Updated Description');
  });

  it('should respect the TOAST_LIMIT', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({ title: 'Toast 1' });
      result.current.toast({ title: 'Toast 2' });
      result.current.toast({ title: 'Toast 3' });
    });
    
    // Due to TOAST_LIMIT = 1, we should only have one toast
    expect(result.current.toasts.length).toBe(1);
    // The latest toast should be at the top
    expect(result.current.toasts[0].title).toBe('Toast 3');
  });

  describe('reducer', () => {
    it('should handle ADD_TOAST action', () => {
      const initialState = { toasts: [] };
      const toast = { id: '1', title: 'Test Toast', open: true };
      
      const newState = reducer(initialState, {
        type: 'ADD_TOAST',
        toast,
      });
      
      expect(newState.toasts).toEqual([toast]);
    });
    
    it('should handle UPDATE_TOAST action', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Original Title', description: 'Original Desc', open: true },
        ],
      };
      
      const newState = reducer(initialState, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated Title' },
      });
      
      expect(newState.toasts[0].title).toBe('Updated Title');
      expect(newState.toasts[0].description).toBe('Original Desc');
    });
    
    it('should handle DISMISS_TOAST action for a specific toast', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1', open: true },
          { id: '2', title: 'Toast 2', open: true },
        ],
      };
      
      const newState = reducer(initialState, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });
      
      expect(newState.toasts[0].open).toBe(false);
      expect(newState.toasts[1].open).toBe(true);
    });
    
    it('should handle DISMISS_TOAST action for all toasts when no id is provided', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1', open: true },
          { id: '2', title: 'Toast 2', open: true },
        ],
      };
      
      const newState = reducer(initialState, {
        type: 'DISMISS_TOAST',
      });
      
      expect(newState.toasts[0].open).toBe(false);
      expect(newState.toasts[1].open).toBe(false);
    });
    
    it('should handle REMOVE_TOAST action for a specific toast', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1', open: true },
          { id: '2', title: 'Toast 2', open: true },
        ],
      };
      
      const newState = reducer(initialState, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });
      
      expect(newState.toasts.length).toBe(1);
      expect(newState.toasts[0].id).toBe('2');
    });
    
    it('should handle REMOVE_TOAST action for all toasts when no id is provided', () => {
      const initialState = {
        toasts: [
          { id: '1', title: 'Toast 1', open: true },
          { id: '2', title: 'Toast 2', open: true },
        ],
      };
      
      const newState = reducer(initialState, {
        type: 'REMOVE_TOAST',
      });
      
      expect(newState.toasts).toEqual([]);
    });
  });
}); 