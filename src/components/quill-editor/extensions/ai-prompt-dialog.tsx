'use client';
import React, { useState, useRef, useEffect } from 'react';
import '../styles/ai-dialog.css';
import { useToast } from '@/lib/hooks/use-toast';
import { usePDFExtractor } from '@/lib/hooks/use-pdf-extractor';

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

export const AIPromptDialog: React.FC<AIPromptDialogProps> = ({ 
  onSubmit, 
  onCancel,
  isOpen 
}) => {
  const [prompt, setPrompt] = useState('');
  const [textLength, setTextLength] = useState<TextLengthOption>('medium');
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { extractFullText } = usePDFExtractor();

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
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('AI Dialog: Submit already in progress, preventing duplicate submission');
      return;
    }
    
    const submitPrompt = async () => {
      setIsSubmitting(true);
      console.log('AI Dialog: Starting submit process');
      
      try {
        // Check if prompt is empty
        if (!prompt.trim()) {
          console.error('AI Dialog: Empty prompt submitted');
          toast({
            title: 'Empty prompt',
            description: 'Please enter a prompt before generating text.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        
        // Add the instruction to prevent markdown code blocks internally
        const enhancedPrompt = `${prompt}\n\nImportant: Do not wrap your response in markdown code blocks (like \`\`\`markdown ... \`\`\`).`;
        console.log('AI Dialog: Submitting enhanced prompt', { promptLength: enhancedPrompt.length });
        
        await onSubmit(enhancedPrompt, textLength, pdfText || undefined);
        console.log('AI Dialog: onSubmit completed successfully');
        // Dialog will be closed by parent component
      } catch (error) {
        console.error('AI Dialog: Error in submit process:', error);
        // Let the parent component handle closing
      } finally {
        setPdfText(null);
        setIsSubmitting(false);
      }
    };
    
    submitPrompt();
  };

  const handleCancel = () => {
    console.log('AI Dialog: Close or Cancel button clicked');
    setPdfText(null);
    onCancel();
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Extract text from PDF
      const extractedText = await extractFullText(file);
      
      if (extractedText.trim().length === 0) {
        toast({
          title: 'PDF Error',
          description: 'Could not extract text from the PDF. It may be scanned or have content restrictions.',
          variant: 'destructive',
        });
        return;
      }

      // Set the extracted text as the prompt
      setPrompt(extractedText);
      
      toast({
        title: 'PDF Processed',
        description: 'Text has been extracted from the PDF and added to your prompt.',
      });
    } catch (error: any) {
      console.error('Error processing PDF:', error);
      toast({
        title: 'PDF Processing Error',
        description: error.message || 'Failed to process PDF. Please try entering your prompt manually.',
        variant: 'destructive',
      });
    } finally {
      // Reset the file input
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
            aria-label="Close dialog"
            data-testid="ai-prompt-close-btn"
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
              disabled={isPdfUploading || !prompt.trim() || isSubmitting}
            >
              {isSubmitting ? 'Generating...' : (isPdfUploading ? 'Processing...' : 'Generate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIPromptDialog; 