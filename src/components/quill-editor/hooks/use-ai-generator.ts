import { useState } from 'react';
import { useGemini } from '@/lib/hooks/useGemini';
import { useToast } from '@/lib/hooks/use-toast';

interface UseAIGeneratorReturn {
  generateText: (prompt: string, contextContent?: string) => Promise<string>;
  isGenerating: boolean;
  setApiKey: (key: string) => void;
  apiKeyExists: boolean;
}

export const useAIGenerator = (): UseAIGeneratorReturn => {
  const { generateResponse, isLoading, setApiKey, error } = useGemini();
  const { toast } = useToast();
  const [apiKeyExists, setApiKeyExists] = useState<boolean>(
    !!localStorage.getItem('gemini_api_key')
  );
  
  const generateText = async (prompt: string, contextContent?: string): Promise<string> => {
    try {
      // If we have context content, include it in the prompt
      const fullPrompt = contextContent 
        ? `Based on the following text:\n\n${contextContent}\n\n${prompt}`
        : prompt;
        
      const response = await generateResponse(fullPrompt);
      return response;
    } catch (error: any) {
      console.error('Error generating AI text:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = error.message || 'Failed to generate text. Please try again.';
      let errorTitle = 'Error generating text';
      
      if (errorMessage.includes('Rate limit exceeded')) {
        errorTitle = 'Rate limit exceeded';
        errorMessage = 'The AI service is busy. Please try again in a few moments.';
      } else if (errorMessage.includes('API key')) {
        errorTitle = 'API Key Error';
        errorMessage = 'Your API key is invalid or expired. Please update your API key.';
      } else if (errorMessage.includes('timed out')) {
        errorTitle = 'Request timed out';
        errorMessage = 'The request to the AI service timed out. Please try again or check your internet connection.';
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
      
      return '';
    }
  };
  
  const handleSetApiKey = (key: string) => {
    setApiKey(key);
    setApiKeyExists(!!key);
    
    if (key) {
      toast({
        title: 'API Key Saved',
        description: 'Your Gemini API key has been saved.',
      });
    }
  };
  
  return {
    generateText,
    isGenerating: isLoading,
    setApiKey: handleSetApiKey,
    apiKeyExists,
  };
}; 