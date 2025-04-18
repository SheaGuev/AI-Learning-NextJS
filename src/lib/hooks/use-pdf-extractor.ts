import { useCallback } from 'react';
import { useToast } from '@/lib/hooks/use-toast';

// Type definitions for PDF.js
interface PDFJS {
  getDocument: (params: { data: Uint8Array }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNum: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str: string }>;
        }>;
      }>;
    }>;
  };
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

// Helper function to load PDF.js if not already loaded
const loadPDFJS = async () => {
  if (!(window as any).pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      script.onload = () => {
        // Set the worker URL
        if ((window as any).pdfjsLib && 'GlobalWorkerOptions' in (window as any).pdfjsLib) {
          ((window as any).pdfjsLib as PDFJS).GlobalWorkerOptions.workerSrc = 
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
  }
};

// Standalone function for extracting full text
export const extractFullTextFromFile = async (file: File): Promise<string> => {
  try {
    await loadPDFJS();

    if (!(window as any).pdfjsLib) {
      throw new Error('PDF.js library failed to load properly');
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = ((window as any).pdfjsLib as PDFJS).getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let extractedText = '';
    
    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatenate text items with proper spacing
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');
      
      extractedText += pageText + '\n\n';
    }
    
    return extractedText;
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    
    if (error.message?.includes('worker')) {
      throw new Error('PDF worker failed to load. Please try refreshing the page.');
    } else if (error.message?.includes('password')) {
      throw new Error('The PDF is password protected. Please remove the password and try again.');
    } else if (error.name === 'InvalidPDFException') {
      throw new Error('The PDF file is invalid or corrupted. Please try another file.');
    } else {
      throw new Error('Failed to extract text from PDF.');
    }
  }
};

interface PDFExtractorOptions {
  chunkSize?: number; // Default chunk size in characters
  overlapSize?: number; // Default overlap size between chunks in characters
}

export const usePDFExtractor = (options: PDFExtractorOptions = {}) => {
  const { toast } = useToast();
  const { chunkSize = 5000, overlapSize = 500 } = options;

  // Extract full text from PDF using the standalone function
  const extractFullText = useCallback(async (file: File): Promise<string> => {
    try {
      const text = await extractFullTextFromFile(file);
      toast({
        title: 'PDF Processed',
        description: `Successfully extracted text from the PDF.`,
      });
      return text;
    } catch (error: any) {
      toast({
        title: 'PDF Processing Error',
        description: error.message || 'Failed to process PDF.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Extract text from PDF and split into chunks
  const extractChunkedText = useCallback(async (file: File): Promise<string[]> => {
    try {
      const fullText = await extractFullTextFromFile(file); // Use the standalone function here too
      
      // Split text into chunks with overlap
      const chunks: string[] = [];
      let startIndex = 0;
      
      while (startIndex < fullText.length) {
        let endIndex = startIndex + chunkSize;
        if (endIndex < fullText.length) {
          const searchStart = Math.max(startIndex, endIndex - overlapSize);
          const searchEnd = Math.min(endIndex + overlapSize, fullText.length);
          const searchText = fullText.substring(searchStart, searchEnd);
          const lastSentenceEnd = Math.max(
            searchText.lastIndexOf('.'),
            searchText.lastIndexOf('?'),
            searchText.lastIndexOf('!')
          );
          if (lastSentenceEnd !== -1) {
            endIndex = searchStart + lastSentenceEnd + 1;
          }
        }
        chunks.push(fullText.substring(startIndex, endIndex).trim());
        startIndex = endIndex - overlapSize;
      }
      
      toast({
        title: 'PDF Chunked',
        description: `Split PDF into ${chunks.length} manageable chunks.`,
      });
      
      return chunks;
    } catch (error: any) {
      console.error('Error chunking PDF text:', error);
      toast({
        title: 'PDF Chunking Error',
        description: error.message || 'Failed to split PDF into chunks.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [chunkSize, overlapSize, toast]);

  return {
    extractFullText,
    extractChunkedText
  };
}; 