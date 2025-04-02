'use client';
import React, { useState, useRef, useEffect } from 'react';
import '../styles/ai-dialog.css';

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
  onSubmit: (prompt: string, length: TextLengthOption) => void;
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setLoading(false);
      setPrompt('');
      setTextLength('medium'); // Reset to default length
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const submitPrompt = async () => {
      try {
        await onSubmit(prompt, textLength);
      } finally {
        setLoading(false);
      }
    };
    
    submitPrompt();
  };

  const handleCancel = () => {
    setLoading(false);
    onCancel();
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
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="ai-prompt-submit-btn"
              disabled={loading || !prompt.trim()}
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIPromptDialog; 