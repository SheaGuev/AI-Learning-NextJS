import { useState } from 'react';
import { useGemini } from '@/lib/hooks/useGemini';
import { useToast } from '@/hooks/use-toast';

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
      toast({
        title: 'Error generating text',
        description: error.message || 'Failed to generate text. Please try again.',
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