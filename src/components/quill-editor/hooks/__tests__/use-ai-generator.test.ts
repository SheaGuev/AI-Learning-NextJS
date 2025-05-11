import { renderHook, act } from '@testing-library/react';
import { useAIGenerator } from '../use-ai-generator';
import { useGemini } from '@/lib/hooks/useGemini';
import { useToast } from '@/lib/hooks/use-toast';

// Mock dependencies
jest.mock('@/lib/hooks/useGemini', () => ({
  useGemini: jest.fn(),
}));

jest.mock('@/lib/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock console.error to prevent test output clutter
const originalConsoleError = console.error;

describe('useAIGenerator', () => {
  // Setup mocks
  const mockGenerateResponse = jest.fn();
  const mockSetApiKey = jest.fn();
  const mockToast = jest.fn();
  
  beforeAll(() => {
    // Replace console.error with mock
    console.error = jest.fn();
  });
  
  afterAll(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useGemini hook
    (useGemini as jest.Mock).mockReturnValue({
      generateResponse: mockGenerateResponse,
      isLoading: false,
      setApiKey: mockSetApiKey,
      error: null,
    });
    
    // Mock useToast hook
    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
    
    // Mock localStorage.getItem to return an API key
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'gemini_api_key') {
        return 'mock-api-key';
      }
      return null;
    });
  });
  
  it('should generate text without context', async () => {
    mockGenerateResponse.mockResolvedValueOnce('Generated AI response');
    
    const { result } = renderHook(() => useAIGenerator());
    
    let response;
    await act(async () => {
      response = await result.current.generateText('Generate a poem about AI');
    });
    
    expect(mockGenerateResponse).toHaveBeenCalledWith('Generate a poem about AI');
    expect(response).toBe('Generated AI response');
  });
  
  it('should generate text with context', async () => {
    mockGenerateResponse.mockResolvedValueOnce('Generated AI response with context');
    
    const { result } = renderHook(() => useAIGenerator());
    
    let response;
    const context = 'This is some context about AI and machine learning.';
    
    await act(async () => {
      response = await result.current.generateText('Continue this text', context);
    });
    
    expect(mockGenerateResponse).toHaveBeenCalledWith(
      expect.stringContaining('Based on the following text:')
    );
    expect(mockGenerateResponse).toHaveBeenCalledWith(
      expect.stringContaining(context)
    );
    expect(response).toBe('Generated AI response with context');
  });
  
  it('should handle errors during text generation', async () => {
    const error = new Error('API key is invalid');
    mockGenerateResponse.mockRejectedValueOnce(error);
    
    const { result } = renderHook(() => useAIGenerator());
    
    let response;
    await act(async () => {
      response = await result.current.generateText('Generate something');
    });
    
    expect(response).toBe('');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'API Key Error',
      description: 'Your API key is invalid or expired. Please update your API key.',
      variant: 'destructive',
    });
  });
  
  it('should handle rate limit errors with specific message', async () => {
    const error = new Error('Rate limit exceeded');
    mockGenerateResponse.mockRejectedValueOnce(error);
    
    const { result } = renderHook(() => useAIGenerator());
    
    await act(async () => {
      await result.current.generateText('Generate something');
    });
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Rate limit exceeded',
      description: 'The AI service is busy. Please try again in a few moments.',
      variant: 'destructive',
    });
  });
  
  it('should handle timeout errors with specific message', async () => {
    const error = new Error('Request timed out');
    mockGenerateResponse.mockRejectedValueOnce(error);
    
    const { result } = renderHook(() => useAIGenerator());
    
    await act(async () => {
      await result.current.generateText('Generate something');
    });
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Request timed out',
      description: 'The request to the AI service timed out. Please try again or check your internet connection.',
      variant: 'destructive',
    });
  });
  
  it('should set API key and update state', () => {
    const { result } = renderHook(() => useAIGenerator());
    
    act(() => {
      result.current.setApiKey('new-api-key');
    });
    
    expect(mockSetApiKey).toHaveBeenCalledWith('new-api-key');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'API Key Saved',
      description: 'Your Gemini API key has been saved.',
    });
  });
}); 