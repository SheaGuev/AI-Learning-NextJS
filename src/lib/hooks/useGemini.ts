import { useState, useEffect } from 'react';

interface GeminiConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface UseGeminiProps {
  config?: GeminiConfig;
}

interface FileContext {
  title: string;
  content: string;
}

interface UseGeminiReturn {
  generateResponse: (prompt: string, files?: FileContext[]) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
  setApiKey: (key: string) => void;
}

export const useGemini = ({ config = {} }: UseGeminiProps = {}): UseGeminiReturn => {
  const [apiKey, setApiKey] = useState<string>(config.apiKey || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Try to load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey && !apiKey) {
      setApiKey(savedApiKey);
    }
  }, [apiKey]);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [apiKey]);

  const generateResponse = async (prompt: string, files: FileContext[] = []): Promise<string> => {
    if (!apiKey) {
      throw new Error('API key is required. Please set your Gemini API key.');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Format file content for context
      let contextPrompt = prompt;
      
      if (files.length > 0) {
        // Create context with file content
        const fileContexts = files.map(file => 
          `FILE: ${file.title}\n\`\`\`\n${file.content}\n\`\`\`\n`
        ).join('\n');
        
        contextPrompt = `I have the following files as context:\n\n${fileContexts}\n\nBased on these files, ${prompt}`;
      }

      // Call Gemini API
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextPrompt }] }],
          generationConfig: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxTokens || 2048,
            topP: 0.95,
            topK: 40,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate response');
      }

      const data = await response.json();
      const generatedText = data.candidates[0]?.content?.parts[0]?.text || 'No response generated';
      
      return generatedText;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateResponse,
    isLoading,
    error,
    setApiKey,
  };
}; 