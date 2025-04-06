'use client';
import React, { useState, useCallback } from 'react';
import { TextLengthOption } from '../extensions/ai-prompt-dialog';
import AIPromptDialog from '../extensions/ai-prompt-dialog';
import APIKeyDialog from '../extensions/api-key-dialog';

interface AIGenerationProviderProps {
  onGenerate: (prompt: string, length: TextLengthOption, pdfText?: string) => Promise<void>;
  onSetApiKey: (apiKey: string) => void;
  apiKeyExists: boolean;
  showAIPrompt?: boolean;
  showAPIKeyDialog?: boolean;
  setShowAIPrompt?: (show: boolean) => void;
  setShowAPIKeyDialog?: (show: boolean) => void;
}

const AIGenerationProvider: React.FC<AIGenerationProviderProps> = ({
  onGenerate,
  onSetApiKey,
  apiKeyExists,
  showAIPrompt: externalShowAIPrompt,
  showAPIKeyDialog: externalShowAPIKeyDialog,
  setShowAIPrompt,
  setShowAPIKeyDialog
}) => {
  const [internalShowAIPrompt, setInternalShowAIPrompt] = useState(false);
  const [internalShowAPIKeyDialog, setInternalShowAPIKeyDialog] = useState(false);
  
  const isAIPromptOpen = externalShowAIPrompt !== undefined ? externalShowAIPrompt : internalShowAIPrompt;
  const isAPIKeyDialogOpen = externalShowAPIKeyDialog !== undefined ? externalShowAPIKeyDialog : internalShowAPIKeyDialog;
  
  const closeAIPrompt = useCallback(() => {
    console.log('Closing AI prompt dialog');
    if (setShowAIPrompt) {
      setShowAIPrompt(false);
    } else {
      setInternalShowAIPrompt(false);
    }
  }, [setShowAIPrompt]);

  const closeAPIKeyDialog = useCallback(() => {
    console.log('Closing API key dialog');
    if (setShowAPIKeyDialog) {
      setShowAPIKeyDialog(false);
    } else {
      setInternalShowAPIKeyDialog(false);
    }
  }, [setShowAPIKeyDialog]);
  
  const handleAIPromptSubmit = useCallback(async (prompt: string, length: TextLengthOption, pdfText?: string) => {
    console.log('AI Dialog: Generate button clicked', { promptLength: prompt.length, length });
    try {
      console.log('AI Dialog: Calling onGenerate function');
      await onGenerate(prompt, length, pdfText);
      console.log('AI Dialog: onGenerate completed successfully');
      closeAIPrompt();
    } catch (error) {
      console.error('AI Dialog: Error in handleAIPromptSubmit:', error);
      alert(`Error generating AI text: ${error instanceof Error ? error.message : 'Unknown error'}`);
      closeAIPrompt();
    }
  }, [onGenerate, closeAIPrompt]);
  
  const handleAIPromptCancel = useCallback(() => {
    console.log('AI Dialog: Cancel button clicked');
    closeAIPrompt();
  }, [closeAIPrompt]);
  
  const handleAPIKeySubmit = useCallback((apiKey: string) => {
    console.log('API Key Dialog: Submit button clicked');
    onSetApiKey(apiKey);
    closeAPIKeyDialog();
    
    if (setShowAIPrompt) {
      setShowAIPrompt(true);
    } else {
      setInternalShowAIPrompt(true);
    }
  }, [onSetApiKey, closeAPIKeyDialog, setShowAIPrompt]);
  
  const handleAPIKeyCancel = useCallback(() => {
    console.log('API Key Dialog: Cancel button clicked');
    closeAPIKeyDialog();
  }, [closeAPIKeyDialog]);
  
  return (
    <>
      {/* AI Prompt Dialog */}
      <AIPromptDialog 
        isOpen={isAIPromptOpen}
        onSubmit={handleAIPromptSubmit}
        onCancel={handleAIPromptCancel}
      />
      
      {/* API Key Dialog */}
      <APIKeyDialog
        isOpen={isAPIKeyDialogOpen}
        onSubmit={handleAPIKeySubmit}
        onCancel={handleAPIKeyCancel}
      />
    </>
  );
};

// Export the component and its state setters to allow the parent to control it
export { AIGenerationProvider };

// Also export a hook for controlling the AI generation provider from outside
export const useAIGenerationControl = () => {
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [showAPIKeyDialog, setShowAPIKeyDialog] = useState(false);
  const [currentRange, setCurrentRange] = useState<any>(null);
  
  const checkAndShowPrompt = useCallback((range: any, hasApiKey: boolean) => {
    setCurrentRange(range);
    
    if (!hasApiKey) {
      setShowAPIKeyDialog(true);
    } else {
      setShowAIPrompt(true);
    }
  }, []);
  
  return {
    showAIPrompt,
    setShowAIPrompt,
    showAPIKeyDialog,
    setShowAPIKeyDialog,
    currentRange,
    setCurrentRange,
    checkAndShowPrompt
  };
}; 