import { useState, useCallback } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { usePDFExtractor } from '@/lib/hooks/use-pdf-extractor';

export const usePDFProcessor = (quill: any, generateText: (prompt: string, context: string) => Promise<string>) => {
  const { toast } = useToast();
  const [processingPdfSection, setProcessingPdfSection] = useState(false);
  const { extractFullText, extractChunkedText } = usePDFExtractor();

  // Handle PDF section summary
  const handlePdfSectionSummary = useCallback(async (content: string) => {
    setProcessingPdfSection(true);
    
    try {
      // Use AI to generate a heading and summary for the section
      const prompt = `Given the following text from a PDF section, please generate a concise heading (6-8 words maximum) 
      that captures the main topic, and a brief summary (2-3 sentences) that outlines the key points.
      Format your response as a JSON object with 'heading' and 'summary' properties:
      {
        "heading": "The heading for this section",
        "summary": "A brief 2-3 sentence summary of the key points."
      }
      
      Here is the text section:
      ${content}`;
      
      const generatedText = await generateText(prompt, '');
      
      if (generatedText) {
        try {
          // Parse the generated text as JSON
          let result;
          
          // First try to extract JSON from code blocks
          const jsonCodeBlockRegex = /```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/g;
          const jsonMatches = [...generatedText.matchAll(jsonCodeBlockRegex)];
          
          if (jsonMatches.length > 0) {
            // Use the first match
            const extractedJson = jsonMatches[0][1].trim();
            try {
              result = JSON.parse(extractedJson);
            } catch (jsonError) {
              console.error('Error parsing JSON from code block:', jsonError);
              throw new Error('Invalid JSON in code block');
            }
          } else {
            // Try to parse the whole response as JSON
            try {
              result = JSON.parse(generatedText);
            } catch (jsonError) {
              console.error('Error parsing JSON from response:', jsonError);
              throw new Error('Invalid JSON response');
            }
          }
          
          // Validate the response structure
          if (!result.heading || !result.summary) {
            throw new Error('Missing heading or summary in response');
          }
          
          return {
            heading: result.heading,
            summary: result.summary
          };
        } catch (error) {
          console.error('Error parsing AI response for PDF section:', error);
          
          // Create a fallback response
          const words = content.split(/\s+/);
          const headingWords = words.slice(0, Math.min(8, words.length));
          let heading = headingWords.join(' ');
          heading = heading.charAt(0).toUpperCase() + heading.slice(1);
          
          const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
          const summaryText = sentences.slice(0, Math.min(2, sentences.length)).join('. ');
          const summary = summaryText.trim() + (sentences.length > 2 ? '...' : '.');
          
          return { heading, summary };
        }
      }
      
      throw new Error('Failed to generate summary');
    } catch (error: any) {
      console.error('Error generating summary for PDF section:', error);
      
      // Show toast for rate limit errors
      if (error.message?.includes('Rate limit exceeded')) {
        toast({
          title: 'Rate limit exceeded',
          description: 'The AI service is busy. Please try again in a few moments.',
          variant: 'destructive',
        });
      }
      
      // Create a basic response even on error
      const words = content.split(/\s+/);
      const headingWords = words.slice(0, Math.min(8, words.length));
      let heading = headingWords.join(' ');
      heading = heading.charAt(0).toUpperCase() + heading.slice(1);
      
      const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      const summaryText = sentences.slice(0, Math.min(2, sentences.length)).join('. ');
      const summary = summaryText.trim() + (sentences.length > 2 ? '...' : '.');
      
      return { heading, summary };
    } finally {
      setProcessingPdfSection(false);
    }
  }, [generateText, toast]);

  // Handle PDF content formatting
  const formatPdfContent = useCallback(async (content: string, heading: string, formattingInstructions: string) => {
    try {
      const prompt = `Format the following text from a PDF section according to these instructions:
      ${formattingInstructions}
      
      Also, if you notice potential OCR errors from PDF extraction in the content below, such as misspelled words or incomplete sentences, please correct them to ensure readability and coherence.
      Keep core content as much as possible except for readability, if the extracted text is hard to understand such as diagram descriptions, feel free to rewrite it in a way that is easy to understand.


      Section heading: ${heading}
      
      Content to format:
      ${content}`;
      
      const formattedContent = await generateText(prompt, '');
      
      if (!formattedContent) {
        throw new Error('Failed to format content');
      }
      
      return formattedContent;
    } catch (error: any) {
      console.error('Error formatting PDF content:', error);
      throw error;
    }
  }, [generateText]);

  return {
    extractFullText,
    extractChunkedText,
    handlePdfSectionSummary,
    formatPdfContent,
    processingPdfSection
  };
}; 