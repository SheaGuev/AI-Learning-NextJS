'use client';
import React, { useState, useRef, useEffect } from 'react';
import '../../styles/ai-dialog.css';

interface APIKeyDialogProps {
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const APIKeyDialog: React.FC<APIKeyDialogProps> = ({
  onSubmit,
  onCancel,
  isOpen
}) => {
  const [apiKey, setApiKey] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(apiKey);
  };

  if (!isOpen) return null;

  return (
    <div className="ai-prompt-overlay">
      <div className="ai-prompt-dialog">
        <div className="ai-prompt-header">
          <h3>Gemini API Key Required</h3>
          <button
            className="ai-prompt-close-btn"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="ai-prompt-body">
            <p className="text-sm text-gray-600 mb-4">
              To use AI text generation, you need to provide your Gemini API key. 
              You can get one for free from <a 
                href="https://ai.google.dev/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>.
            </p>
            <label htmlFor="api-key">
              Gemini API Key
            </label>
            <input
              id="api-key"
              ref={inputRef}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="ai-prompt-input"
            />
            <p className="text-xs text-gray-500 mt-2">
              Your API key will be stored locally in your browser and is not sent to our servers.
            </p>
          </div>
          <div className="ai-prompt-footer">
            <button
              type="button"
              className="ai-prompt-cancel-btn"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ai-prompt-submit-btn"
              disabled={!apiKey.trim()}
            >
              Save API Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default APIKeyDialog;