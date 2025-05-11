import { renderHook, act } from '@testing-library/react';
import { usePDFExtractor, extractFullTextFromFile } from '../use-pdf-extractor';
import { useToast } from '../use-toast';

// Get a reference to the actual module exports BEFORE jest.mock is hoisted and executed.
const actualPdfExtractorModule = jest.requireActual('../use-pdf-extractor');
const actualExtractFullTextFromFileOriginal = actualPdfExtractorModule.extractFullTextFromFile;
const actualUsePDFExtractor = actualPdfExtractorModule.usePDFExtractor;

// Mock dependencies
jest.mock('../use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock '../use-pdf-extractor'. 
// The original usePDFExtractor will be used from actualPdfExtractorModule.usePDFExtractor if needed directly.
// The exported extractFullTextFromFile will be a mock.
jest.mock('../use-pdf-extractor', () => ({
  __esModule: true,
  // Provide the original hook implementation for when the module is imported normally in tests
  // (though for clarity, tests could use actualUsePDFExtractor directly).
  usePDFExtractor: jest.requireActual('../use-pdf-extractor').usePDFExtractor, 
  extractFullTextFromFile: jest.fn(), // This is THE mock for the EXPORTED function.
}));

// Mock PDF.js library
const mockPdfJs = {
  getDocument: jest.fn(),
  GlobalWorkerOptions: {
    workerSrc: '',
  },
};

// Mock dynamic import
jest.mock('pdfjs-dist', () => mockPdfJs, { virtual: true });

// Mock File implementation
class MockFile extends Blob {
  constructor(parts: BlobPart[], name: string) {
    super(parts);
    this.name = name;
  }
  name: string;
  arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
}

// Mock the NODE_ENV for testing
Object.defineProperty(process, 'env', {
  value: { ...process.env, NODE_ENV: 'test' }
});

describe('usePDFExtractor', () => {
  // Import the mocked version of extractFullTextFromFile from the mocked module
  const { extractFullTextFromFile: mockedExtractFullTextFromFileExport } = require('../use-pdf-extractor');
  // Ensure it's treated as a Jest mock function for typing and methods
  const mockedETFF = mockedExtractFullTextFromFileExport as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks(); // Clears all mocks
    mockedETFF.mockClear(); // Specifically clear our main mock function for ETFF

    (useToast as jest.Mock).mockReturnValue({ toast: jest.fn(), dismiss: jest.fn() });
    
    // Setup PDF.js mock
    const mockTextContent = {
      items: [
        { str: 'This is ' },
        { str: 'a test ' },
        { str: 'PDF document.' },
      ],
    };

    const mockPage = {
      getTextContent: jest.fn().mockResolvedValue(mockTextContent),
    };

    const mockPdf = {
      numPages: 2,
      getPage: jest.fn().mockResolvedValue(mockPage),
    };

    mockPdfJs.getDocument.mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });

    // Ensure pdfjsLib is available on window
    Object.defineProperty(window, 'pdfjsLib', {
      value: mockPdfJs,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up any pending mocks
    jest.restoreAllMocks();
  });

  describe('extractFullText', () => {
    it('should extract text from a PDF file', async () => {
      // This test uses the hook (actualUsePDFExtractor or the one from the mocked module, which is original).
      // It will internally call the *original* extractFullTextFromFile.
      const { result } = renderHook(() => actualUsePDFExtractor()); // Use the definitely original hook
      const mockFile = new MockFile([], 'test.pdf');
      
      let extractedText: string = '';
      await act(async () => {
        extractedText = await result.current.extractFullText(mockFile as unknown as File);
      });
      
      expect(extractedText).toContain('This is  a test  PDF document.\n\nThis is  a test  PDF document.\n\n');
      expect((useToast as jest.Mock)().toast).toHaveBeenCalledWith({
        title: 'PDF Processed',
        description: 'Successfully extracted text from the PDF.',
      });
    });

    it('should handle errors during PDF extraction', async () => {
      mockPdfJs.getDocument.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => actualUsePDFExtractor()); // Use the definitely original hook
      const mockFile = new MockFile([], 'test.pdf');
      
      try {
        await result.current.extractFullText(mockFile as unknown as File);
        throw new Error('Should have thrown an error');
      } catch (error) {
        // Error is expected
      }
      
      expect((useToast as jest.Mock)().toast).toHaveBeenCalledWith({
        title: 'PDF Processing Error',
        description: 'Failed to extract text from PDF: Test error',
        variant: 'destructive',
      });
      consoleErrorSpy.mockRestore();
    });
  });

  describe('extractChunkedText', () => {
    beforeEach(() => { 
      mockedETFF.mockClear(); 
      // Ensure default mockPdfJs.getDocument behavior for these tests
      // as actualUsePDFExtractor will call the original extractFullTextFromFile.
      const mockTextContent = { items: [{ str: 'This is ' }, { str: 'a test ' }, { str: 'PDF document.' }] };
      const mockPage = { getTextContent: jest.fn().mockResolvedValue(mockTextContent) };
      const mockPdfDoc = { numPages: 2, getPage: jest.fn().mockResolvedValue(mockPage) };
      mockPdfJs.getDocument.mockReset(); // Clear any specific implementations from other tests
      mockPdfJs.getDocument.mockReturnValue({ promise: Promise.resolve(mockPdfDoc) });

      // Ensure GlobalWorkerOptions is properly defined
      if (!mockPdfJs.GlobalWorkerOptions) {
        mockPdfJs.GlobalWorkerOptions = { workerSrc: '' };
      }
    });

    it('should extract text from PDF and split into chunks', async () => {
      // This test now uses actualUsePDFExtractor, which calls the original extractFullTextFromFile.
      // The original ETFF will process the default 2-page mock PDF (~64 chars).
      // chunkSize=100 will result in 1 chunk.
      // mockedETFF.mockResolvedValue(longText); // This line is not effective here.
      
      const { result } = renderHook(() => actualUsePDFExtractor({ chunkSize: 100, overlapSize: 20 }));
      const mockFile = new MockFile([], 'test.pdf');
      let chunks: string[] = [];
      await act(async () => { chunks = await result.current.extractChunkedText(mockFile as unknown as File); });
      
      expect(chunks.length).toBe(1); // Expect 1 chunk for the ~64 char input
      expect(chunks[0]).toContain('This is  a test  PDF document.'); // Check content of the single chunk
      expect((useToast as jest.Mock)().toast).toHaveBeenCalledWith({
        title: 'PDF Chunked',
        description: 'Split PDF into 1 manageable chunks.', // Updated count
      });
    });

    it('should handle errors during chunking (when underlying PDF processing fails)', async () => {
      // To test extractChunkedText's error handling, make the internal call to 
      // actualExtractFullTextFromFileOriginal fail.
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPdfJs.getDocument.mockImplementationOnce(() => { 
        throw new Error('Internal PDF processing failed'); 
      });
      
      const { result } = renderHook(() => actualUsePDFExtractor());
      const mockFile = new MockFile([], 'test.pdf');
      
      // Wrap in try/catch to properly handle the error
      try {
        await act(async () => { 
          await result.current.extractChunkedText(mockFile as unknown as File); 
        });
        // If we get here, the test should fail because an error was expected
        fail('extractChunkedText should have thrown an error');
      } catch (error: any) {
        // The error thrown by extractChunkedText will be the one from extractFullTextFromFile.
        expect(error.message).toContain('Failed to extract text from PDF');
      }

      // Verify toast was called with the right error message
      expect((useToast as jest.Mock)().toast).toHaveBeenCalledWith({
        title: 'PDF Chunking Error',
        description: expect.stringContaining('Failed to extract text from PDF'),
        variant: 'destructive',
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('extractFullTextFromFile (testing actual implementation)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'pdfjsLib', {
        value: mockPdfJs, // Default working state
        writable: true,
        configurable: true,
      });
      mockPdfJs.getDocument.mockReset();
      const mockTextContent = { items: [{ str: 'This is ' }, { str: 'a test ' }, { str: 'PDF document.' }] };
      const mockPage = { getTextContent: jest.fn().mockResolvedValue(mockTextContent) };
      const mockPdfDoc = { numPages: 2, getPage: jest.fn().mockResolvedValue(mockPage) };
      mockPdfJs.getDocument.mockReturnValue({ promise: Promise.resolve(mockPdfDoc) }); // Default successful mock
    });

    it('should handle PDF.js loading errors', async () => {
      const originalMockPdfJsValues = { ...mockPdfJs }; // Save current state of mockPdfJs values
      const originalWindowPdfJsLib = (window as any).pdfjsLib;

      (window as any).pdfjsLib = undefined; // Start with pdfjsLib undefined on window
      
      // Make import('pdfjs-dist') effectively fail within loadPDFJS 
      // by making the resolved mockPdfJs cause an error inside loadPDFJS, e.g., when setting workerSrc.
      // This will make loadPDFJS throw "Failed to load PDF.js".
      delete (mockPdfJs as any).GlobalWorkerOptions; // This will cause error in loadPDFJS

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockFile = new MockFile([], 'test.pdf');
      try {
        await actualExtractFullTextFromFileOriginal(mockFile as unknown as File);
        throw new Error('Expected actualExtractFullTextFromFileOriginal to throw when PDF.js lib is not loaded');
      } catch (error: any) {
        // Expect the error that results from loadPDFJS failing and extractFullTextFromFile re-wrapping it
        expect(error.message).toBe('Failed to extract text from PDF: Failed to load PDF.js');
      } finally {
        (window as any).pdfjsLib = originalWindowPdfJsLib;
        // Restore GlobalWorkerOptions (assuming it was an object, might need more robust restoration if complex)
        (mockPdfJs as any).GlobalWorkerOptions = originalMockPdfJsValues.GlobalWorkerOptions || { workerSrc: '' }; 
        consoleErrorSpy.mockRestore();
      }
    });

    it('should handle specific PDF error types with helpful messages', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const testCases = [
        { error: { message: 'worker failed', name: 'Error' }, expectedMessage: 'PDF worker failed to load. Please try refreshing the page.' },
        { error: { message: 'password required', name: 'Error' }, expectedMessage: 'The PDF is password protected. Please remove the password and try again.' },
        { error: { name: 'InvalidPDFException', message: 'Invalid PDF' }, expectedMessage: 'The PDF file is invalid or corrupted. Please try another file.' },
        { error: { message: 'not a PDF file', name: 'Error' }, expectedMessage: 'The uploaded file is not a valid PDF. Please upload a PDF document.' }
      ];
      for (const testCase of testCases) {
        // Ensure getDocument is freshly mocked for this specific case
        mockPdfJs.getDocument.mockImplementationOnce(() => { throw testCase.error; }); 
        const mockFile = new MockFile([], 'test.pdf');
        try {
          await actualExtractFullTextFromFileOriginal(mockFile as unknown as File);
          throw new Error(`Expected actualExtractFullTextFromFileOriginal to throw: ${testCase.expectedMessage}`);
        } catch (error: any) {
          expect(error.message).toBe(testCase.expectedMessage);
        }
      }
      consoleErrorSpy.mockRestore();
    });
  });
}); 