import { useCallback, useEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { usePDFProcessor } from './use-pdf-processor';

// Centralized Markdown Formatting Instructions
export const MARKDOWN_FORMATTING_INSTRUCTIONS = `
Format your response using proper Markdown syntax following these guidelines:
1. Use proper paragraph breaks with a blank line between paragraphs
2. For bullet lists, use * with a space after it, and place each item on a new line
3. For numbered lists, use 1. 2. 3. with a space after the period
4. For nested lists, indent with 1 space (not tabs) before the * or number
5. For code blocks, use triple backticks (\`\`\`) on separate lines before and after the code
6. For inline code, surround with single backticks (\`)
7. For headings, use # with a space after it (## for heading 2, ### for heading 3)
8. For emphasis, use *italic* or **bold** without spaces between the asterisks and text
9. For blockquotes, use > with a space after it at the start of each line
10. For tables, follow this format:
| Column 1 | Column 2 |
| -------- | -------- |
| cell 1   | cell 2   |
`;

export const useEventHandlers = (
  quill: any,
  fileId: string | null,
  generateText: (prompt: string, context: string) => Promise<string>,
  apiKeyExists: boolean,
  setCurrentRange: (range: any) => void,
  setShowAPIKeyDialog: (show: boolean) => void,
  setShowAIPrompt: (show: boolean) => void,
  quillHandler: (delta: any, oldContents: any, source: string) => void
) => {
  const { toast } = useToast();
  const { extractFullText, handlePdfSectionSummary, formatPdfContent } = usePDFProcessor(quill, generateText);
  const Delta = quill ? quill.constructor.import('delta') : null; // Import Delta constructor

  // Handle AI generation for text
  const handleAIGenerate = useCallback(async (prompt: string, length: string, pdfText?: string) => {
    console.log('handleAIGenerate called with:', { promptLength: prompt.length, length, hasPdfText: !!pdfText });
    
    if (!quill) {
      console.error('handleAIGenerate error: Quill editor is not initialized');
      throw new Error('Editor not initialized');
    }
    
    // Try to get the current selection or set a default one
    let currentRange;
    const selection = quill.getSelection();
    
    if (!selection) {
      console.log('No active selection found, setting default selection at the beginning');
      // If no selection, set a default selection at the beginning
      try {
        quill.focus(); // Try to focus the editor first
        quill.setSelection(0, 0);
        // Wait a tiny bit for the selection to be applied
        await new Promise(resolve => setTimeout(resolve, 10));
        currentRange = quill.getSelection() || { index: 0, length: 0 };
      } catch (err) {
        console.log('Could not set selection, using default index 0', err);
        currentRange = { index: 0, length: 0 };
      }
    } else {
      currentRange = selection;
    }
    
    console.log('Using selection at index:', currentRange.index);
    
    try {
      // Get some context from before the insertion point
      const contextContent = pdfText || quill.getText(
        Math.max(0, currentRange.index - 500), 
        Math.min(500, currentRange.index)
      );
      console.log('Context content length:', contextContent.length);
      
      // Add length instruction to the prompt
      let lengthInstruction = '';
      switch(length) {
        case 'short':
          lengthInstruction = 'Keep your response brief, about 1-2 sentences.';
          break;
        case 'medium':
          lengthInstruction = 'Write approximately 1 paragraph.';
          break;
        case 'long':
          lengthInstruction = 'Write 2-3 paragraphs for a thorough response.';
          break;
        case 'verylong':
          lengthInstruction = 'Provide a detailed response with 4 or more paragraphs.';
          break;
        case 'custom':
        default:
          // No length restriction
          break;
      }
      
      // Add markdown formatting instructions
      // const markdownInstructions = `...`; // Original definition removed
      
      // Combine prompt with instructions
      const fullPrompt = `${prompt}\n\n${MARKDOWN_FORMATTING_INSTRUCTIONS}\n\n${lengthInstruction || ''}`;
      console.log('Calling generateText with prompt length:', fullPrompt.length);
      
      // Generate text with AI
      console.log('Starting AI text generation');
      const generatedText = await generateText(fullPrompt, contextContent);
      console.log('AI text generation completed, generated text length:', generatedText?.length || 0);
      
      if (generatedText) {
        // Insert the generated text at cursor position
        console.log('Inserting generated text at index:', currentRange.index);
        quill.insertText(currentRange.index, generatedText, 'user');
        
        // Update cursor position
        quill.setSelection(currentRange.index + generatedText.length, 0);
        
        toast({
          title: 'Text generated',
          description: 'AI-generated text has been added to your document.',
        });
      } else {
        console.error('Generated text was empty');
        throw new Error('No text was generated');
      }
    } catch (error: any) {
      console.error('Error generating text:', error);
      toast({
        title: 'Error generating text',
        description: error.message || 'Something went wrong while generating text.',
        variant: 'destructive',
      });
      throw error; // Re-throw so the caller can handle it too
    }
  }, [quill, generateText, toast]);

  // Handle flashcard generation from content
  const handleFlashcardAIGenerate = useCallback(async (content: string, cardCount: number, flashcardNode: any) => {
    // Check if API key exists - this will be handled by the caller
    
    try {
      // Show a loading message
      toast({
        title: 'Generating flashcards',
        description: 'AI is analyzing your content...',
      });
      
      // Generate flashcards using the AI
      const prompt = `Create ${cardCount} educational flashcards in the format of question-answer pairs from the following content. 
      Each card should have a clear, concise question on the front and a comprehensive answer on the back.
      Make the questions challenging but fair, focusing on the most important concepts.
      Format your response as a JSON array of objects with 'front' and 'back' properties:
      [
        { "front": "Question 1", "back": "Answer 1" },
        { "front": "Question 2", "back": "Answer 2" }
      ]
      Content: ${content}`;
      
      const generatedText = await generateText(prompt, '');
      
      if (generatedText) {
        try {
          // Parse the generated text as JSON
          let cardData;
          
          // Extract JSON if it's within a code block
          if (generatedText.includes('```json')) {
            const jsonMatch = generatedText.match(/```json([\s\S]*?)```/);
            cardData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
          } else if (generatedText.includes('```')) {
            const jsonMatch = generatedText.match(/```([\s\S]*?)```/);
            cardData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
          } else {
            // Try to parse the whole response as JSON
            cardData = JSON.parse(generatedText);
          }
          
          // Validate the data structure
          if (!Array.isArray(cardData) || cardData.length === 0) {
            throw new Error('Invalid data format');
          }
          
          // Update the flashcard with the generated content
          const cardFormat = flashcardNode._value || {};
          cardFormat.cards = cardData.map((card: any) => ({
            front: card.front || 'Question',
            back: card.back || 'Answer'
          }));
          cardFormat.currentIndex = 0;
          cardFormat.isFlipped = false;
          
          // Get the Quill blot instance and update it
          const blot = quill.constructor.find(flashcardNode);
          if (blot) {
            try {
              // Temporarily disable markdown module to prevent error during update
              const markdownModule = quill.getModule('markdown');
              const originalProcessorEnabled = markdownModule?.options?.enabled;
              
              // Disable markdown processor if it exists
              if (markdownModule && markdownModule.options) {
                markdownModule.options.enabled = false;
              }
              
              // Create an update event to be handled by the flashcard blot
              const updateEvent = new CustomEvent('flashcard-update', {
                detail: cardFormat,
                bubbles: false
              });
              
              // Dispatch the event to update the flashcard
              flashcardNode.dispatchEvent(updateEvent);
              
              // Re-enable markdown processor if it was enabled before
              if (markdownModule && markdownModule.options && originalProcessorEnabled !== undefined) {
                markdownModule.options.enabled = originalProcessorEnabled;
              }
              
              toast({
                title: 'Flashcards generated',
                description: `Successfully created ${cardData.length} flashcards from your content.`,
              });

              // Add a reminder to save manually
              toast({
                title: 'Remember to save',
                description: 'Click the Save button in the title bar to save your changes.',
                duration: 5000,
              });
            } catch (error) {
              console.error('Error updating flashcard:', error);
              toast({
                title: 'Error updating flashcards',
                description: 'Something went wrong while updating the flashcard content.',
                variant: 'destructive',
              });
            }
          }
        } catch (error) {
          console.error('Error parsing AI response:', error, generatedText);
          toast({
            title: 'Error generating flashcards',
            description: 'Failed to parse AI response. Please try again.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating flashcards:', error);
      toast({
        title: 'Error generating flashcards',
        description: error.message || 'Something went wrong while generating flashcards.',
        variant: 'destructive',
      });
    }
  }, [generateText, quill, toast]);

  // Handle flashcard generation from PDF
  const handlePDFToFlashcard = useCallback(async (file: File, flashcardNode: any, cardCount: number = 10) => {
    try {
      // Extract text from PDF
      const extractedText = await extractFullText(file);
      
      // Update toast
      toast({
        title: 'Generating flashcards',
        description: 'AI is analyzing your PDF content...',
      });
      
      // Save original Markdown module state
      let markdownModule: any = null;
      let originalEnabled = false;
      
      try {
        markdownModule = quill?.getModule('markdown');
        
        if (markdownModule) {
          // Save original state
          originalEnabled = markdownModule.options?.enabled || false;
          
          // Disable the module
          if (markdownModule.options) {
            markdownModule.options.enabled = false;
          }
        }
        
        // Generate and update flashcards
        await handleFlashcardAIGenerate(extractedText, cardCount, flashcardNode);
      } finally {
        // Restore Markdown processor state
        if (markdownModule && markdownModule.options && originalEnabled !== undefined) {
          markdownModule.options.enabled = originalEnabled;
        }
      }
    } catch (error: any) {
      console.error('Error processing PDF for flashcards:', error);
      toast({
        title: 'Error processing PDF',
        description: error.message || 'Something went wrong while processing your PDF.',
        variant: 'destructive',
      });
    }
  }, [extractFullText, handleFlashcardAIGenerate, quill, toast]);

  // Handle quiz generation from content
  const handleQuizAIGenerate = useCallback(async (content: string, questionCount: number, quizNode: any) => {
    try {
      // Show a loading message
      toast({
        title: 'Generating quiz questions',
        description: 'AI is analyzing your content...',
      });
      
      // Generate quiz questions using the AI
      const prompt = `Create ${questionCount} multiple-choice quiz questions from the following content. 
      Each question should have exactly 4 options with only one correct answer.
      Make the questions challenging but fair, focusing on the most important concepts.
      Format your response as a JSON array of objects:
      [
        {
          "question": "Question text here?",
          "options": [
            { "text": "Option 1 (correct answer)", "isCorrect": true },
            { "text": "Option 2", "isCorrect": false },
            { "text": "Option 3", "isCorrect": false },
            { "text": "Option 4", "isCorrect": false }
          ]
        }
      ]
      Content: ${content}`;
      
      const generatedText = await generateText(prompt, '');
      
      if (generatedText) {
        try {
          // Parse the generated text as JSON
          let questionData;
          
          // Extract JSON if it's within a code block
          if (generatedText.includes('```json')) {
            const jsonMatch = generatedText.match(/```json([\s\S]*?)```/);
            questionData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
          } else if (generatedText.includes('```')) {
            const jsonMatch = generatedText.match(/```([\s\S]*?)```/);
            questionData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : generatedText);
          } else {
            // Try to parse the whole response as JSON
            questionData = JSON.parse(generatedText);
          }
          
          // Validate and format the question data
          if (!Array.isArray(questionData) || questionData.length === 0) {
            throw new Error('Invalid data format');
          }
          
          // Process and validate quiz data
          const processedQuestions = processQuizData(questionData);
          
          // Update the quiz with the generated content
          const quizFormat = {
            questions: processedQuestions,
            currentIndex: 0
          };
          
          // Update the quiz node
          updateQuizNode(quill, quizNode, quizFormat);
          
          toast({
            title: 'Quiz generated',
            description: `Successfully created ${processedQuestions.length} quiz questions from your content.`,
          });

          // Add a reminder to save manually
          toast({
            title: 'Remember to save',
            description: 'Click the Save button in the title bar to save your changes.',
            duration: 5000,
          });
        } catch (error) {
          console.error('Error parsing AI response:', error, generatedText);
          toast({
            title: 'Error generating quiz',
            description: 'Failed to parse AI response. Please try again.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating quiz questions:', error);
      toast({
        title: 'Error generating quiz',
        description: error.message || 'Something went wrong while generating quiz questions.',
        variant: 'destructive',
      });
    }
  }, [generateText, quill, toast]);

  // Handle quiz generation from PDF
  const handlePDFToQuiz = useCallback(async (file: File, quizNode: any, questionCount: number = 5) => {
    try {
      // Extract text from PDF
      const extractedText = await extractFullText(file);
      
      // Update toast
      toast({
        title: 'Generating quiz',
        description: 'AI is analyzing your PDF content...',
      });
      
      // Save original Markdown module state
      let markdownModule: any = null;
      let originalEnabled = false;
      
      try {
        markdownModule = quill?.getModule('markdown');
        
        if (markdownModule) {
          // Save original state
          originalEnabled = markdownModule.options?.enabled || false;
          
          // Disable the module
          if (markdownModule.options) {
            markdownModule.options.enabled = false;
          }
        }
        
        // Generate quiz from the extracted PDF text
        await handleQuizAIGenerate(extractedText, questionCount, quizNode);
      } finally {
        // Restore Markdown processor state
        if (markdownModule && markdownModule.options && originalEnabled !== undefined) {
          markdownModule.options.enabled = originalEnabled;
        }
      }
    } catch (error: any) {
      console.error('Error processing PDF for quiz:', error);
      toast({
        title: 'Error processing PDF',
        description: error.message || 'Something went wrong while processing your PDF.',
        variant: 'destructive',
      });
    }
  }, [extractFullText, handleQuizAIGenerate, quill, toast]);

  // Helper function to process quiz data
  const processQuizData = (questionData: any[]) => {
    return questionData.map((q: any) => {
      // Make sure we have a question
      const question = q.question || 'Question';
      
      // Make sure we have options
      let options = Array.isArray(q.options) ? [...q.options] : [];
      
      // Make sure we have exactly 4 options
      if (options.length < 4) {
        // Add default options if needed
        while (options.length < 4) {
          options.push({
            text: `Option ${options.length + 1}`,
            isCorrect: false
          });
        }
      } else if (options.length > 4) {
        // Trim extra options
        options = options.slice(0, 4);
      }
      
      // Now check for correct answers
      const correctCount = options.filter((o: any) => o.isCorrect).length;
      
      // Ensure we have exactly one correct answer
      if (correctCount === 0) {
        // No correct answers, mark a random option as correct
        const randomIndex = Math.floor(Math.random() * options.length);
        options[randomIndex].isCorrect = true;
      } else if (correctCount > 1) {
        // Too many correct answers, keep only one random one
        const correctOptions = options.filter((o: any) => o.isCorrect);
        const randomCorrect = correctOptions[Math.floor(Math.random() * correctOptions.length)];
        options = options.map((o: any) => ({
          ...o,
          isCorrect: o === randomCorrect
        }));
      }
      
      // Randomize the order of options
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      return {
        question,
        options
      };
    });
  };

  // Helper function to update quiz node
  const updateQuizNode = (quill: any, quizNode: any, quizFormat: any) => {
    // Get the Quill blot instance and update it
    const blot = quill.constructor.find(quizNode);
    if (blot) {
      try {
        // Temporarily disable markdown module to prevent error during update
        const markdownModule = quill.getModule('markdown');
        const originalProcessorEnabled = markdownModule?.options?.enabled;
        
        // Disable markdown processor if it exists
        if (markdownModule && markdownModule.options) {
          markdownModule.options.enabled = false;
        }
        
        // Create an update event to be handled by the quiz blot
        const updateEvent = new CustomEvent('quiz-update', {
          detail: quizFormat,
          bubbles: false
        });
        
        // Dispatch the event to update the quiz
        quizNode.dispatchEvent(updateEvent);
        
        // Re-enable markdown processor if it was enabled before
        if (markdownModule && markdownModule.options && originalProcessorEnabled !== undefined) {
          markdownModule.options.enabled = originalProcessorEnabled;
        }
      } catch (error) {
        console.error('Error updating quiz:', error);
        throw error;
      }
    }
  };

  // Handle SINGLE PDF section insertion with formatting
  const handlePdfSingleInsertWithSummary = async (e: any) => {
    const { heading, summary, content, range, quill: eventQuill } = e.detail;

    if (eventQuill !== quill) return;
    if (!apiKeyExists) {
      setShowAPIKeyDialog(true);
      return;
    }

    toast({
      title: 'Formatting Section',
      description: 'Formatting section content with AI...',
    });

    try {
      // Define formatting instructions (similar to PdfProcessor)
      // const formattingInstructions = `...`; // Original definition removed

      // Call the AI to format the content (using formatPdfContent which calls generateText)
      // Use the centralized instructions here
      const formattedContent = await formatPdfContent(content, heading, MARKDOWN_FORMATTING_INSTRUCTIONS);

      if (formattedContent) {
        // Dispatch event for PdfProcessor to handle the actual insertion
        const insertEvent = new CustomEvent('pdf-insert-final-content', {
          detail: {
            content: formattedContent,
            range,
            quill
          },
          bubbles: true
        });
        document.dispatchEvent(insertEvent);

        toast({
          title: 'Section Formatted',
          description: 'Formatted section content is ready for insertion.',
        });
      } else {
        throw new Error('AI failed to format section content.');
      }

    } catch (error: any) {
      console.error('Error formatting/inserting single PDF section:', error);
      toast({
        title: 'Error Formatting Section',
        description: error.message || 'Failed to format content. Inserting raw content as fallback.',
        variant: 'destructive',
      });

      // Fallback: Dispatch event to insert raw content
      const fallbackInsertEvent = new CustomEvent('pdf-insert-final-content', {
        detail: {
          content: `## ${heading}\n\n*${summary}*\n\n${content}\n\n`, // Basic markdown fallback
          range,
          quill
        },
        bubbles: true
      });
      document.dispatchEvent(fallbackInsertEvent);
    }
  };

  // Set up event handlers when quill is ready
  useEffect(() => {
    if (!quill || !Delta) return; // Ensure Quill and Delta are available
    
    const handleAIGenerateEvent = (e: any) => {
      const { range } = e.detail;
      
      // Store the current range for later use
      setCurrentRange(range);
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
      } else {
        setShowAIPrompt(true);
      }
    };
    
    // Set up event handlers for component-specific events
    const handleDirectSaveRequest = (e: Event) => {
      console.log('Handling direct save request event', e.target);

      const targetNode = e.target as Node;
      if (quill && quill.root.contains(targetNode)) {
        const blot = quill.constructor.find(targetNode);
        
        if (blot && blot.statics?.blotName) { // Simplified check: just need the blot
          try {
            // --- Trigger updateContents with empty delta and 'user' source --- 
            console.log(`Event originated from this Quill instance (${blot.statics.blotName}). Triggering updateContents with source 'user'.`);
            quill.updateContents(new Delta(), 'user'); // Force update check as 'user'
            // --- End of Approach ---

          } catch (error) {
            console.error(`Error triggering updateContents for ${blot.statics.blotName} save request:`, error);
            // Fallback if updateContents fails - trigger quillHandler directly
            const delta = new Delta().retain(quill.getLength()); // Minimal delta
            const oldDelta = quill.getContents();
            quillHandler(delta, oldDelta, 'user');
          }
        } else {
          console.warn('Could not find blot for save request. Using fallback.');
          // Fallback if blot info is incomplete - trigger quillHandler directly
          const delta = new Delta().retain(quill.getLength()); // Minimal delta
          const oldDelta = quill.getContents();
          quillHandler(delta, oldDelta, 'user');
        }
      } else {
         console.warn('Save request event ignored. Origin not within this Quill instance.', { target: targetNode, quillRoot: quill?.root });
      }
    };
    
    // Handle flashcard AI generation
    const handleFlashcardAIGenerateEvent = (e: any) => {
      const { content, cardCount, flashcardNode } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      handleFlashcardAIGenerate(content, cardCount, flashcardNode);
    };
    
    // Handle PDF upload for flashcards
    const handleFlashcardPDFUploadEvent = (e: any) => {
      const { file, flashcardNode, cardCount = 10 } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      handlePDFToFlashcard(file, flashcardNode, cardCount);
    };
    
    // Handle quiz AI generation
    const handleQuizAIGenerateEvent = (e: any) => {
      const { content, questionCount, quizNode } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      handleQuizAIGenerate(content, questionCount, quizNode);
    };
    
    // Handle PDF upload for quiz
    const handleQuizPDFUploadEvent = (e: any) => {
      const { file, quizNode, questionCount = 5 } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      handlePDFToQuiz(file, quizNode, questionCount);
    };
    
    // Handle PDF section summary
    const handlePdfSectionSummaryEvent = async (e: any) => {
      const { content } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      console.log('Processing PDF section for summarization');
      try {
        const result = await handlePdfSectionSummary(content);
        
        // Create an event with the results
        const responseEvent = new CustomEvent('ai-section-summary-response', {
          detail: {
            heading: result.heading,
            summary: result.summary
          },
          bubbles: true
        });
        
        // Dispatch the event
        document.dispatchEvent(responseEvent);
      } catch (error) {
        console.error('Error handling PDF section summary:', error);
      }
    };
    
    // Handle PDF content formatting
    const handlePdfContentFormattingEvent = async (e: any) => {
      const { content, heading, formattingInstructions } = e.detail;
      
      // Check if API key exists
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }
      
      console.log('Formatting PDF content for better readability');
      try {
        const formattedContent = await formatPdfContent(content, heading, formattingInstructions);
        
        // Create an event with the results
        const responseEvent = new CustomEvent('ai-formatted-pdf-content-response', {
          detail: {
            formattedContent
          },
          bubbles: true
        });
        
        // Dispatch the event
        document.dispatchEvent(responseEvent);
      } catch (error) {
        console.error('Error handling PDF content formatting:', error);
      }
    };

    // Handle combined PDF section insertion and formatting
    const handlePdfCombinedInsertEvent = async (e: any) => {
      const { sections, range, quill: eventQuill } = e.detail;

      if (eventQuill !== quill) return;
      if (!apiKeyExists) {
        setShowAPIKeyDialog(true);
        return;
      }

      toast({
        title: 'Processing Selected Sections',
        description: `Formatting ${sections.length} sections with AI...`,
      });

      try {
        // Format each section individually using Promise.allSettled
        const formatPromises = sections.map((section: any) => {
          // Use the centralized instructions here
          const formattingPrompt = `Please format the following text content using Markdown.
${MARKDOWN_FORMATTING_INSTRUCTIONS}

Original Heading: ${section.heading}
Original Summary: ${section.summary}

Content to format:
${section.content}`;
          
          // Return the promise from generateText
          return generateText(formattingPrompt, '')
            .then(formatted => ({ status: 'fulfilled', value: formatted, original: section }))
            .catch(error => ({ status: 'rejected', reason: error, original: section }));
        });

        const results = await Promise.allSettled(formatPromises);

        let finalCombinedContent = '';
        let rawFallbackContent = ''; // For fallback if all formatting fails
        let successfulFormats = 0;

        results.forEach((result, index) => {
          // Build raw fallback content regardless of success
          rawFallbackContent += `## ${sections[index].heading}\n\n*${sections[index].summary}*\n\n${sections[index].content}\n\n`;
          if (index < sections.length - 1) {
            rawFallbackContent += '\n\n---\n\n';
          }

          // Process formatted content
          if (result.status === 'fulfilled' && result.value.status === 'fulfilled' && result.value.value) {
            finalCombinedContent += result.value.value + '\n\n';
            successfulFormats++;
          } else {
            // If formatting failed for a section, append its raw content to the final output
            console.warn(`Formatting failed for section ${index + 1}. Appending raw content.`, result.status === 'fulfilled' ? result.value.reason : result.reason);
            finalCombinedContent += `## ${sections[index].heading}\n\n*${sections[index].summary}*\n\n${sections[index].content}\n\n`;
          }
          
          // Add separator
          if (index < results.length - 1) {
            finalCombinedContent += '---\n\n';
          }
        });

        if (successfulFormats === 0) {
           // If ALL formatting failed, insert the completely raw combined content
           console.error('All section formatting failed. Inserting raw combined content.');
           quill.insertText(range.index, rawFallbackContent, 'user');
           quill.setSelection(range.index + rawFallbackContent.length, 0);
           toast({
             title: 'Formatting Failed',
             description: 'Could not format sections with AI. Raw content inserted.',
             variant: 'destructive',
           });
        } else {
            // Insert the combined content (mix of formatted and raw)
            quill.insertText(range.index, finalCombinedContent.trim(), 'user');
            quill.setSelection(range.index + finalCombinedContent.trim().length, 0);

            toast({
                title: 'Sections Inserted',
                description: successfulFormats === sections.length
                ? 'Formatted content from selected sections added.'
                : `Formatted ${successfulFormats}/${sections.length} sections. Raw content used for others.`,
                variant: 'default',
            });
        }

      } catch (error: any) { // Catch errors from Promise.allSettled itself (unlikely)
        console.error('Unexpected error during combined section processing:', error);
        toast({
          title: 'Error Inserting Sections',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
        // Attempt to insert raw content as a last resort
        let rawContent = sections.map((s:any) => `## ${s.heading}\n\n*${s.summary}*\n\n${s.content}`).join('\n\n---\n\n');
        quill.insertText(range.index, rawContent, 'user');
        quill.setSelection(range.index + rawContent.length, 0);
      }
    };
    
    // Register all event listeners
    quill.root.addEventListener('ai-generate', handleAIGenerateEvent);
    document.addEventListener('flashcard-save-needed', handleDirectSaveRequest);
    document.addEventListener('quiz-save-needed', handleDirectSaveRequest);
    document.addEventListener('flashcard-ai-generate', handleFlashcardAIGenerateEvent);
    document.addEventListener('flashcard-pdf-upload', handleFlashcardPDFUploadEvent);
    document.addEventListener('quiz-ai-generate', handleQuizAIGenerateEvent);
    document.addEventListener('quiz-pdf-upload', handleQuizPDFUploadEvent);
    document.addEventListener('ai-generate-section-summary', handlePdfSectionSummaryEvent);
    document.addEventListener('ai-format-pdf-content', handlePdfContentFormattingEvent);
    document.addEventListener('pdf-insert-formatted-combined', handlePdfCombinedInsertEvent);
    document.addEventListener('pdf-insert-with-summary', handlePdfSingleInsertWithSummary);
    
    // Cleanup function
    return () => {
      quill.root.removeEventListener('ai-generate', handleAIGenerateEvent);
      document.removeEventListener('flashcard-save-needed', handleDirectSaveRequest);
      document.removeEventListener('quiz-save-needed', handleDirectSaveRequest);
      document.removeEventListener('flashcard-ai-generate', handleFlashcardAIGenerateEvent);
      document.removeEventListener('flashcard-pdf-upload', handleFlashcardPDFUploadEvent);
      document.removeEventListener('quiz-ai-generate', handleQuizAIGenerateEvent);
      document.removeEventListener('quiz-pdf-upload', handleQuizPDFUploadEvent);
      document.removeEventListener('ai-generate-section-summary', handlePdfSectionSummaryEvent);
      document.removeEventListener('ai-format-pdf-content', handlePdfContentFormattingEvent);
      document.removeEventListener('pdf-insert-formatted-combined', handlePdfCombinedInsertEvent);
      document.removeEventListener('pdf-insert-with-summary', handlePdfSingleInsertWithSummary);
    };
  }, [
    quill, 
    apiKeyExists, 
    generateText,
    toast,
    fileId,
    quillHandler,
    handleFlashcardAIGenerate,
    handlePDFToFlashcard,
    handleQuizAIGenerate,
    handlePDFToQuiz,
    handlePdfSectionSummary,
    formatPdfContent,
    setCurrentRange,
    setShowAPIKeyDialog,
    setShowAIPrompt,
    Delta // Add Delta to dependencies
  ]);

  return {
    handleAIGenerate
  };
};