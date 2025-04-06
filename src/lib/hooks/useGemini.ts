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
      console.error('Gemini API: API key is missing');
      throw new Error('API key is required. Please set your Gemini API key.');
    }

    setIsLoading(true);
    setError(null);
    console.log('Gemini API: Starting request', { promptLength: prompt.length, filesCount: files.length });

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

      // Log request details
      console.log('Gemini API: Sending request to API', { 
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        promptLength: contextPrompt.length,
        maxTokens: config.maxTokens || 2048,
        temperature: config.temperature || 0.7
      });

      // Setup abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('Gemini API: Request timed out after 30 seconds');
      }, 30000); // 30 second timeout

      // Call Gemini API
      let response;
      try {
        response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
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
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      console.log('Gemini API: Received response', { 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API: Response error', errorData);
        
        // Provide more specific error messages based on status code
        if (response.status === 400) {
          throw new Error('Invalid request to Gemini API: ' + (errorData.error?.message || 'Check your prompt format'));
        } else if (response.status === 401) {
          throw new Error('API key is invalid or expired. Please update your Gemini API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(errorData.error?.message || `API error (${response.status}): Failed to generate response`);
        }
      }

      const data = await response.json();
      console.log('Gemini API: Parsed response data', { 
        hasCandidates: !!data.candidates?.length,
        firstCandidateHasParts: !!data.candidates?.[0]?.content?.parts?.length
      });
      
      if (!data.candidates || !data.candidates.length || !data.candidates[0]?.content?.parts) {
        console.error('Gemini API: Invalid response format', data);
        throw new Error('Invalid response format from API');
      }
      
      const generatedText = data.candidates[0]?.content?.parts[0]?.text || '';
      
      if (!generatedText) {
        console.warn('Gemini API: Empty response received');
        throw new Error('No text was generated in the response');
      }
      
      console.log('Gemini API: Successfully generated text', { 
        textLength: generatedText.length 
      });
      
      return generatedText;
    } catch (err: any) {
      console.error('Gemini API: Error in generateResponse:', err);
      
      // Provide a more user-friendly error message for timeout
      if (err.name === 'AbortError') {
        const timeoutError = new Error('The request to the AI service timed out. Please try again or check your internet connection.');
        setError(timeoutError);
        throw timeoutError;
      }
      
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