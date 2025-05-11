import { renderHook, act } from '@testing-library/react';
import { usePDFProcessor } from '../use-pdf-processor';
import { useToast } from '@/lib/hooks/use-toast';
import { usePDFExtractor } from '@/lib/hooks/use-pdf-extractor';

// Mock dependencies
jest.mock('@/lib/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/lib/hooks/use-pdf-extractor', () => ({
  usePDFExtractor: jest.fn(),
}));

describe('usePDFProcessor', () => {
  // Mock functions and values
  const mockQuill = { root: { innerHTML: '' } };
  const mockGenerateText = jest.fn();
  const mockToast = jest.fn();
  const mockExtractFullText = jest.fn();
  const mockExtractChunkedText = jest.fn();
  
  // Mock console methods
  const originalConsoleError = console.error;
  
  beforeAll(() => {
    // Replace console methods with mocks
    console.error = jest.fn();
  });
  
  afterAll(() => {
    // Restore console methods
    console.error = originalConsoleError;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
    
    (usePDFExtractor as jest.Mock).mockReturnValue({
      extractFullText: mockExtractFullText,
      extractChunkedText: mockExtractChunkedText,
    });
    
    // Reset mock functions
    mockGenerateText.mockReset();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePDFProcessor(mockQuill, mockGenerateText));
    
    expect(result.current.processingPdfSection).toBe(false);
    expect(typeof result.current.handlePdfSectionSummary).toBe('function');
    expect(typeof result.current.formatPdfContent).toBe('function');
    expect(result.current.extractFullText).toBe(mockExtractFullText);
    expect(result.current.extractChunkedText).toBe(mockExtractChunkedText);
  });

  describe('handlePdfSectionSummary', () => {
    it('should generate a summary from AI when successful', async () => {
      // Mock the AI response as a valid JSON string
      const mockJsonResponse = `{
        "heading": "Test Heading for PDF Section",
        "summary": "This is a test summary of the PDF section content."
      }`;
      mockGenerateText.mockResolvedValueOnce(mockJsonResponse);
      
      const { result } = renderHook(() => usePDFProcessor(mockQuill, mockGenerateText));
      
      let summary;
      await act(async () => {
        summary = await result.current.handlePdfSectionSummary('This is the content of a PDF section');
      });
      
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.stringContaining('Given the following text from a PDF section'),
        expect.anything()
      );
      expect(summary).toEqual({
        heading: 'Test Heading for PDF Section',
        summary: 'This is a test summary of the PDF section content.'
      });
      expect(result.current.processingPdfSection).toBe(false);
    });

    it('should extract JSON from code blocks', async () => {
      // Mock the AI response as a JSON string within code blocks
      const mockResponse = `Here's a summary of the text:

\`\`\`json
{
  "heading": "Code Block Heading",
  "summary": "Summary from code block."
}
\`\`\`

Hope this helps!`;
      mockGenerateText.mockResolvedValueOnce(mockResponse);
      
      const { result } = renderHook(() => usePDFProcessor(mockQuill, mockGenerateText));
      
      let summary;
      await act(async () => {
        summary = await result.current.handlePdfSectionSummary('Test content');
      });
      
      expect(summary).toEqual({
        heading: 'Code Block Heading',
        summary: 'Summary from code block.'
      });
    });

    it('should generate fallback heading and summary on AI error', async () => {
      // Mock the AI response as invalid (not JSON)
      mockGenerateText.mockResolvedValueOnce('This is not a valid JSON response');
      
      const { result } = renderHook(() => usePDFProcessor(mockQuill, mockGenerateText));
      
      const testContent = 'This is a test sentence for the PDF content. Another test sentence with more details.';
      
      let summary;
      await act(async () => {
        summary = await result.current.handlePdfSectionSummary(testContent);
      });
      
      // The heading should contain just a portion of the first sentence
      // We'll use a "contains" rather than direct equality due to potential implementation differences
      expect(summary!.heading).toContain('This is a test sentence');
      expect(summary!.summary).toContain('This is a test sentence');
      expect(summary!.summary).toContain('Another test sentence with more details');
    });

    it('should handle rate limit errors with a toast message', async () => {
      // Mock an AI generation error
      mockGenerateText.mockRejectedValueOnce(new Error('Rate limit exceeded'));
      
      const { result } = renderHook(() => usePDFProcessor(mockQuill, mockGenerateText));
      
      let summary;
      await act(async () => {
        summary = await result.current.handlePdfSectionSummary('Test content with rate limit error');
      });
      
      // Should still return a fallback summary
      expect(summary).toHaveProperty('heading');
      expect(summary).toHaveProperty('summary');
      
      // Should show a toast notification
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Rate limit exceeded',
        description: 'The AI service is busy. Please try again in a few moments.',
        variant: 'destructive',
      });
    });
  });

  describe('formatPdfContent', () => {
    it('should format PDF content using AI', async () => {
      const formattedContent = 'This is nicely formatted content';
      mockGenerateText.mockResolvedValueOnce(formattedContent);
      
      const { result } = renderHook(() => usePDFProcessor(mockQuill, mockGenerateText));
      
      let formatted;
      await act(async () => {
        formatted = await result.current.formatPdfContent(
          'Original content',
          'Test Heading',
          'Format with bullet points'
        );
      });
      
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.stringContaining('Format the following text from a PDF section'),
        expect.anything()
      );
      expect(formatted).toBe(formattedContent);
    });

    it('should throw an error when AI formatting fails', async () => {
      mockGenerateText.mockResolvedValueOnce(''); // Empty response
      
      const { result } = renderHook(() => usePDFProcessor(mockQuill, mockGenerateText));
      
      await expect(
        result.current.formatPdfContent('Original content', 'Test Heading', 'Format instructions')
      ).rejects.toThrow('Failed to format content');
    });

    it('should propagate errors from the AI generation', async () => {
      const testError = new Error('AI generation error');
      mockGenerateText.mockRejectedValueOnce(testError);
      
      const { result } = renderHook(() => usePDFProcessor(mockQuill, mockGenerateText));
      
      await expect(
        result.current.formatPdfContent('Original content', 'Test Heading', 'Format instructions')
      ).rejects.toThrow(testError);
    });
  });
}); 