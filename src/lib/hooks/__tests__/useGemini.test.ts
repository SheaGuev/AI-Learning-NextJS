import { renderHook, act, waitFor } from '@testing-library/react';
import { useGemini } from '../useGemini';

// Mock fetch globally
global.fetch = jest.fn();
// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;
// Mock console methods to avoid cluttered test output
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Store spies for localStorage
let getItemSpy: jest.SpyInstance;
let setItemSpy: jest.SpyInstance;

describe('useGemini', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Spy on localStorage methods. Works by spying on the prototype.
    // Ensure localStorage exists (it should in JSDOM)
    if (typeof window !== 'undefined' && window.localStorage) {
      getItemSpy = jest.spyOn(window.localStorage.__proto__, 'getItem');
      setItemSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
    } else {
      // Fallback if localStorage is not available - this path shouldn't ideally be hit in JSDOM
      const mockStorage = { getItem: jest.fn(), setItem: jest.fn(), clear: jest.fn() };
      global.localStorage = mockStorage as any; // less ideal fallback
      getItemSpy = jest.spyOn(mockStorage, 'getItem');
      setItemSpy = jest.spyOn(mockStorage, 'setItem');
    }
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore original localStorage methods
    if (getItemSpy) getItemSpy.mockRestore();
    if (setItemSpy) setItemSpy.mockRestore();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useGemini());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.generateResponse).toBe('function');
    expect(typeof result.current.setApiKey).toBe('function');
  });

  it('should load API key from localStorage on mount', () => {
    const savedApiKey = 'test-api-key';
    getItemSpy.mockReturnValueOnce(savedApiKey); // Use spy
    
    const { result } = renderHook(() => useGemini());
    
    expect(getItemSpy).toHaveBeenCalledWith('gemini_api_key'); // Use spy
    
    // This part tests that if setApiKey is called, it also saves.
    // The load itself should trigger a save if a key is loaded and wasn't there.
    // Let's verify the state first
    // If a key is loaded, the save useEffect should also run.
    // So, setItemSpy should be called after the initial render if getItemSpy returned a key.
    expect(setItemSpy).toHaveBeenCalledWith('gemini_api_key', savedApiKey);
  });

  it('should save API key to localStorage when it changes', () => {
    const { result } = renderHook(() => useGemini());
    const newApiKey = 'new-api-key';
    
    // Ensure getItem doesn't return anything to isolate this test to setApiKey's effect
    getItemSpy.mockReturnValueOnce(null);

    act(() => {
      result.current.setApiKey(newApiKey);
    });
    
    expect(setItemSpy).toHaveBeenCalledWith('gemini_api_key', newApiKey); // Use spy
  });

  it('should throw an error if API key is missing', async () => {
    getItemSpy.mockReturnValueOnce(null); // Ensure no API key is loaded from localStorage
    const { result } = renderHook(() => useGemini());
    
    await expect(result.current.generateResponse('test prompt')).rejects.toThrow('API key is required');
  });

  it('should generate a response successfully', async () => {
    // Mock a successful API response
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Generated text response' }]
          }
        }
      ]
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
      status: 200,
      statusText: 'OK'
    });
    
    const { result } = renderHook(() => useGemini());
    
    // Set API key
    act(() => {
      result.current.setApiKey('test-api-key');
    });
    
    let generatedText;
    await act(async () => {
      generatedText = await result.current.generateResponse('test prompt');
    });
    
    expect(generatedText).toBe('Generated text response');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors correctly', async () => {
    // Mock an API error response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401, // This will be translated to a specific error message by the hook
      json: jest.fn().mockResolvedValueOnce({
        error: { message: 'API key is invalid from server' } // Original server message
      })
    });
    
    const { result } = renderHook(() => useGemini());
    
    // Set API key
    act(() => {
      result.current.setApiKey('invalid-api-key');
    });
    
    // The hook should throw its own formatted error message for 401
    await expect(result.current.generateResponse('test prompt')).rejects.toThrow('API key is invalid or expired. Please update your Gemini API key.');
    expect(result.current.isLoading).toBe(false);
    // Ensure the error state in the hook is updated
    await waitFor(() => expect(result.current.error).not.toBeNull());
    await waitFor(() => expect(result.current.error?.message).toBe('API key is invalid or expired. Please update your Gemini API key.'));
  });

  it('should handle timeout errors', async () => {
    // Mock a timeout by making fetch return a promise that never resolves
    // but respects AbortSignal
    (global.fetch as jest.Mock).mockImplementationOnce((_url, options) => {
      return new Promise((_resolve, reject) => {
        if (options && options.signal) {
          if (options.signal.aborted) {
            // Using DOMException as real fetch does for AbortError
            return reject(new DOMException('Request aborted', 'AbortError'));
          }
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Request aborted', 'AbortError'));
          });
        }
        // Otherwise, the promise just stays pending
      });
    });
    
    const { result } = renderHook(() => useGemini());
    
    // Set API key
    act(() => {
      result.current.setApiKey('test-api-key');
    });
    
    const generatePromise = result.current.generateResponse('test prompt');
    
    // Advance timers to trigger the internal timeout in useGemini
    act(() => {
      jest.advanceTimersByTime(31000); // Hook timeout is 30s
    });
    
    // The hook should throw its user-friendly timeout error
    await expect(generatePromise).rejects.toThrow('The request to the AI service timed out. Please try again or check your internet connection.');
    await waitFor(() => expect(result.current.error?.message).toBe('The request to the AI service timed out. Please try again or check your internet connection.'));
  });

  it('should include file contexts in the prompt when provided', async () => {
    // Mock a successful API response
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Generated text with file context' }]
          }
        }
      ]
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse),
      status: 200,
      statusText: 'OK'
    });
    
    const { result } = renderHook(() => useGemini());
    
    // Set API key
    act(() => {
      result.current.setApiKey('test-api-key');
    });
    
    const files = [
      { title: 'test.js', content: 'console.log("test");' }
    ];
    
    let generatedText;
    await act(async () => {
      generatedText = await result.current.generateResponse('test prompt', files);
    });
    
    expect(generatedText).toBe('Generated text with file context');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Check that file context was included in the request body
    const fetchCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(fetchCallBody.contents[0].parts[0].text).toContain('I have the following files as context');
    expect(fetchCallBody.contents[0].parts[0].text).toContain('FILE: test.js');
  });
}); 