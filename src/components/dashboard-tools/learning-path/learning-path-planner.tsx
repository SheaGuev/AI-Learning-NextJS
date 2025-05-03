'use client';

import React, { useState, useEffect } from 'react';
import { RiCalendarLine, RiRoadMapLine, RiSendPlane2Line, RiAddLine, RiFileAddLine, RiUploadCloud2Line, RiEdit2Line } from 'react-icons/ri';
import { useGemini } from '@/lib/hooks/useGemini';
import { useAppState } from '@/lib/providers/state-provider';
import { createFile, getFolders, createFolder } from '@/supabase/queries';
import { v4 } from 'uuid';
import { useToast } from '@/lib/hooks/use-toast';
import { extractContentFromFileData, parseUploadedPlan } from './learning-path-helpers';
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy, version } from 'pdfjs-dist';
import { usePDFExtractor } from '@/lib/hooks/use-pdf-extractor';

// Configure PDF.js worker - use a relative path for reliability
// This loads the worker from the public directory
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface LearningModule {
  title: string;
  description: string;
  topics: LearningTopic[];
  estimatedTime: string;
}

interface LearningTopic {
  title: string;
  subtopics: string[];
  resources?: string[];
  activities?: string[];
}

interface StudySession {
  day: string;
  topics: string[];
  duration: string;
}

interface LearningPlan {
  title: string;
  description: string;
  modules: LearningModule[];
  schedule?: StudySession[];
}

export const LearningPathPlanner: React.FC = () => {
  const { state, workspaceId, dispatch } = useAppState();
  const { toast } = useToast();
  const [goal, setGoal] = useState('');
  const [timeframe, setTimeframe] = useState('2 weeks');
  const [customTimeframe, setCustomTimeframe] = useState('');
  const [showCustomTimeframe, setShowCustomTimeframe] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(30); // Default slider position (0-100)
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const { generateResponse, isLoading: isGenerating, error: apiError, setApiKey } = useGemini();
  const [apiKey, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isSavingToWorkspace, setIsSavingToWorkspace] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [pdfProcessingState, setPdfProcessingState] = useState<'idle' | 'extracting' | 'generating'>('idle');
  const [showTextPasteModal, setShowTextPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const { extractFullText } = usePDFExtractor();

  // Define preset timeframes for the slider with their positions and labels
  const sliderPresets = [
    { position: 0, days: 1, label: '1 day' },
    { position: 20, days: 7, label: '1 week' },
    { position: 40, days: 30, label: '1 month' },
    { position: 60, days: 90, label: '3 months' },
    { position: 80, days: 180, label: '6 months' },
    { position: 100, days: 365, label: '1 year' }
  ];

  // Convert slider position (0-100) to days
  const getDaysFromSliderPosition = (position: number): number => {
    // Find the two closest presets
    for (let i = 0; i < sliderPresets.length - 1; i++) {
      const lower = sliderPresets[i];
      const upper = sliderPresets[i + 1];
      
      if (position >= lower.position && position <= upper.position) {
        // Calculate days based on linear interpolation between preset points
        const positionRatio = (position - lower.position) / (upper.position - lower.position);
        return Math.round(lower.days + positionRatio * (upper.days - lower.days));
      }
    }
    
    // Default for any edge cases
    return sliderPresets[sliderPresets.length - 1].days;
  };

  // Convert days to human-readable timeframe
  const getTimeframeFromDays = (days: number): string => {
    if (days === 1) {
      return '1 day';
    } else if (days < 7) {
      return `${days} days`;
    } else if (days === 7) {
      return '1 week';
    } else if (days < 30) {
      const weeks = Math.round(days / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'}`;
    } else if (days === 30) {
      return '1 month';
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} month${months === 1 ? '' : 's'}`;
    } else {
      return '1 year';
    }
  };

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const position = parseInt(e.target.value);
    setSliderPosition(position);
    const days = getDaysFromSliderPosition(position);
    setTimeframe(getTimeframeFromDays(days));
    setShowCustomTimeframe(false);
  };

  // Handle toggle for custom timeframe
  const toggleCustomTimeframe = () => {
    setShowCustomTimeframe(!showCustomTimeframe);
    if (showCustomTimeframe) {
      // If turning off custom, reset to slider value
      const days = getDaysFromSliderPosition(sliderPosition);
      setTimeframe(getTimeframeFromDays(days));
    }
  };

  const handleCustomTimeframeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTimeframe(e.target.value);
    setTimeframe(e.target.value);
  };

  // Get the current days value from the slider position
  const getCurrentDays = (): number => {
    return getDaysFromSliderPosition(sliderPosition);
  };

  useEffect(() => {
    // Try to load API key from localStorage on mount
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
      setApiKeyInput(savedApiKey);
    } else {
      setShowApiKeyInput(true);
    }

    // Load folders for the workspace
    if (workspaceId) {
      const loadFolders = async () => {
        const { data, error } = await getFolders(workspaceId);
        if (data && !error) {
          setFolders(data);
        }
      };
      loadFolders();
    }
  }, [workspaceId]);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim());
      setShowApiKeyInput(false);
    }
  };

  // Enhanced JSON repair function
  const attemptAdvancedJsonRepair = (json: string): string => {
    let result = json;
    
    // Fix missing quotes around property names
    result = result.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    
    // Fix missing commas between array elements or object properties
    result = result.replace(/}\s*{/g, '},{');
    result = result.replace(/]\s*{/g, ',{');
    result = result.replace(/}\s*\[/g, '},[');
    result = result.replace(/]\s*\[/g, '],[');
    
    // Fix escaped quotes that shouldn't be escaped
    result = result.replace(/\\"/g, '"');
    
    // Fix missing quotes around string values
    result = result.replace(/:(\s*)([^",\{\[\]\}\d][^",\{\[\]\}\s]*)/g, ':"$2"');
    
    // Replace single quotes with double quotes
    result = result.replace(/'/g, '"');
    
    // Fix unmatched brackets
    const openBraces = (result.match(/{/g) || []).length;
    const closeBraces = (result.match(/}/g) || []).length;
    const openBrackets = (result.match(/\[/g) || []).length;
    const closeBrackets = (result.match(/\]/g) || []).length;
    
    // Add missing closing braces/brackets
    if (openBraces > closeBraces) {
      result += '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      result += ']'.repeat(openBrackets - closeBrackets);
    }
    
    return result;
  };

  const handleGenerateLearningPath = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goal.trim()) return;
    
    // Validate custom timeframe
    if (showCustomTimeframe && !customTimeframe.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a custom timeframe',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    setLearningPlan(null);
    setRawResponse(null);
    setShowRawResponse(false);

    try {
      // Get current timeframe and determine appropriate schedule units
      const currentTimeframe = showCustomTimeframe ? customTimeframe : timeframe;
      let schedulePeriodType = "days";
      
      // Get the numeric value from timeframe
      const timeNumber = extractNumber(currentTimeframe);
      
      // Determine appropriate time units based on overall timeframe
      if (currentTimeframe.includes('month') || 
          (currentTimeframe.includes('week') && timeNumber > 6) ||
          (timeNumber > 45 && !currentTimeframe.includes('hour'))) {
        schedulePeriodType = "weeks";
      } else if (currentTimeframe.includes('day') || 
                (currentTimeframe.includes('week') && timeNumber <= 6)) {
        schedulePeriodType = "days";
      } else if ((currentTimeframe.includes('month') && timeNumber > 3) || 
                currentTimeframe.includes('year')) {
        schedulePeriodType = "months";
      }

      // Create a simplified prompt for the AI
      const prompt = `Create a comprehensive learning path for "${goal}" over ${currentTimeframe}.
${includeSchedule ? `Include a study schedule using ${schedulePeriodType} (${schedulePeriodType === 'days' ? 'Day 1, Day 2' : schedulePeriodType === 'weeks' ? 'Week 1, Week 2' : 'Month 1, Month 2'})` : ''}

Return ONLY this JSON structure with no additional text:
{
  "title": "Short, Concise Learning Path Title (5-7 words)",
  "description": "Clear description",
  "modules": [
    {
      "title": "Concise Module Title (3-5 words)",
      "description": "Module description",
      "estimatedTime": "Time estimate",
      "topics": [
        {
          "title": "Brief Topic Title (2-4 words)",
          "subtopics": ["Subtopic 1", "Subtopic 2"],
          "resources": ["Resource 1", "Resource 2"],
          "activities": ["Activity 1", "Activity 2"]
        }
      ]
    }
  ]${includeSchedule ? `,
  "schedule": [
    {
      "day": "${schedulePeriodType === 'days' ? 'Day' : schedulePeriodType === 'weeks' ? 'Week' : 'Month'} 1",
      "topics": ["Topic from module 1"],
      "duration": "2 hours"
    }
  ]` : ''}
}

7 Rules:
1. Create ${timeNumber <= 7 ? '4-5' : timeNumber <= 30 ? '5-8' : '6-10'} modules with progressive complexity
2. Keep ALL titles short and concise - avoid long phrases and sentences
3. Balance content evenly across modules rather than front-loading information
4. Use double quotes for ALL names and values
5. NO trailing commas
6. Valid JSON only
7. NO text before or after the JSON`;

      const response = await generateResponse(prompt);
      
      // Save raw response for debugging
      setRawResponse(response);
      
      try {
        // Parse the JSON response
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/) || [null, response];
        const jsonString = jsonMatch[1] || response;
        
        // Remove any text before the first { and after the last }
        let cleanedJson = jsonString.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        
        // Additional preprocessing: ensure all property names have quotes
        cleanedJson = cleanedJson.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        
        try {
          // First attempt: Direct parsing
          const parsedPlan = JSON.parse(cleanedJson);
          setLearningPlan(parsedPlan);
        } catch (parseError) {
          console.error('Initial JSON parsing error:', parseError);
          
          // Second attempt: Fix common JSON issues
          try {
            // Try to fix trailing commas in arrays and objects
            const fixedJson = cleanedJson
              .replace(/,\s*}/g, '}')     // Fix trailing commas in objects
              .replace(/,\s*\]/g, ']')    // Fix trailing commas in arrays
              .replace(/\}\s*\{/g, '},{') // Fix missing commas between objects
              .replace(/\]\s*\[/g, '],[') // Fix missing commas between arrays
              .replace(/}\s*]/g, '}]')    // Fix missing commas between object and array end
              .replace(/"\s*"/g, '","');  // Fix missing commas between strings
            
            try {
              const parsedPlan = JSON.parse(fixedJson);
              console.log('Successfully parsed JSON after fixing format issues');
              setLearningPlan(parsedPlan);
            } catch (secondError) {
              console.error('Second JSON parsing attempt failed:', secondError);
              
              // Third attempt: Try more aggressive JSON repair
              const aggressivelyFixedJson = attemptAdvancedJsonRepair(fixedJson);
              
              try {
                const parsedPlan = JSON.parse(aggressivelyFixedJson);
                console.log('Successfully parsed JSON after aggressive repairs');
                setLearningPlan(parsedPlan);
              } catch (thirdError) {
                console.error('Failed to fix and parse JSON after aggressive repairs:', thirdError);
                
                // New approach: Use AI to repair the JSON
                await repairJsonWithAI(fixedJson);
              }
            }
          } catch (secondError) {
            console.error('Failed to fix and parse JSON:', secondError);
            await repairJsonWithAI(cleanedJson);
          }
        }
      } catch (error) {
        console.error('Error processing AI response:', error);
        setShowRawResponse(true);
        toast({
          title: 'JSON Error',
          description: 'There was an error processing the response. Attempting to repair...',
          variant: 'destructive',
        });
        
        // Try to repair with AI as a fallback
        await repairJsonWithAI(response);
      }
    } catch (error: any) {
      console.error('Error generating learning path:', error);
      
      // If error is due to missing API key, prompt user to enter key
      if (error.message.includes('API key is required') || error.message.includes('API key')) {
        setShowApiKeyInput(true);
      } else {
        toast({
          title: 'Error',
          description: `${error.message || "Something went wrong. Please try again."}`,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to safely extract number from a string
  const extractNumber = (text: string): number => {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // *** Function to generate plan from extracted text (e.g., from file or PDF) ***
  const generatePlanFromText = async (extractedText: string) => {
    setPdfProcessingState('generating');
    setIsLoading(true);
    setLearningPlan(null);
    setRawResponse(null);
    setShowRawResponse(false);

    try {
      // Get current timeframe and determine appropriate schedule units
      const currentTimeframe = showCustomTimeframe ? customTimeframe : timeframe;
      let schedulePeriodType = "days";
      
      // Get the numeric value from timeframe
      const timeNumber = extractNumber(currentTimeframe);
      
      // Determine appropriate time units based on overall timeframe
      if (currentTimeframe.includes('month') || 
          (currentTimeframe.includes('week') && timeNumber > 6) ||
          (timeNumber > 45 && !currentTimeframe.includes('hour'))) {
        schedulePeriodType = "weeks";
      } else if (currentTimeframe.includes('day') || 
                (currentTimeframe.includes('week') && timeNumber <= 6)) {
        schedulePeriodType = "days";
      } else if ((currentTimeframe.includes('month') && timeNumber > 3) || 
                currentTimeframe.includes('year')) {
        schedulePeriodType = "months";
      }

      // Simpler, more direct prompt
      const prompt = `Create a learning path in JSON format for this content:

\`\`\`
${extractedText}
\`\`\`

Return ONLY this JSON structure with no additional text:
{
  "title": "Short, Concise Title (5-7 words)",
  "description": "Clear description",
  "modules": [
    {
      "title": "Brief Module Title (3-5 words)",
      "description": "Module description",
      "estimatedTime": "Time estimate",
      "topics": [
        {
          "title": "Short Topic Title (2-4 words)",
          "subtopics": ["Subtopic 1", "Subtopic 2"],
          "resources": ["Resource 1", "Resource 2"],
          "activities": ["Activity 1", "Activity 2"]
        }
      ]
    }
  ]${includeSchedule ? `,
  "schedule": [
    {
      "day": "${schedulePeriodType === 'days' ? 'Day' : schedulePeriodType === 'weeks' ? 'Week' : 'Month'} 1",
      "topics": ["Topic from module 1"],
      "duration": "2 hours"
    }
  ]` : ''}
}

Instructions:
1. Create ${timeNumber <= 7 ? '4-5' : timeNumber <= 30 ? '5-8' : '6-10'} modules with progressive complexity
2. Keep all titles concise (modules: 3-5 words, topics: 2-4 words)
3. For the schedule, use ${schedulePeriodType} (${schedulePeriodType === 'days' ? 'Day 1, Day 2' : schedulePeriodType === 'weeks' ? 'Week 1, Week 2' : 'Month 1, Month 2'})
4. Create a plan for ${currentTimeframe}
5. All modules need topics with subtopics
6. Return ONLY valid JSON, no text before or after`;

      const response = await generateResponse(prompt);
      setRawResponse(response);

      try {
        // Extract JSON from response, removing any markdown formatting or extra text
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/) || [null, response];
        let jsonString = jsonMatch[1] || response;
        
        // Remove any non-JSON content before the first { or after the last }
        jsonString = jsonString.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        
        try {
          // First attempt to parse directly
          const parsedPlan = JSON.parse(jsonString);
          setLearningPlan(parsedPlan);
        } catch (parseError) {
          console.error('Initial JSON parsing error:', parseError);
          
          // Try automatic JSON repair strategies
          try {
            // Fix common JSON issues
            const fixedJson = attemptAdvancedJsonRepair(jsonString);
            try {
              const parsedPlan = JSON.parse(fixedJson);
              console.log('Successfully parsed JSON after repairs');
              setLearningPlan(parsedPlan);
            } catch (secondError) {
              console.error('Failed to parse JSON after repairs:', secondError);
              await repairJsonWithAI(jsonString);
            }
          } catch (repairError) {
            console.error('Error during JSON repair:', repairError);
            await repairJsonWithAI(jsonString);
          }
        }
      } catch (error) {
        console.error('Error processing AI response:', error);
        setShowRawResponse(true);
        toast({
          title: 'JSON Error',
          description: 'Error processing the AI response. Attempting repair...',
          variant: 'destructive',
        });
        await repairJsonWithAI(response);
      }
    } catch (error: any) {
      console.error('Error generating learning path from text:', error);
      if (error.message?.includes('API key')) {
        setShowApiKeyInput(true);
      } else {
        toast({
          title: 'Error',
          description: `Failed to generate plan: ${error.message || 'Unknown error'}`,
          variant: 'destructive',
        });
      }
      setShowRawResponse(true);
    } finally {
      setIsLoading(false);
      setPdfProcessingState('idle');
    }
  };

  // New function: Use the AI model to repair broken JSON
  const repairJsonWithAI = async (brokenJson: string) => {
    try {
      setIsLoading(true);
      toast({
        title: 'Repairing JSON',
        description: 'Using AI to fix the JSON format...',
      });
      
      // Get current timeframe and determine appropriate schedule units
      const currentTimeframe = showCustomTimeframe ? customTimeframe : timeframe;
      let schedulePeriodType = "days";
      
      // Get the numeric value from timeframe
      const timeNumber = extractNumber(currentTimeframe);
      
      // Determine appropriate time units based on overall timeframe
      if (currentTimeframe.includes('month') || 
          (currentTimeframe.includes('week') && timeNumber > 6) ||
          (timeNumber > 45 && !currentTimeframe.includes('hour'))) {
        schedulePeriodType = "weeks";
      } else if (currentTimeframe.includes('day') || 
                (currentTimeframe.includes('week') && timeNumber <= 6)) {
        schedulePeriodType = "days";
      } else if ((currentTimeframe.includes('month') && timeNumber > 3) || 
                currentTimeframe.includes('year')) {
        schedulePeriodType = "months";
      }
      
      // Simpler repair prompt
      const repairPrompt = `Fix this JSON to match this structure exactly:
{
  "title": "Short, Concise Title",
  "description": "Description",
  "modules": [
    {
      "title": "Brief Module Title",
      "description": "Description",
      "estimatedTime": "Time",
      "topics": [
        {
          "title": "Short Topic",
          "subtopics": ["Subtopic"],
          "resources": ["Resource"],
          "activities": ["Activity"]
        }
      ]
    }
  ]${includeSchedule ? `,
  "schedule": [
    {
      "day": "${schedulePeriodType === 'days' ? 'Day' : schedulePeriodType === 'weeks' ? 'Week' : 'Month'} 1",
      "topics": ["Topic"],
      "duration": "Duration"
    }
  ]` : ''}
}

Broken JSON:
${brokenJson}

Create ${timeNumber <= 7 ? '4-5' : timeNumber <= 30 ? '5-8' : '6-10'} modules with concise titles.
Return ONLY valid JSON with no explanations.`;
      
      // Send repair request to AI
      const repairResponse = await generateResponse(repairPrompt);
      
      // Process the repaired JSON
      const jsonMatch = repairResponse.match(/```json\n([\s\S]*?)\n```/) || repairResponse.match(/```\n([\s\S]*?)\n```/) || [null, repairResponse];
      const repairedJsonString = jsonMatch[1] || repairResponse;
      
      // Clean up the repaired JSON
      let cleanedJson = repairedJsonString.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      try {
        // Parse the repaired JSON
        const parsedPlan = JSON.parse(cleanedJson);
        setLearningPlan(parsedPlan);
        setShowRawResponse(false);
        toast({
          title: 'Success',
          description: 'Successfully repaired and parsed the JSON!',
        });
      } catch (error) {
        console.error('Error parsing repaired JSON:', error);
        setRawResponse(repairResponse);
        setShowRawResponse(true);
        toast({
          title: 'Repair Failed',
          description: 'Could not repair JSON. You can view the raw response for manual editing.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in AI repair process:', error);
      setShowRawResponse(true);
    } finally {
      setIsLoading(false);
    }
  };

  // *** MODIFIED: Function to handle file upload ***
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsFileUploading(true);
    setLearningPlan(null);
    setRawResponse(null);
    setShowRawResponse(false);

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // --- Handle Text/Markdown Files ---
    if (fileType === 'text/plain' || fileType === 'text/markdown' || fileName.endsWith('.md') || fileName.endsWith('.txt')) {
      setPdfProcessingState('idle');
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        if (!content) {
          toast({
            title: 'Error Reading File',
            description: 'Could not read the file content.',
            variant: 'destructive',
          });
          setIsFileUploading(false);
          return;
        }
        try {
          // Send content directly to AI instead of parsing it
          await generatePlanFromText(content);
        } catch (error: any) {
          console.error('Error processing uploaded file:', error);
          toast({
            title: 'Processing Error',
            description: `An error occurred: ${error.message || 'Unknown error'}`,
            variant: 'destructive',
          });
        } finally {
          setIsFileUploading(false);
          event.target.value = '';
        }
      };
      reader.onerror = (e) => {
        console.error('File reading error:', e);
        toast({
          title: 'Error Reading File',
          description: 'Could not read the selected file.',
          variant: 'destructive',
        });
        setIsFileUploading(false);
        event.target.value = '';
      };
      reader.readAsText(file);
    }
    // --- Handle PDF Files ---
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      setPdfProcessingState('extracting');
      
      try {
        // Extract text from PDF using the new hook
        const text = await extractFullText(file);
        
        if (text.trim().length === 0) {
          toast({
            title: 'PDF Error',
            description: 'Could not extract text from the PDF. It may be scanned or have content restrictions.',
            variant: 'destructive',
          });
          setPdfProcessingState('idle');
          setIsFileUploading(false);
          event.target.value = '';
          
          // Offer text paste as fallback
          setTimeout(() => {
            setShowTextPasteModal(true);
            toast({
              title: 'Try Manual Input',
              description: 'Please copy and paste the content from your PDF directly.',
              variant: 'default',
            });
          }, 1000);
          
          return;
        }
        
        // Process extracted text
        await generatePlanFromText(text);
      } catch (error: any) {
        console.error('Error processing PDF:', error);
        toast({
          title: 'PDF Processing Error',
          description: error.message || 'Failed to process PDF. Please try the manual input option.',
          variant: 'destructive',
        });
        
        // Fall back to manual text pasting option if automatic extraction fails
        setTimeout(() => {
          setShowTextPasteModal(true);
        }, 1000);
      } finally {
        setPdfProcessingState('idle');
        setIsFileUploading(false);
        event.target.value = '';
      }
    }
    // --- Handle Unsupported Files ---
    else {
      toast({
        title: 'Unsupported File Type',
        description: 'Please upload a .txt, .md, or .pdf file.',
        variant: 'default',
      });
      setIsFileUploading(false);
      setPdfProcessingState('idle');
      event.target.value = '';
    }
  };

  // Function to handle direct text pasting as an alternative to PDF upload
  const handlePastedTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      toast({
        title: 'No Text Provided',
        description: 'Please paste some text to analyze.',
        variant: 'destructive',
      });
      return;
    }

    // Close the modal
    setShowTextPasteModal(false);
    
    // Process the pasted text directly with AI
    await generatePlanFromText(pastedText);
    
    // Reset the state
    setPastedText('');
  };

  const saveToWorkspace = async () => {
    if (!workspaceId || !learningPlan) return;
    
    try {
      setIsSavingToWorkspace(true);
      
      // Check if folders exist in the workspace
      if (folders.length === 0) {
        toast({
          title: "Error",
          description: "No folders available in this workspace.",
          variant: "destructive",
        });
        setIsSavingToWorkspace(false);
        return;
      }
      
      // Find or create a "Learning Paths" folder
      let learningPathsFolder = folders.find(folder => folder.title === "Learning Paths");
      
      if (!learningPathsFolder) {
        // Create a new "Learning Paths" folder
        const newFolder = {
          id: v4(),
          title: "Learning Paths",
          iconId: "📚",
          data: null,
          inTrash: null,
          workspaceId,
          bannerUrl: '',
          createdAt: new Date().toISOString(),
        };
        
        // Create folder in database
        const { error: folderError } = await createFolder(newFolder);
        
        if (folderError) {
          toast({
            title: "Error",
            description: "Could not create Learning Paths folder.",
            variant: "destructive",
          });
          setIsSavingToWorkspace(false);
          return;
        }
        
        // Update local state with the new folder
        dispatch({
          type: 'ADD_FOLDER',
          payload: { 
            workspaceId, 
            folder: { ...newFolder, files: [] } 
          },
        });
        
        // Reload folders to ensure we have the latest data
        const { data: refreshedFolders, error: refreshError } = await getFolders(workspaceId);
        if (!refreshError && refreshedFolders) {
          setFolders(refreshedFolders);
          // Find the newly created folder in the refreshed list
          learningPathsFolder = refreshedFolders.find(folder => folder.title === "Learning Paths");
          if (!learningPathsFolder) {
            // If somehow we still can't find it, use the folder we just created
            learningPathsFolder = newFolder;
          }
        } else {
          // If refresh fails, use the folder we just created
          learningPathsFolder = newFolder;
        }
        
        toast({
          title: "Success",
          description: "Created Learning Paths folder",
        });
      }
      
      // Create a new folder for this specific learning path
      const sanitizedTopicName = learningPlan.title.replace(/[^a-zA-Z0-9 ]/g, '').trim();
      const topicFolderName = sanitizedTopicName.length > 30 ? sanitizedTopicName.substring(0, 30) + '...' : sanitizedTopicName;
      
      const topicFolder = {
        id: v4(),
        title: topicFolderName,
        iconId: "🎓",
        data: null,
        inTrash: null,
        workspaceId,
        bannerUrl: '',
        createdAt: new Date().toISOString(),
      };
      
      // Create the topic folder in database
      const { error: topicFolderError } = await createFolder(topicFolder);
      
      if (topicFolderError) {
        toast({
          title: "Error",
          description: "Could not create folder for this learning path.",
          variant: "destructive",
        });
        setIsSavingToWorkspace(false);
        return;
      }
      
      // Update local state with the new topic folder
      dispatch({
        type: 'ADD_FOLDER',
        payload: { 
          workspaceId, 
          folder: { ...topicFolder, files: [] } 
        },
      });
      
      // Create overview file
      const formattedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      let overviewContent = `# ${learningPlan.title} - Overview\n\n`;
      overviewContent += `*Generated on ${formattedDate}*\n\n`;
      overviewContent += `## Description\n${learningPlan.description}\n\n`;
      
      // Add modules summary
      overviewContent += `## Learning Modules Summary\n\n`;
      learningPlan.modules.forEach((module, index) => {
        overviewContent += `${index + 1}. **${module.title}** (${module.estimatedTime})\n`;
      });
      
      overviewContent += `\n\n`;
      
      // Add schedule if it exists
      if (learningPlan.schedule && learningPlan.schedule.length > 0) {
        overviewContent += `## Study Schedule\n\n`;
        
        learningPlan.schedule.forEach((session) => {
          overviewContent += `### ${session.day} (${session.duration})\n\n`;
          overviewContent += `**Topics to Cover:**\n`;
          
          session.topics.forEach((topic) => {
            overviewContent += `- ${topic}\n`;
          });
          
          overviewContent += '\n';
        });
      }
      
      // Create overview file
      const overviewFileId = v4();
      const overviewFile = {
        id: overviewFileId,
        title: "00-Overview",
        iconId: '📋',
        data: JSON.stringify({
          markdown: true,
          content: overviewContent
        }),
        inTrash: null,
        folderId: topicFolder.id,
        workspaceId,
        bannerUrl: '',
        createdAt: new Date().toISOString(),
      };
      
      // Create overview file in database
      const { error: overviewError } = await createFile(overviewFile);
      
      if (overviewError) {
        console.error("Error creating overview file:", overviewError);
      } else {
        // Update local state
        dispatch({
          type: 'ADD_FILE',
          payload: { 
            workspaceId, 
            folderId: topicFolder.id, 
            file: overviewFile 
          },
        });
      }
      
      // Create a file for each module
      const moduleCreationPromises = learningPlan.modules.map(async (module, index) => {
        // Format module content
        let moduleContent = `# Module ${index + 1}: ${module.title}\n\n`;
        moduleContent += `**Estimated Time:** ${module.estimatedTime}\n\n`;
        moduleContent += `## Description\n${module.description}\n\n`;
        
        // Add topics
        module.topics.forEach((topic, tIndex) => {
          moduleContent += `## ${topic.title}\n\n`;
          
          if (topic.subtopics && topic.subtopics.length > 0) {
            moduleContent += `### Subtopics\n`;
            topic.subtopics.forEach(subtopic => {
              moduleContent += `- ${subtopic}\n`;
            });
            moduleContent += '\n';
          }
          
          if (topic.resources && topic.resources.length > 0) {
            moduleContent += `### Resources\n`;
            topic.resources.forEach(resource => {
              moduleContent += `- ${resource}\n`;
            });
            moduleContent += '\n';
          }
          
          if (topic.activities && topic.activities.length > 0) {
            moduleContent += `### Activities\n`;
            topic.activities.forEach(activity => {
              moduleContent += `- ${activity}\n`;
            });
            moduleContent += '\n';
          }
        });
        
        // Create file in database
        const moduleFileId = v4();
        const moduleFile = {
          id: moduleFileId,
          title: `${(index + 1).toString().padStart(2, '0')}-${module.title.substring(0, 25)}`,
          iconId: '📝',
          data: JSON.stringify({
            markdown: true,
            content: moduleContent
          }),
          inTrash: null,
          folderId: topicFolder.id,
          workspaceId,
          bannerUrl: '',
          createdAt: new Date().toISOString(),
        };
        
        // Create file in database
        const { error } = await createFile(moduleFile);
        
        if (error) {
          console.error(`Error creating file for module ${index + 1}:`, error);
          return false;
        } else {
          // Update local state
          dispatch({
            type: 'ADD_FILE',
            payload: { 
              workspaceId, 
              folderId: topicFolder.id, 
              file: moduleFile 
            },
          });
          return true;
        }
      });
      
      // Wait for all module files to be created
      const results = await Promise.all(moduleCreationPromises);
      
      if (results.some(result => !result)) {
        toast({
          title: 'Partial Success',
          description: 'Some module files could not be saved.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Learning path saved to workspace with individual module files',
        });
      }
    } catch (error) {
      console.error('Error saving to workspace:', error);
      toast({
        title: 'Error',
        description: 'Could not save learning path',
        variant: 'destructive',
      });
    } finally {
      setIsSavingToWorkspace(false);
    }
  };

  const ModuleCard: React.FC<{ module: LearningModule, index: number }> = ({ module, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div className="mb-6 bg-gray-900 bg-opacity-50 rounded-lg p-4 border border-violet-950">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <h3 className="text-lg font-semibold text-white">Module {index + 1}: {module.title}</h3>
          <span className="text-gray-400 text-sm">{module.estimatedTime}</span>
        </div>
        
        <p className="text-gray-300 mt-2 mb-3">{module.description}</p>
        
        {isExpanded && (
          <div className="mt-4">
            {module.topics.map((topic, tIndex) => (
              <div key={tIndex} className="mb-4 bg-gray-700 p-3 rounded-md">
                <h4 className="font-medium text-white mb-2">{topic.title}</h4>
                
                {topic.subtopics && topic.subtopics.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 mb-1">Subtopics:</div>
                    <ul className="list-disc pl-5 text-gray-300 text-sm">
                      {topic.subtopics.map((subtopic, stIndex) => (
                        <li key={stIndex}>{subtopic}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {topic.resources && topic.resources.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 mb-1">Resources:</div>
                    <ul className="list-disc pl-5 text-gray-300 text-sm">
                      {topic.resources.map((resource, rIndex) => (
                        <li key={rIndex}>{resource}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {topic.activities && topic.activities.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Activities:</div>
                    <ul className="list-disc pl-5 text-gray-300 text-sm">
                      {topic.activities.map((activity, aIndex) => (
                        <li key={aIndex}>{activity}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ScheduleCard: React.FC<{ schedule: StudySession[] }> = ({ schedule }) => {
    return (
      <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          <RiCalendarLine className="mr-2" /> Study Schedule
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {schedule.map((session, index) => (
            <div key={index} className="bg-gray-700 p-3 rounded-md">
              <div className="font-medium text-white mb-1">{session.day}</div>
              <div className="text-gray-300 text-sm mb-2">{session.duration}</div>
              <ul className="list-disc pl-5 text-gray-300 text-sm">
                {session.topics.map((topic, tIndex) => (
                  <li key={tIndex}>{topic}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Function to manually attempt to repair the JSON
  const manuallyRepairJson = () => {
    if (!rawResponse) return;
    
    try {
      // Extract JSON from raw response
      const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/) || rawResponse.match(/```\n([\s\S]*?)\n```/) || [null, rawResponse];
      const jsonString = jsonMatch[1] || rawResponse;
      
      // Clean up and repair
      let cleanedJson = jsonString.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      cleanedJson = cleanedJson.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      
      // Try AI-based repair
      repairJsonWithAI(cleanedJson);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during repair.',
        variant: 'destructive',
      });
      console.error('Error in manual repair process:', err);
    }
  };

  return (
    <div className="bg-[#1e1e2e] border border-[#6d28d9] rounded-lg p-5 shadow-lg">
      <div className="flex flex-col space-y-4">
        {/* Content Uploader Section */}
        <div className="flex flex-wrap gap-4 pb-4 border-b border-[#44475a]">
          <button 
            onClick={() => setShowTextPasteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#282a36] text-white rounded-lg hover:bg-[#2d2d3a]"
          >
            <RiFileAddLine className="text-[#7c3aed]" /> Paste Content
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-[#282a36] text-white rounded-lg hover:bg-[#2d2d3a] cursor-pointer">
            <RiUploadCloud2Line className="text-[#7c3aed]" /> Upload PDF
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          
          {pdfProcessingState === 'extracting' && (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-yellow-400 rounded-full"></div>
              Extracting text from PDF...
            </div>
          )}
          {pdfProcessingState === 'generating' && (
            <div className="flex items-center gap-2 text-[#7c3aed]">
              <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-[#7c3aed] rounded-full"></div>
              Generating learning path from PDF...
            </div>
          )}
        </div>
        {/* Form and data display section */}
        <div className="flex-1 overflow-y-auto p-4">
          {!learningPlan && !isLoading && !isFileUploading && (
            <form onSubmit={handleGenerateLearningPath} className=""> 
              <div className="mb-4">
                <label htmlFor="goal" className="block text-sm font-medium text-gray-300 mb-1">
                  What do you want to learn?
                </label>
                <input
                  type="text"
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="E.g., Python for beginners, React fundamentals, World History..."
                  className="w-full p-3 bg-[#1a1b26] text-white rounded-lg focus:outline-none focus:border-[#7c3aed]"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="timeframe" className="block text-sm font-medium text-gray-300 mb-1">
                  Available timeframe
                </label>
                <div className="space-y-3">
                  <div className="px-1">
                    <input
                      type="range"
                      id="timeframe-slider"
                      min="0"
                      max="100"
                      value={sliderPosition}
                      onChange={handleSliderChange}
                      className="w-full h-2 bg-[#44475a] rounded-lg appearance-none cursor-pointer"
                      disabled={showCustomTimeframe}
                      aria-label="Learning path timeframe slider"
                      style={{
                        background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${sliderPosition}%, #44475a ${sliderPosition}%, #44475a 100%)`
                      }}
                    />
                    <div className="relative w-full h-6 mt-1">
                      {sliderPresets.map((preset, index) => (
                        <div 
                          key={index} 
                          className="absolute transform -translate-x-1/2" 
                          style={{ left: `${preset.position}%` }}
                        >
                          <div className="w-0.5 h-1.5 bg-gray-400 mx-auto"></div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">{preset.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Current timeframe value */}
                  <div className="flex justify-between items-center">
                    <div className="text-white text-lg font-medium">
                      {showCustomTimeframe ? customTimeframe : getTimeframeFromDays(getCurrentDays())}
                    </div>
                    <button
                      type="button"
                      onClick={toggleCustomTimeframe}
                      className="text-xs px-2 py-1 rounded bg-[#282a36] text-[#7c3aed] hover:bg-[#2d2d3a] flex items-center"
                    >
                      <RiEdit2Line className="mr-1" />
                      {showCustomTimeframe ? "Use Slider" : "Custom"}
                    </button>
                  </div>
                  
                  {/* Custom timeframe input */}
                  {showCustomTimeframe && (
                    <div className="flex items-center mt-2">
                      <input
                        type="text"
                        value={customTimeframe}
                        onChange={handleCustomTimeframeChange}
                        placeholder="E.g., 5 weeks, 7 months, etc."
                        className="flex-1 p-3 bg-[#1a1b26] text-white rounded-lg focus:outline-none focus:border-[#7c3aed]"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeSchedule"
                    checked={includeSchedule}
                    onChange={(e) => setIncludeSchedule(e.target.checked)}
                    className="w-4 h-4 text-[#7c3aed] focus:ring-[#7c3aed] border-gray-600 rounded"
                  />
                  <label htmlFor="includeSchedule" className="ml-2 text-sm font-medium text-gray-300">
                    Include a suggested study schedule
                  </label>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !goal.trim()}
                className="w-full flex items-center justify-center p-3 mb-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <RiSendPlane2Line className="mr-2" />
                    Generate Learning Path
                  </>
                )}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#44475a]"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-[#1a1b26] text-sm text-gray-400">Or</span>
                </div>
              </div>

              <label
                htmlFor="plan-upload"
                className={`w-full flex items-center justify-center p-3 bg-[#282a36] text-white rounded-lg hover:bg-[#2d2d3a] cursor-pointer ${isFileUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isFileUploading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full mr-2"></div>
                    {pdfProcessingState === 'extracting' ? 'Extracting PDF...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <RiUploadCloud2Line className="mr-2" />
                    Upload Existing Plan (.txt, .md, .pdf)
                  </>
                )}
              </label>
              <input
                id="plan-upload"
                type="file"
                className="hidden"
                accept=".txt,.md,.pdf"
                onChange={handleFileUpload}
                disabled={isFileUploading}
              />
            </form>
          )}
          
          {learningPlan && !isLoading && !isFileUploading && (
            <div className=""> 
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white mb-2">{learningPlan.title}</h2>
                </div>
                <p className="text-gray-300">{learningPlan.description}</p>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-3">Learning Modules</h3>
                {learningPlan.modules.map((module, index) => (
                  <ModuleCard key={index} module={module} index={index} />
                ))}
              </div>
              
              {learningPlan.schedule && (
                <ScheduleCard schedule={learningPlan.schedule} />
              )}
              
              <div className="flex justify-center mt-6 space-x-4">
                <button
                  onClick={() => setLearningPlan(null)}
                  className="px-4 py-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  Create or Upload New Plan
                </button>
                <button
                  onClick={saveToWorkspace}
                  disabled={isSavingToWorkspace}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingToWorkspace ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <RiFileAddLine className="mr-1.5" />
                      Add to Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Text Paste Modal */}
        {showTextPasteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Paste Text Content</h3>
                <button 
                  onClick={() => setShowTextPasteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              </div>
              
              <form onSubmit={handlePastedTextSubmit} className="p-4 flex-1 flex flex-col">
                <p className="text-gray-300 mb-4">
                  PDF processing failed. You can paste the text content from your document directly:
                </p>
                
                <textarea 
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your text here..."
                  className="w-full flex-1 min-h-[200px] p-3 bg-gray-700 rounded-lg border border-gray-600 text-white resize-none mb-4"
                />
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTextPasteModal(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Process Text
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};