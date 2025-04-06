import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const usePDFProcessor = (quill: any, generateText: (prompt: string, context: string) => Promise<string>) => {
  const { toast } = useToast();
  const [processingPdfSection, setProcessingPdfSection] = useState(false);

  // Extract text from a PDF file
  const extractTextFromPDF = useCallback(async (file: File): Promise<string> => {
    toast({
      title: 'Processing PDF',
      description: 'Extracting text from your PDF...',
    });

    // Dynamically load the PDF.js library if not already loaded
    if (!window.pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load PDF.js'));
        document.head.appendChild(script);
      });
    }
    
    // Read the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);
    
    // Load the PDF document
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library failed to load properly');
    }
    const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    // Extract text from all pages
    let extractedText = '';
    const totalPages = pdf.numPages;
    
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str).join(' ');
      extractedText += textItems + '\n\n';
    }
    
    // Trim the extracted text to avoid exceeding token limits
    const maxLength = 15000; // Adjust based on your API's limits
    if (extractedText.length > maxLength) {
      extractedText = extractedText.substring(0, maxLength) + '...';
      toast({
        title: 'PDF content truncated',
        description: 'The PDF was too large and has been truncated for processing.',
      });
    }

    return extractedText;
  }, [toast]);

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
      ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}`;
      
      const generatedText = await generateText(prompt, '');
      
      if (generatedText) {
        try {
          // Parse the generated text as JSON
          let result;
          
          // Extract JSON if it's within a code block
          if (generatedText.includes('```json')) {
            const jsonMatch = generatedText.match(/```json([\s\S]*?)```/);
            result = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
          } else if (generatedText.includes('```')) {
            const jsonMatch = generatedText.match(/```([\s\S]*?)```/);
            result = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
          } else {
            // Try to parse the whole response as JSON
            result = JSON.parse(generatedText);
          }
          
          // Validate the result has heading and summary
          if (!result.heading || !result.summary) {
            throw new Error('Invalid response format');
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
  }, [generateText]);

  // Format PDF content
  const formatPdfContent = useCallback(async (content: string, heading: string, formattingInstructions?: string) => {
    setProcessingPdfSection(true);
    
    try {
      // Use AI to generate better formatted content
      const prompt = `You are an expert in document formatting and readability. 
      Please reformat and restructure the following content extracted from a PDF to make it more readable.
      The content is about: "${heading}"
      
      Transform the raw text into well-structured content with:
      1. Proper paragraph breaks
      2. Appropriate bullet points or numbered lists where applicable
      3. Clear subheadings for different topics (using markdown ### for subheadings)
      4. Highlight important terms or definitions with emphasis (using *term* or **term**)
      5. Fix any OCR or formatting issues you notice
      6. Remove any irrelevant page numbers, headers, or footers
      
      Format your response using proper Markdown syntax. DO NOT summarize or change the meaning - 
      maintain all the original information, just improve the formatting and structure.
      
      ${formattingInstructions || ''}
      
      Here is the content to reformat:
      ${content}`;
      
      const formattedText = await generateText(prompt, '');
      
      if (formattedText) {
        return formattedText;
      }
      
      throw new Error('Failed to format content');
    } catch (error) {
      console.error('Error formatting PDF content:', error);
      return content; // Return original content as fallback
    } finally {
      setProcessingPdfSection(false);
    }
  }, [generateText]);

  return {
    processingPdfSection,
    extractTextFromPDF,
    handlePdfSectionSummary,
    formatPdfContent
  };
}; 