'use client';
import React, { useState, useRef, useEffect } from 'react';
import '../styles/ai-dialog.css';
import { useToast } from '@/hooks/use-toast';

// Define text length options
export type TextLengthOption = 'short' | 'medium' | 'long' | 'verylong' | 'custom';

interface TextLengthConfig {
  value: TextLengthOption;
  label: string;
  description: string;
}

const TEXT_LENGTH_OPTIONS: TextLengthConfig[] = [
  { 
    value: 'short', 
    label: 'Short', 
    description: '1-2 sentences' 
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    description: '1 paragraph' 
  },
  { 
    value: 'long', 
    label: 'Long', 
    description: '2-3 paragraphs' 
  },
  { 
    value: 'verylong', 
    label: 'Very Long', 
    description: '4+ paragraphs' 
  },
  { 
    value: 'custom', 
    label: 'Custom', 
    description: 'No length restriction' 
  }
];

interface AIPromptDialogProps {
  onSubmit: (prompt: string, length: TextLengthOption, pdfText?: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const AIPromptDialog: React.FC<AIPromptDialogProps> = ({ 
  onSubmit, 
  onCancel,
  isOpen 
}) => {
  const [prompt, setPrompt] = useState('');
  const [textLength, setTextLength] = useState<TextLengthOption>('medium');
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setIsPdfUploading(false);
      setPdfText(null);
      setPrompt('');
      setTextLength('medium'); // Reset to default length
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitPrompt = async () => {
      try {
        await onSubmit(prompt, textLength, pdfText || undefined);
      } finally {
        setPdfText(null);
      }
    };
    
    submitPrompt();
  };

  const handleCancel = () => {
    setPdfText(null);
    onCancel();
  };

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      // Dynamically load PDF.js if not already loaded
      if (!window.pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load PDF.js'));
          document.head.appendChild(script);
        });
      }

      // Load the PDF document
      if (!window.pdfjsLib) {
        throw new Error('PDF.js library failed to load properly');
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      
      let extractedText = '';
      
      // Process each page
      for (let i = 1; i <= pdf.numPages; i++) {
        if (pdf.numPages > 5 && i % 5 === 0) {
          toast({
            title: 'PDF Processing',
            description: `Extracting page ${i} of ${pdf.numPages}...`,
          });
        }
        
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
      
      // Trim the extracted text to avoid exceeding token limits
      const maxLength = 15000; // Adjust based on model's limits
      if (extractedText.length > maxLength) {
        extractedText = extractedText.substring(0, maxLength) + '...';
        toast({
          title: 'PDF content truncated',
          description: 'The PDF was too large and has been truncated for processing.',
        });
      }
      
      toast({
        title: 'PDF Processed',
        description: `Successfully extracted text from ${pdf.numPages} page${pdf.numPages !== 1 ? 's' : ''}.`,
      });
      
      return extractedText;
    } catch (error: any) {
      console.error('Error extracting text from PDF:', error);
      
      // Provide specific error messages
      if (error.message && error.message.includes('worker')) {
        throw new Error('PDF worker failed to load. Please try refreshing the page.');
      } else if (error.message && error.message.includes('password')) {
        throw new Error('The PDF is password protected. Please remove the password and try again.');
      } else if (error.name === 'InvalidPDFException') {
        throw new Error('The PDF file is invalid or corrupted. Please try another file.');
      } else {
        throw new Error('Failed to extract text from PDF. Please try entering your prompt manually.');
      }
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsPdfUploading(true);
      
      // Validate file type
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload a PDF file.',
          variant: 'destructive',
        });
        return;
      }
      
      // Extract text from PDF
      const arrayBuffer = await file.arrayBuffer();
      const extractedText = await extractTextFromPdf(arrayBuffer);
      
      if (extractedText.trim().length === 0) {
        toast({
          title: 'PDF Error',
          description: 'Could not extract text from the PDF. It may be scanned or have content restrictions.',
          variant: 'destructive',
        });
        return;
      }
      
      // Set the extracted text in state
      setPdfText(extractedText);
      
      // Update the prompt to include info about the PDF
      setPrompt((prevPrompt) => {
        if (prevPrompt.trim()) {
          return `${prevPrompt}\n\nPlease use the content from my uploaded PDF.`;
        } else {
          return 'Please analyze the content from my uploaded PDF and provide insights.';
        }
      });
      
      toast({
        title: 'PDF Uploaded',
        description: 'PDF content has been extracted and will be included with your prompt.',
      });
    } catch (error: any) {
      console.error('Error processing PDF:', error);
      toast({
        title: 'PDF Processing Error',
        description: error.message || 'Failed to process PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsPdfUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePdfUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="ai-prompt-overlay">
      <div className="ai-prompt-dialog">
        <div className="ai-prompt-header">
          <h3>Generate AI Text</h3>
          <button 
            className="ai-prompt-close-btn" 
            onClick={handleCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="ai-prompt-body">
            <label htmlFor="ai-prompt">
              What text would you like to generate?
            </label>
            <textarea
              id="ai-prompt"
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want the AI to write..."
              rows={4}
              className="ai-prompt-input"
            />
            
            <div className="pdf-upload-container">
              <button 
                type="button"
                onClick={handlePdfUploadClick}
                className="pdf-upload-button"
                disabled={isPdfUploading}
              >
                {isPdfUploading ? 'Processing PDF...' : 'Upload PDF'}
              </button>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handlePdfUpload}
                accept=".pdf"
                style={{ display: 'none' }}
                title="Upload PDF"
              />
              {pdfText && (
                <div className="pdf-status">
                  <span className="pdf-status-icon">✓</span>
                  <span className="pdf-status-text">PDF content extracted ({Math.round(pdfText.length / 1000)}K characters)</span>
                </div>
              )}
            </div>
            
            <div className="text-length-selector">
              <label className="length-label">Length:</label>
              <div className="length-options">
                {TEXT_LENGTH_OPTIONS.map((option) => (
                  <label key={option.value} className="length-option">
                    <input
                      type="radio"
                      name="textLength"
                      value={option.value}
                      checked={textLength === option.value}
                      onChange={() => setTextLength(option.value)}
                    />
                    <div className="length-option-content">
                      <span className="length-option-label">{option.label}</span>
                      <span className="length-option-description">{option.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="ai-prompt-footer">
            <button 
              type="button" 
              className="ai-prompt-cancel-btn" 
              onClick={handleCancel}
              disabled={isPdfUploading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="ai-prompt-submit-btn"
              disabled={isPdfUploading || !prompt.trim()}
            >
              {isPdfUploading ? 'Processing...' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIPromptDialog; 