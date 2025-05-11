import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../use-local-storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock window.addEventListener and window.removeEventListener
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;
const addEventListenerMock = jest.fn();
const removeEventListenerMock = jest.fn();

describe('useLocalStorage', () => {
  beforeAll(() => {
    // Replace the real implementations with mocks
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    window.addEventListener = addEventListenerMock;
    window.removeEventListener = removeEventListenerMock;
  });

  afterAll(() => {
    // Restore the real implementations
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should initialize with initialValue when localStorage is empty', () => {
    const initialValue = { name: 'test' };
    const { result } = renderHook(() => useLocalStorage('testKey', initialValue));

    expect(result.current[0]).toEqual(initialValue);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('testKey');
  });

  it('should load value from localStorage if it exists', () => {
    const storedValue = { name: 'stored value' };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedValue));

    const { result } = renderHook(() => useLocalStorage('testKey', { name: 'default' }));

    expect(result.current[0]).toEqual(storedValue);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('testKey');
  });

  it('should update localStorage when state changes', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('updated'));
  });

  it('should allow using a function to update the state', () => {
    const { result } = renderHook(() => useLocalStorage<number>('counter', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('counter', JSON.stringify(1));
  });

  it('should handle JSON parsing errors gracefully', () => {
    // Mock console.warn to suppress expected warning
    const originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    // Mock localStorage.getItem to return invalid JSON
    localStorageMock.getItem.mockReturnValueOnce('invalid-json');

    const initialValue = 'default';
    const { result } = renderHook(() => useLocalStorage('testKey', initialValue));

    // Should fall back to initial value when JSON parsing fails
    expect(result.current[0]).toBe(initialValue);
    expect(console.warn).toHaveBeenCalled();

    // Restore console.warn
    console.warn = originalConsoleWarn;
  });

  it('should add storage event listener on mount and clean up on unmount', () => {
    const { unmount } = renderHook(() => useLocalStorage('testKey', 'value'));

    expect(addEventListenerMock).toHaveBeenCalledWith('storage', expect.any(Function));

    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('should update value when storage event occurs', () => {
    // Get the event handler function that was registered
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));
    
    // Get the event handler that was registered
    const storageEventHandler = addEventListenerMock.mock.calls[0][1];
    
    // Create a mock storage event
    const mockStorageEvent = {
      key: 'testKey',
      newValue: JSON.stringify('updated from another tab'),
    } as StorageEvent;
    
    // Call the event handler to simulate storage change from another tab
    act(() => {
      storageEventHandler(mockStorageEvent);
    });
    
    expect(result.current[0]).toBe('updated from another tab');
  });

  it('should handle different value types correctly', () => {
    // Test with number
    const { result: numberResult } = renderHook(() => useLocalStorage('numberKey', 42));
    expect(numberResult.current[0]).toBe(42);
    
    // Test with boolean
    const { result: boolResult } = renderHook(() => useLocalStorage('boolKey', true));
    expect(boolResult.current[0]).toBe(true);
    
    // Test with array
    const { result: arrayResult } = renderHook(() => useLocalStorage('arrayKey', [1, 2, 3]));
    expect(arrayResult.current[0]).toEqual([1, 2, 3]);
    
    // Test with object
    const { result: objectResult } = renderHook(() => 
      useLocalStorage('objectKey', { foo: 'bar', count: 42 })
    );
    expect(objectResult.current[0]).toEqual({ foo: 'bar', count: 42 });
  });
}); 