// Quiz format for Quill
let Quill: any;

interface QuizBlotStatic {
  blotName: string;
  tagName: string;
  className: string;
  create: (value: any) => HTMLElement;
  value: (node: HTMLElement) => { 
    questions: { 
      question: string; 
      options: { text: string; isCorrect: boolean }[] 
    }[]; 
    currentIndex: number;
  };
}

// Improved utility function to temporarily disable markdown processing
const withDisabledMarkdown = (quill: any, callback: () => void) => {
  try {
    // Find the root Quill instance if we have a blot
    const quillInstance = quill?.quill || quill;
    
    if (!quillInstance) {
      // If we can't find Quill, just execute the callback
      callback();
      return;
    }
    
    // Get the markdown module if it exists
    const markdownModule = quillInstance.getModule && quillInstance.getModule('markdown');
    
    // Store original state
    let originalProcessorEnabled = false;
    let originalMatches: any[] = [];
    let originalProcessFn: any = null;
    
    // Save original state if markdown module exists
    if (markdownModule) {
      if (markdownModule.options && markdownModule.options.enabled !== undefined) {
        originalProcessorEnabled = markdownModule.options.enabled;
        markdownModule.options.enabled = false;
      }
      
      // Also store and clear any pending matches to prevent processing
      if (markdownModule.matches) {
        originalMatches = [...markdownModule.matches];
        markdownModule.matches = [];
      }
      
      // Temporarily replace the onRemoveElement method to avoid the null error
      if (markdownModule.activity && typeof markdownModule.activity.onRemoveElement === 'function') {
        originalProcessFn = markdownModule.activity.onRemoveElement;
        markdownModule.activity.onRemoveElement = function(node: any) {
          // Only process if node is not null and has an index property
          if (node && node.index !== undefined) {
            return originalProcessFn.call(this, node);
          }
        };
      }
    }
    
    // Execute the callback
    callback();
    
    // Restore original state
    if (markdownModule) {
      if (markdownModule.options && originalProcessorEnabled !== undefined) {
        markdownModule.options.enabled = originalProcessorEnabled;
      }
      
      // Restore matches if necessary
      if (markdownModule.matches) {
        markdownModule.matches = originalMatches;
      }
      
      // Restore the original process function
      if (markdownModule.activity && originalProcessFn) {
        markdownModule.activity.onRemoveElement = originalProcessFn;
      }
    }
  } catch (error) {
    // If something goes wrong, still execute the callback
    callback();
    console.error('Error handling markdown module:', error);
  }
};

// Create a quiz blot
export const QuizBlot: QuizBlotStatic = {
  blotName: 'quiz',
  tagName: 'div',
  className: 'ql-quiz',
  
  create(value: { 
    questions?: { 
      question: string; 
      options: { text: string; isCorrect: boolean }[] 
    }[]; 
    currentIndex?: number;
  } = {}) {
    const node = document.createElement('div');
    node.setAttribute('class', 'ql-quiz');
    node.setAttribute('contenteditable', 'false');
    
    // Create quiz container
    const container = document.createElement('div');
    container.className = 'ql-quiz-container';
    
    // Add title section with "QUIZ" heading
    const titleSection = document.createElement('div');
    titleSection.className = 'ql-quiz-title-section';
    
    const titleText = document.createElement('h3');
    titleText.className = 'ql-quiz-title-text';
    titleText.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-checks"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg> QUIZ`;
    
    titleSection.appendChild(titleText);
    container.appendChild(titleSection);
    
    // Create top-right action buttons (add/delete)
    const quizActions = document.createElement('div');
    quizActions.className = 'ql-quiz-actions';
    
    const addButton = document.createElement('button');
    addButton.className = 'ql-quiz-nav-btn ql-quiz-add';
    addButton.innerHTML = '+';
    addButton.title = 'Add new question';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'ql-quiz-nav-btn ql-quiz-delete';
    deleteButton.innerHTML = '&times;';
    deleteButton.title = 'Delete current question';
    
    // Add AI generate button
    const generateButton = document.createElement('button');
    generateButton.className = 'ql-quiz-nav-btn ql-quiz-generate';
    generateButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
    generateButton.title = 'Generate quiz with AI';
    
    // Add PDF upload button
    const pdfUploadButton = document.createElement('button');
    pdfUploadButton.className = 'ql-quiz-nav-btn ql-quiz-upload-pdf';
    pdfUploadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-type-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 12h8"/><path d="M8 16h8"/><path d="M8 20h8"/></svg>`;
    pdfUploadButton.title = 'Create quiz from PDF';
    
    // Use provided questions or create a default one
    const questions = value.questions || [{
      question: 'Enter your question here...',
      options: [
        { text: 'Option 1', isCorrect: true },
        { text: 'Option 2', isCorrect: false },
        { text: 'Option 3', isCorrect: false },
        { text: 'Option 4', isCorrect: false }
      ]
    }];
    
    // Handle the case where questions might be undefined
    const questionsLength = questions?.length || 1;
    
    deleteButton.disabled = questionsLength <= 1;
    deleteButton.style.display = questionsLength <= 1 ? 'none' : 'flex';
    
    // Add buttons to quiz actions
    quizActions.appendChild(pdfUploadButton);
    quizActions.appendChild(generateButton);
    quizActions.appendChild(addButton);
    quizActions.appendChild(deleteButton);
    
    // Set current index
    const currentIndex = value.currentIndex || 0;
    container.dataset.currentIndex = currentIndex.toString();
    container.dataset.totalQuestions = questions.length.toString();
    
    // Function to create a question element
    const createQuestionElement = (questionData: { question: string; options: { text: string; isCorrect: boolean }[] }, index: number) => {
      // Create question element
      const questionElement = document.createElement('div');
      questionElement.className = 'ql-quiz-question';
      questionElement.dataset.questionIndex = index.toString();
      questionElement.style.display = index === currentIndex ? 'block' : 'none';
      
      // Create question label
      const questionLabel = document.createElement('div');
      questionLabel.className = 'ql-quiz-label';
      questionLabel.textContent = 'QUESTION';
      
      // Create question content (editable)
      const questionContent = document.createElement('div');
      questionContent.className = 'ql-quiz-question-content';
      questionContent.setAttribute('contenteditable', 'true');
      questionContent.innerHTML = questionData.question || 'Enter your question here...';
      
      // Add keyboard event handlers for question content
      questionContent.addEventListener('keydown', (e) => {
        // Prevent Enter key from creating new blocks outside of quiz
        if (e.key === 'Enter' && !e.shiftKey) {
          e.stopPropagation(); // Don't let Quill handle this event
          
          // Insert a <br> at cursor position instead
          document.execCommand('insertLineBreak');
          e.preventDefault(); // Prevent default behavior
        }
        
        // Always prevent Delete/Backspace from bubbling up to Quill to avoid component deletion
        if (e.key === 'Delete' || e.key === 'Backspace') {
          // Still allow normal text deletion within the content
          if (questionContent.innerText.length === 0 || 
              window.getSelection()?.toString() === questionContent.innerText) {
            // If content would be emptied, prevent default behavior too
            e.preventDefault();
          }
          // Always stop propagation to prevent Quill from handling the event
          e.stopPropagation();
        }
      });
      
      // Handle content changes to prevent Markdown processor errors
      questionContent.addEventListener('input', (e) => {
        // Find the closest Quill instance
        let quillInstance: any;
        try {
          quillInstance = (node.closest('.ql-container') as any)?.['__quill'];
        } catch (err) {
          // Ignore errors here
        }
        
        // Temporarily disable Markdown processor during content changes
        withDisabledMarkdown(quillInstance || Quill, () => {
          // Just letting the input happen naturally, but with Markdown disabled
          
          // Clear selection to prevent Markdown from processing it
          if (quillInstance) {
            const range = quillInstance.getSelection();
            if (range) {
              // Save and restore selection after a short delay
              setTimeout(() => {
                quillInstance.setSelection(range.index, range.length);
              }, 1);
            }
          }
        });
      });
      
      // Create options container
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'ql-quiz-options';
      
      // Function to create an option element
      const createOptionElement = (optionData: { text: string; isCorrect: boolean }, optionIndex: number) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'ql-quiz-option';
        optionElement.dataset.optionIndex = optionIndex.toString();
        optionElement.dataset.isCorrect = optionData.isCorrect.toString();
        
        // Create radio container (holds radio button and correct indicator)
        const radioContainer = document.createElement('div');
        radioContainer.className = 'ql-quiz-option-radio-container';
        
        // Create radio button
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `quiz-${node.id || Math.random().toString(36).substr(2, 9)}-question-${index}`;
        radio.className = 'ql-quiz-option-radio';
        radio.checked = false; // Initially not checked
        
        // We're no longer using visual indicators, using color feedback instead
        // Add radio to container
        radioContainer.appendChild(radio);
        
        // Create option content (editable)
        const optionContent = document.createElement('div');
        optionContent.className = 'ql-quiz-option-content';
        optionContent.setAttribute('contenteditable', 'true');
        optionContent.innerHTML = optionData.text || `Option ${optionIndex + 1}`;
        
        // Create the action buttons container
        const optionActions = document.createElement('div');
        optionActions.className = 'ql-quiz-option-actions';
        
        // Create "Set as correct" button
        const setCorrectBtn = document.createElement('button');
        setCorrectBtn.className = 'ql-quiz-option-correct-btn';
        setCorrectBtn.textContent = 'Set as correct';
        setCorrectBtn.title = 'Mark this as the correct answer';
        setCorrectBtn.style.display = 'none'; // Initially hidden
        
        // Show "Set as correct" button when option is clicked/focused
        optionElement.addEventListener('click', () => {
          // Hide all "Set as correct" buttons first
          const allOptions = optionElement.parentElement?.querySelectorAll('.ql-quiz-option');
          allOptions?.forEach(opt => {
            const btn = opt.querySelector('.ql-quiz-option-correct-btn');
            if (btn) (btn as HTMLElement).style.display = 'none';
          });
          
          // Only show the button if this is not already the correct option
          if (!optionElement.classList.contains('ql-quiz-option-correct')) {
            setCorrectBtn.style.display = 'block';
          }
        });
        
        // Hide "Set as correct" button when clicking elsewhere
        document.addEventListener('click', (e) => {
          if (!optionElement.contains(e.target as Node)) {
            setCorrectBtn.style.display = 'none';
          }
        });
        
        // Radio button handler to mark correct/incorrect answer
        radio.addEventListener('change', (e) => {
          // First reset all options to default state
          const options = optionElement.parentElement?.querySelectorAll('.ql-quiz-option');
          options?.forEach(option => {
            option.classList.remove('ql-quiz-option-correct');
            option.classList.remove('ql-quiz-option-incorrect');
            
            // Ensure other radio buttons are unchecked
            const otherRadio = option.querySelector('.ql-quiz-option-radio') as HTMLInputElement;
            if (otherRadio && otherRadio !== radio) {
              otherRadio.checked = false;
            }
          });
          
          // Mark this option based on whether it's correct
          if (radio.checked) {
            const isCorrect = optionElement.dataset.isCorrect === 'true';
            if (isCorrect) {
              optionElement.classList.add('ql-quiz-option-correct');
            } else {
              optionElement.classList.add('ql-quiz-option-incorrect');
              
              // Also show the correct option
              options?.forEach(option => {
                const isThisCorrect = (option as HTMLElement).dataset.isCorrect === 'true';
                if (isThisCorrect) {
                  option.classList.add('ql-quiz-option-correct');
                }
              });
            }
          }
          
          // Hide all "Set as correct" buttons
          options?.forEach(opt => {
            const btn = opt.querySelector('.ql-quiz-option-correct-btn');
            if (btn) (btn as HTMLElement).style.display = 'none';
          });
        });
        
        // Add a click handler to the entire option element that selects the radio button
        optionElement.addEventListener('click', (e) => {
          // Don't handle clicks on buttons or editable content
          if (
            e.target === setCorrectBtn || 
            e.target === deleteOptionButton ||
            e.target === optionContent ||
            (e.target as HTMLElement).closest('.ql-quiz-option-content') ||
            (e.target as HTMLElement).closest('.ql-quiz-option-actions')
          ) {
            return;
          }
          
          // Check the radio button and trigger the change event
          radio.checked = true;
          
          // Manually dispatch change event to ensure handlers run
          radio.dispatchEvent(new Event('change'));
        });
        
        // "Set as correct" button handler
        setCorrectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Update the data model first
          questionData.options.forEach((opt, idx) => {
            opt.isCorrect = idx === optionIndex;
          });
          
          // Update the dataset attributes for all options
          const options = optionElement.parentElement?.querySelectorAll('.ql-quiz-option');
          options?.forEach((option, idx) => {
            (option as HTMLElement).dataset.isCorrect = (idx === optionIndex).toString();
          });
          
          // Now update the UI - remove all visual indicators
          options?.forEach(option => {
            option.classList.remove('ql-quiz-option-correct');
            option.classList.remove('ql-quiz-option-incorrect');
            const optRadio = option.querySelector('.ql-quiz-option-radio') as HTMLInputElement;
            if (optRadio) optRadio.checked = false;
            const correctInd = option.querySelector('.ql-quiz-option-correct-indicator');
            const incorrectInd = option.querySelector('.ql-quiz-option-incorrect-indicator');
            if (correctInd) (correctInd as HTMLElement).style.display = 'none';
            if (incorrectInd) (incorrectInd as HTMLElement).style.display = 'none';
          });
          
          // Update the isCorrect value for this option
          optionData.isCorrect = true;
          
          // Hide the button after setting
          setCorrectBtn.style.display = 'none';
        });
        
        // Add keyboard event handlers for option content
        optionContent.addEventListener('keydown', (e) => {
          // Prevent Enter key from creating new blocks
          if (e.key === 'Enter' && !e.shiftKey) {
            e.stopPropagation();
            e.preventDefault();
            
            // If we're in the last option, create a new option
            const isLastOption = optionIndex === questionData.options.length - 1;
            if (isLastOption) {
              // Find the closest Quill instance
              let quillInstance;
              try {
                quillInstance = (node.closest('.ql-container') as any)?.['__quill'];
              } catch (err) {
                // Ignore errors here
              }
              
              // Wrap the add operation in markdown safety
              withDisabledMarkdown(quillInstance || Quill, () => {
                addOptionHandler();
              });
            } else {
              // Focus the next option
              const nextOption = optionElement.nextElementSibling?.querySelector('.ql-quiz-option-content');
              if (nextOption) {
                (nextOption as HTMLElement).focus();
              }
            }
          }
          
          // Prevent Delete/Backspace from bubbling up
          if (e.key === 'Delete' || e.key === 'Backspace') {
            if (optionContent.innerText.length === 0 || 
                window.getSelection()?.toString() === optionContent.innerText) {
              e.preventDefault();
            }
            e.stopPropagation();
          }
        });
        
        // Handle content changes to prevent Markdown processor errors
        optionContent.addEventListener('input', (e) => {
          // Find the closest Quill instance
          let quillInstance: any;
          try {
            quillInstance = (node.closest('.ql-container') as any)?.['__quill'];
          } catch (err) {
            // Ignore errors here
          }
          
          // Temporarily disable Markdown processor during content changes
          withDisabledMarkdown(quillInstance || Quill, () => {
            // Just letting the input happen naturally, but with Markdown disabled
            
            // Clear selection to prevent Markdown from processing it
            if (quillInstance) {
              const range = quillInstance.getSelection();
              if (range) {
                // Save and restore selection after a short delay
                setTimeout(() => {
                  quillInstance.setSelection(range.index, range.length);
                }, 1);
              }
            }
          });
        });
        
        // Delete option button
        const deleteOptionButton = document.createElement('button');
        deleteOptionButton.className = 'ql-quiz-option-delete';
        deleteOptionButton.innerHTML = '&times;';
        deleteOptionButton.title = 'Delete option';
        
        // Only show delete button if there are more than 2 options
        deleteOptionButton.style.display = questionData.options.length <= 2 ? 'none' : 'block';
        
        // Delete option button handler
        deleteOptionButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Don't allow deletion if there are only 2 options
          if (questionData.options.length <= 2) return;
          
          // Remove the option element
          optionElement.remove();
          
          // Recalculate indices for remaining options
          const options = optionsContainer.querySelectorAll('.ql-quiz-option');
          options.forEach((option, i) => {
            (option as HTMLElement).dataset.optionIndex = i.toString();
          });
          
          // If we deleted the correct option, make the first option correct
          const hasCorrectOption = optionsContainer.querySelector('.ql-quiz-option-correct');
          if (!hasCorrectOption && options.length > 0) {
            const firstOption = options[0] as HTMLElement;
            firstOption.classList.add('ql-quiz-option-correct');
            const firstRadio = firstOption.querySelector('input[type="radio"]') as HTMLInputElement;
            if (firstRadio) firstRadio.checked = true;
          }
          
          // Update delete button visibility
          options.forEach(option => {
            const deleteBtn = option.querySelector('.ql-quiz-option-delete');
            if (deleteBtn) {
              (deleteBtn as HTMLElement).style.display = options.length <= 2 ? 'none' : 'block';
            }
          });
        });
        
        // Add elements to the actions container
        optionActions.appendChild(setCorrectBtn);
        optionActions.appendChild(deleteOptionButton);
        
        // Assemble option element
        optionElement.appendChild(radioContainer);
        optionElement.appendChild(optionContent);
        optionElement.appendChild(optionActions);
        
        return optionElement;
      };
      
      // Add options to the options container
      questionData.options.forEach((option, optionIndex) => {
        const optionElement = createOptionElement(option, optionIndex);
        optionsContainer.appendChild(optionElement);
      });
      
      // Add option button
      const addOptionButton = document.createElement('div');
      addOptionButton.className = 'ql-quiz-add-option';
      addOptionButton.innerHTML = '+ Add Option';
      
      // Add option handler
      const addOptionHandler = () => {
        // Create a new option
        const newOption = {
          text: `Option ${questionData.options.length + 1}`,
          isCorrect: false
        };
        
        // Add to options array
        questionData.options.push(newOption);
        
        // Create and add the option element
        const optionElement = createOptionElement(newOption, questionData.options.length - 1);
        optionsContainer.insertBefore(optionElement, addOptionButton);
        
        // Show delete buttons if we now have more than 2 options
        if (questionData.options.length > 2) {
          const deleteButtons = optionsContainer.querySelectorAll('.ql-quiz-option-delete');
          deleteButtons.forEach(btn => {
            (btn as HTMLElement).style.display = 'block';
          });
        }
        
        // Focus the new option content
        setTimeout(() => {
          const optionContent = optionElement.querySelector('.ql-quiz-option-content');
          if (optionContent) {
            (optionContent as HTMLElement).focus();
            
            // Select all text
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(optionContent);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }, 10);
      };
      
      // Add option button handler
      addOptionButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addOptionHandler();
      });
      
      // Add elements to question
      questionElement.appendChild(questionLabel);
      questionElement.appendChild(questionContent);
      questionElement.appendChild(optionsContainer);
      optionsContainer.appendChild(addOptionButton);
      
      return questionElement;
    };
    
    // Create question elements for each question in the quiz
    questions.forEach((question, index) => {
      const questionElement = createQuestionElement(question, index);
      container.appendChild(questionElement);
    });
    
    // Create navigation controls
    const navControls = document.createElement('div');
    navControls.className = 'ql-quiz-controls';
    
    const navInfo = document.createElement('div');
    navInfo.className = 'ql-quiz-info';
    navInfo.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
    
    const prevButton = document.createElement('button');
    prevButton.className = 'ql-quiz-nav-btn ql-quiz-prev';
    prevButton.innerHTML = '&larr;';
    prevButton.title = 'Previous question';
    prevButton.disabled = currentIndex === 0;
    
    const nextButton = document.createElement('button');
    nextButton.className = 'ql-quiz-nav-btn ql-quiz-next';
    nextButton.innerHTML = '&rarr;';
    nextButton.title = 'Next question';
    nextButton.disabled = currentIndex === questions.length - 1;
    
    // Add reset button
    const resetButton = document.createElement('button');
    resetButton.className = 'ql-quiz-nav-btn ql-quiz-reset';
    resetButton.innerHTML = '↺';
    resetButton.title = 'Reset quiz';
    
    // Update navigation info and button states
    const updateNavInfo = () => {
      const currentIdx = parseInt(container.dataset.currentIndex || '0');
      const totalQuestions = parseInt(container.dataset.totalQuestions || '1');
      navInfo.textContent = `Question ${currentIdx + 1} of ${totalQuestions}`;
      prevButton.disabled = currentIdx === 0;
      nextButton.disabled = currentIdx === totalQuestions - 1;
      
      // Update delete button visibility based on question count
      deleteButton.disabled = totalQuestions <= 1;
      deleteButton.style.display = totalQuestions <= 1 ? 'none' : 'flex';
    };
    
    // Add click handler for reset button
    resetButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Find the closest Quill instance
      let quillInstance;
      try {
        quillInstance = (node.closest('.ql-container') as any)?.['__quill'];
      } catch (err) {
        // Ignore errors here
      }
      
      // Wrap the reset operation in markdown safety
      withDisabledMarkdown(quillInstance || Quill, () => {
        // Fisher-Yates shuffle algorithm for arrays
        const shuffleArray = <T>(array: T[]): T[] => {
          const newArray = [...array];
          for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
          }
          return newArray;
        };
        
        // Get all questions and their data
        const questionElements = container.querySelectorAll('.ql-quiz-question');
        const questions: {
          element: HTMLElement;
          question: string;
          options: {
            text: string;
            isCorrect: boolean;
            element: HTMLElement;
          }[];
        }[] = [];
        
        // Collect question data
        questionElements.forEach((questionEl) => {
          const questionElement = questionEl as HTMLElement;
          const questionContent = questionElement.querySelector('.ql-quiz-question-content');
          const optionElements = questionElement.querySelectorAll('.ql-quiz-option');
          const options: {
            text: string;
            isCorrect: boolean;
            element: HTMLElement;
          }[] = [];
          
          // Collect option data
          optionElements.forEach((optEl) => {
            const optionElement = optEl as HTMLElement;
            if (optionElement.classList.contains('ql-quiz-add-option')) return;
            
            const optionContent = optionElement.querySelector('.ql-quiz-option-content');
            const isCorrect = optionElement.dataset.isCorrect === 'true';
            
            options.push({
              text: optionContent ? optionContent.innerHTML : '',
              isCorrect,
              element: optionElement
            });
          });
          
          questions.push({
            element: questionElement,
            question: questionContent ? questionContent.innerHTML : '',
            options
          });
        });
        
        // Shuffle questions
        const shuffledQuestions = shuffleArray(questions);
        
        // For each question, shuffle its options
        shuffledQuestions.forEach((question, qIndex) => {
          // Shuffle options for this question
          const shuffledOptions = shuffleArray(question.options);
          
          // Get option container for this question
          const optionsContainer = question.element.querySelector('.ql-quiz-options');
          if (!optionsContainer) return;
          
          // Get "Add Option" button to preserve it
          const addOptionButton = optionsContainer.querySelector('.ql-quiz-add-option');
          
          // Remove all options from DOM (except Add Option button)
          shuffledOptions.forEach(option => {
            optionsContainer.removeChild(option.element);
          });
          
          // Create fresh option elements with shuffled data
          shuffledOptions.forEach((option, oIndex) => {
            // Create fresh option element
            const newOptionEl = document.createElement('div');
            newOptionEl.className = 'ql-quiz-option';
            newOptionEl.dataset.optionIndex = oIndex.toString();
            newOptionEl.dataset.isCorrect = option.isCorrect.toString();
            
            // Copy inner HTML structure from original option
            newOptionEl.innerHTML = option.element.innerHTML;
            
            // Reset any visual indicators
            newOptionEl.classList.remove('ql-quiz-option-correct', 'ql-quiz-option-incorrect');
            
            // Make sure radio is unchecked
            const radio = newOptionEl.querySelector('.ql-quiz-option-radio') as HTMLInputElement;
            if (radio) radio.checked = false;
            
            // Insert before the add button
            if (addOptionButton) {
              optionsContainer.insertBefore(newOptionEl, addOptionButton);
            } else {
              optionsContainer.appendChild(newOptionEl);
            }
            
            // Re-add event listeners to the new elements
            // Find and add click handler for the radio
            const radioContainer = newOptionEl.querySelector('.ql-quiz-option-radio-container');
            if (radioContainer && radio) {
              radio.addEventListener('change', (e) => {
                // Find all options in this question
                const options = newOptionEl.parentElement?.querySelectorAll('.ql-quiz-option');
                options?.forEach(option => {
                  option.classList.remove('ql-quiz-option-correct');
                  option.classList.remove('ql-quiz-option-incorrect');
                  
                  // Ensure other radio buttons are unchecked
                  const otherRadio = option.querySelector('.ql-quiz-option-radio') as HTMLInputElement;
                  if (otherRadio && otherRadio !== radio) {
                    otherRadio.checked = false;
                  }
                });
                
                // Mark based on correctness
                if (radio.checked) {
                  const isCorrect = newOptionEl.dataset.isCorrect === 'true';
                  if (isCorrect) {
                    newOptionEl.classList.add('ql-quiz-option-correct');
                  } else {
                    newOptionEl.classList.add('ql-quiz-option-incorrect');
                    
                    // Show the correct option
                    options?.forEach(option => {
                      const isThisCorrect = (option as HTMLElement).dataset.isCorrect === 'true';
                      if (isThisCorrect) {
                        option.classList.add('ql-quiz-option-correct');
                      }
                    });
                  }
                }
              });
            }
            
            // Add content change handler 
            const optionContent = newOptionEl.querySelector('.ql-quiz-option-content');
            if (optionContent) {
              optionContent.addEventListener('input', (e) => {
                let quillInstance: any;
                try {
                  quillInstance = (node.closest('.ql-container') as any)?.['__quill'];
                } catch (err) {}
                
                withDisabledMarkdown(quillInstance || Quill, () => {
                  if (quillInstance) {
                    const range = quillInstance.getSelection();
                    if (range) {
                      setTimeout(() => {
                        quillInstance.setSelection(range.index, range.length);
                      }, 1);
                    }
                  }
                });
              });
            }
          });
          
          // Update the question index attribute
          question.element.dataset.questionIndex = qIndex.toString();
          
          // Hide all questions initially
          question.element.style.display = 'none';
        });
        
        // Update the DOM order of questions
        // Remove all questions from container
        shuffledQuestions.forEach(q => {
          container.removeChild(q.element);
        });
        
        // Get quiz actions to preserve them
        const quizActions = container.querySelector('.ql-quiz-actions');
        if (quizActions) container.removeChild(quizActions);
        
        // Re-add quiz actions first
        if (quizActions) container.appendChild(quizActions);
        
        // Re-add questions in shuffled order
        shuffledQuestions.forEach(q => {
          container.appendChild(q.element);
        });
        
        // Display the first question
        if (shuffledQuestions.length > 0) {
          shuffledQuestions[0].element.style.display = 'block';
        }
        
        // Reset current index to 0
        container.dataset.currentIndex = '0';
        
        // Update navigation info
        updateNavInfo();
      });
    });
    
    // Add click handler for previous button
    prevButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentIdx = parseInt(container.dataset.currentIndex || '0');
      if (currentIdx > 0) {
        // Hide current question
        const currentQuestion = container.querySelector(`.ql-quiz-question[data-question-index="${currentIdx}"]`);
        if (currentQuestion) (currentQuestion as HTMLElement).style.display = 'none';
        
        // Show previous question
        const newIdx = currentIdx - 1;
        const newQuestion = container.querySelector(`.ql-quiz-question[data-question-index="${newIdx}"]`);
        if (newQuestion) (newQuestion as HTMLElement).style.display = 'block';
        
        // Update current index
        container.dataset.currentIndex = newIdx.toString();
        
        // Update navigation
        updateNavInfo();
      }
    });
    
    // Add click handler for next button
    nextButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentIdx = parseInt(container.dataset.currentIndex || '0');
      const totalQuestions = parseInt(container.dataset.totalQuestions || '1');
      
      if (currentIdx < totalQuestions - 1) {
        // Hide current question
        const currentQuestion = container.querySelector(`.ql-quiz-question[data-question-index="${currentIdx}"]`);
        if (currentQuestion) (currentQuestion as HTMLElement).style.display = 'none';
        
        // Show next question
        const newIdx = currentIdx + 1;
        const newQuestion = container.querySelector(`.ql-quiz-question[data-question-index="${newIdx}"]`);
        if (newQuestion) (newQuestion as HTMLElement).style.display = 'block';
        
        // Update current index
        container.dataset.currentIndex = newIdx.toString();
        
        // Update navigation
        updateNavInfo();
      }
    });
    
    // Add click handler for add button
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Find the closest Quill instance
      let quillInstance;
      try {
        quillInstance = (node.closest('.ql-container') as any)?.['__quill'];
      } catch (err) {
        // Ignore errors here
      }
      
      // Wrap the add operation in markdown safety
      withDisabledMarkdown(quillInstance || Quill, () => {
        // Get current total questions
        const totalQuestions = parseInt(container.dataset.totalQuestions || '1');
        const newIndex = totalQuestions;
        
        // Create new question data
        const newQuestion = {
          question: 'Enter your question here...',
          options: [
            { text: 'Option 1', isCorrect: true },
            { text: 'Option 2', isCorrect: false },
            { text: 'Option 3', isCorrect: false },
            { text: 'Option 4', isCorrect: false }
          ]
        };
        
        // Create and add the question element
        const questionElement = createQuestionElement(newQuestion, newIndex);
        container.appendChild(questionElement);
        
        // Update total questions
        container.dataset.totalQuestions = (totalQuestions + 1).toString();
        
        // Switch to the new question
        const currentIdx = parseInt(container.dataset.currentIndex || '0');
        
        // Hide current question
        const currentQuestion = container.querySelector(`.ql-quiz-question[data-question-index="${currentIdx}"]`);
        if (currentQuestion) (currentQuestion as HTMLElement).style.display = 'none';
        
        // Show new question
        questionElement.style.display = 'block';
        
        // Update current index
        container.dataset.currentIndex = newIndex.toString();
        
        // Update navigation
        updateNavInfo();
        
        // Focus the new question content
        setTimeout(() => {
          const questionContent = questionElement.querySelector('.ql-quiz-question-content');
          if (questionContent) {
            (questionContent as HTMLElement).focus();
            
            // Select all text
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(questionContent);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }, 10);
      });
    });
    
    // Add click handler for delete button
    deleteButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Find the closest Quill instance
      let quillInstance;
      try {
        quillInstance = (node.closest('.ql-container') as any)?.['__quill'];
      } catch (err) {
        // Ignore errors here
      }
      
      // Wrap the delete operation in markdown safety
      withDisabledMarkdown(quillInstance || Quill, () => {
        // Get current index and total questions
        const currentIdx = parseInt(container.dataset.currentIndex || '0');
        const totalQuestions = parseInt(container.dataset.totalQuestions || '1');
        
        // Don't allow deletion if it's the only question
        if (totalQuestions <= 1) return;
        
        // Remove the current question element
        const currentQuestion = container.querySelector(`.ql-quiz-question[data-question-index="${currentIdx}"]`);
        
        if (currentQuestion) container.removeChild(currentQuestion);
        
        // Recalculate indices for remaining questions
        const questions = container.querySelectorAll('.ql-quiz-question');
        
        // Update data-question-index attributes
        questions.forEach((question, i) => {
          (question as HTMLElement).dataset.questionIndex = i.toString();
        });
        
        // Update total questions
        container.dataset.totalQuestions = (totalQuestions - 1).toString();
        
        // Update current index or show another question if needed
        const newTotalQuestions = totalQuestions - 1;
        let newIndex = currentIdx;
        
        // If we deleted the last question, go to the previous one
        if (currentIdx >= newTotalQuestions) {
          newIndex = newTotalQuestions - 1;
        }
        
        container.dataset.currentIndex = newIndex.toString();
        
        // Show the new current question
        const newQuestion = container.querySelector(`.ql-quiz-question[data-question-index="${newIndex}"]`);
        if (newQuestion) (newQuestion as HTMLElement).style.display = 'block';
        
        // Update navigation
        updateNavInfo();
      });
    });

    // Add click handler for AI generation
    generateButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Create a modal for AI text input
      const createAIInputModal = () => {
        const modal = document.createElement('div');
        modal.className = 'quiz-ai-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        // Create modal content
        const content = document.createElement('div');
        content.style.backgroundColor = '#1e1e2e';
        content.style.padding = '25px';
        content.style.borderRadius = '10px';
        content.style.width = '600px';
        content.style.maxWidth = '90%';
        content.style.maxHeight = '80vh';
        content.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        content.style.border = '1px solid #7c3aed'; // Purple border to match flashcard
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.overflow = 'hidden';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Generate Quiz with AI';
        title.style.margin = '0 0 15px 0';
        title.style.color = '#f8f8f2';
        title.style.fontSize = '20px';
        title.style.display = 'flex';
        title.style.alignItems = 'center';
        title.style.gap = '8px';
        
        // Add AI icon to title
        const titleIcon = document.createElement('span');
        titleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
        
        title.prepend(titleIcon);
        
        // Add description
        const desc = document.createElement('p');
        desc.textContent = 'Enter text or paste content below and the AI will create multiple-choice quiz questions. The more detailed your content, the better the questions.';
        desc.style.margin = '0 0 20px 0';
        desc.style.color = '#94a3b8';
        desc.style.fontSize = '14px';
        desc.style.lineHeight = '1.5';
        
        // Add textarea for content
        const textareaContainer = document.createElement('div');
        textareaContainer.style.position = 'relative';
        textareaContainer.style.marginBottom = '20px';
        textareaContainer.style.flex = '1';
        textareaContainer.style.minHeight = '200px';
        textareaContainer.style.display = 'flex';
        
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Paste or type content here for the AI to analyze...';
        textarea.style.width = '100%';
        textarea.style.minHeight = '200px';
        textarea.style.padding = '15px';
        textarea.style.borderRadius = '6px';
        textarea.style.border = '1px solid #44475a';
        textarea.style.backgroundColor = '#282a36';
        textarea.style.color = '#f8f8f2';
        textarea.style.fontSize = '14px';
        textarea.style.lineHeight = '1.5';
        textarea.style.resize = 'vertical';
        textarea.style.flex = '1';
        
        textareaContainer.appendChild(textarea);
        
        // Add question count selection
        const optionsContainer = document.createElement('div');
        optionsContainer.style.marginBottom = '20px';
        
        const optionsLabel = document.createElement('label');
        optionsLabel.textContent = 'Number of questions to generate:';
        optionsLabel.style.display = 'block';
        optionsLabel.style.marginBottom = '10px';
        optionsLabel.style.color = '#f8f8f2';
        optionsLabel.style.fontSize = '14px';
        
        const optionsButtons = document.createElement('div');
        optionsButtons.style.display = 'flex';
        optionsButtons.style.gap = '10px';
        optionsButtons.style.flexWrap = 'wrap';
        
        let selectedCount = 5; // Default
        
        const createCountButton = (count: number) => {
          const button = document.createElement('button');
          button.textContent = count.toString();
          button.dataset.count = count.toString();
          
          const baseStyle = {
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
            border: '1px solid #44475a',
          };
          
          const activeStyle = {
            ...baseStyle,
            backgroundColor: '#7c3aed', // Purple to match flashcard
            color: 'white',
            border: '1px solid #7c3aed',
          };
          
          const inactiveStyle = {
            ...baseStyle,
            backgroundColor: '#282a36',
            color: '#f8f8f2',
          };
          
          // Apply initial styles
          Object.assign(button.style, count === selectedCount ? activeStyle : inactiveStyle);
          
          button.addEventListener('click', () => {
            // Update selected count
            selectedCount = count;
            
            // Update button styles
            Array.from(optionsButtons.children).forEach((child: Element) => {
              const btn = child as HTMLButtonElement;
              Object.assign(btn.style, 
                parseInt(btn.dataset.count || '0') === selectedCount ? activeStyle : inactiveStyle
              );
            });
          });
          
          return button;
        };
        
        // Add count options
        [3, 5, 7, 10, 15, 20].forEach(count => {
          optionsButtons.appendChild(createCountButton(count));
        });
        
        optionsContainer.appendChild(optionsLabel);
        optionsContainer.appendChild(optionsButtons);
        
        // Add buttons
        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.justifyContent = 'flex-end';
        buttons.style.gap = '12px';
        buttons.style.marginTop = '10px';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.backgroundColor = 'transparent';
        cancelButton.style.color = '#f8f8f2';
        cancelButton.style.border = '1px solid #44475a';
        cancelButton.style.borderRadius = '6px';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '14px';
        
        const generateButton = document.createElement('button');
        generateButton.textContent = 'Generate Quiz';
        generateButton.style.background = 'linear-gradient(to right, #4c1d95, #7c3aed)'; // Purple gradient for quiz
        generateButton.style.color = 'white';
        generateButton.style.border = 'none';
        generateButton.style.borderRadius = '6px';
        generateButton.style.padding = '10px 20px';
        generateButton.style.cursor = 'pointer';
        generateButton.style.fontSize = '14px';
        generateButton.style.fontWeight = '500';
        generateButton.style.display = 'flex';
        generateButton.style.alignItems = 'center';
        generateButton.style.gap = '8px';
        
        // Add spinner to generate button
        const spinner = document.createElement('span');
        spinner.className = 'ai-spinner';
        spinner.style.display = 'none';
        spinner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader"><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/></svg>`;
        spinner.style.animation = 'spin 1s linear infinite';
        
        // Add keyframes for spinner animation to document
        const style = document.createElement('style');
        style.innerHTML = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
        
        generateButton.prepend(spinner);
        
        // Add event handlers
        cancelButton.addEventListener('click', () => {
          document.body.removeChild(modal);
        });
        
        generateButton.addEventListener('click', async () => {
          const content = textarea.value.trim();
          if (!content) {
            alert('Please enter some content to generate quiz questions.');
            return;
          }
          
          // Show spinner
          spinner.style.display = 'inline-block';
          generateButton.disabled = true;
          generateButton.textContent = 'Generating...';
          generateButton.prepend(spinner);
          
          try {
            // Create custom event for AI generation
            const aiGenerateEvent = new CustomEvent('quiz-ai-generate', {
              detail: { 
                content,
                questionCount: selectedCount,
                quizNode: node
              },
              bubbles: true
            });
            
            // Dispatch event to be handled at the editor level
            node.dispatchEvent(aiGenerateEvent);
            
            // Close modal
            document.body.removeChild(modal);
          } catch (error) {
            // Hide spinner
            spinner.style.display = 'none';
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Quiz';
            
            console.error('Error generating quiz questions:', error);
            alert('An error occurred while generating quiz questions. Please try again.');
          }
        });

        // Update hover effect for generate button
        generateButton.addEventListener('mouseover', () => {
          generateButton.style.background = 'linear-gradient(to right, #5b21b6, #8b5cf6)';
          generateButton.style.boxShadow = '0 3px 6px rgba(124, 58, 237, 0.4)';
        });
        
        generateButton.addEventListener('mouseout', () => {
          generateButton.style.background = 'linear-gradient(to right, #4c1d95, #7c3aed)';
          generateButton.style.boxShadow = 'none';
        });
        
        buttons.appendChild(cancelButton);
        buttons.appendChild(generateButton);
        
        // Assemble modal
        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(textareaContainer);
        content.appendChild(optionsContainer);
        content.appendChild(buttons);
        
        modal.appendChild(content);
        return modal;
      };
      
      // Show the AI input modal
      const modal = createAIInputModal();
      document.body.appendChild(modal);
      
      // Close if clicking outside content
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
    });

    // Add click handler for PDF upload
    pdfUploadButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Create a PDF settings modal instead of immediately opening file picker
      const createPDFSettingsModal = () => {
        const modal = document.createElement('div');
        modal.className = 'pdf-settings-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        const content = document.createElement('div');
        content.style.backgroundColor = '#1e1e2e';
        content.style.padding = '25px';
        content.style.borderRadius = '10px';
        content.style.width = '450px';
        content.style.maxWidth = '90%';
        content.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        content.style.border = '1px solid #7c3aed';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Generate Quiz from PDF';
        title.style.margin = '0 0 15px 0';
        title.style.color = '#f8f8f2';
        title.style.fontSize = '20px';
        title.style.display = 'flex';
        title.style.alignItems = 'center';
        title.style.gap = '8px';
        
        // Add PDF icon to title
        const titleIcon = document.createElement('span');
        titleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 12h8"/><path d="M8 16h8"/><path d="M8 20h8"/></svg>`;
        
        title.prepend(titleIcon);
        
        // Add description
        const desc = document.createElement('p');
        desc.textContent = 'Select a PDF file and choose how many quiz questions to generate from its content.';
        desc.style.margin = '0 0 20px 0';
        desc.style.color = '#94a3b8';
        desc.style.fontSize = '14px';
        desc.style.lineHeight = '1.5';
        
        // Question count selection
        const countContainer = document.createElement('div');
        countContainer.style.marginBottom = '20px';
        
        const countLabel = document.createElement('label');
        countLabel.textContent = 'Number of questions to generate:';
        countLabel.style.display = 'block';
        countLabel.style.marginBottom = '10px';
        countLabel.style.color = '#f8f8f2';
        countLabel.style.fontSize = '14px';
        
        // Create slider with value display
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        sliderContainer.style.alignItems = 'center';
        sliderContainer.style.gap = '15px';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '3';
        slider.max = '20';
        slider.value = '5'; // Default to 5 questions
        slider.style.flex = '1';
        slider.style.height = '8px';
        slider.style.appearance = 'none';
        slider.style.backgroundColor = '#44475a';
        slider.style.borderRadius = '4px';
        slider.style.outline = 'none';
        
        // Add thumb styling
        const style = document.createElement('style');
        style.innerHTML = `
          input[type=range]::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #7c3aed;
            cursor: pointer;
          }
          input[type=range]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #7c3aed;
            cursor: pointer;
            border: none;
          }
        `;
        document.head.appendChild(style);
        
        const countValue = document.createElement('div');
        countValue.textContent = '5';
        countValue.style.width = '30px';
        countValue.style.fontWeight = 'bold';
        countValue.style.color = '#f8f8f2';
        countValue.style.fontSize = '18px';
        countValue.style.textAlign = 'center';
        
        slider.addEventListener('input', () => {
          countValue.textContent = slider.value;
        });
        
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(countValue);
        
        countContainer.appendChild(countLabel);
        countContainer.appendChild(sliderContainer);
        
        // Add buttons
        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.justifyContent = 'flex-end';
        buttons.style.gap = '12px';
        buttons.style.marginTop = '20px';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.backgroundColor = 'transparent';
        cancelButton.style.color = '#f8f8f2';
        cancelButton.style.border = '1px solid #44475a';
        cancelButton.style.borderRadius = '6px';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.style.fontSize = '14px';
        
        const selectButton = document.createElement('button');
        selectButton.textContent = 'Select PDF';
        selectButton.style.background = 'linear-gradient(to right, #5b21b6, #7c3aed)';
        selectButton.style.color = 'white';
        selectButton.style.border = 'none';
        selectButton.style.borderRadius = '6px';
        selectButton.style.padding = '10px 20px';
        selectButton.style.cursor = 'pointer';
        selectButton.style.fontSize = '14px';
        selectButton.style.fontWeight = '500';
        
        // Add hover effects
        selectButton.addEventListener('mouseover', () => {
          selectButton.style.background = 'linear-gradient(to right, #6d28d9, #8b5cf6)';
        });
        
        selectButton.addEventListener('mouseout', () => {
          selectButton.style.background = 'linear-gradient(to right, #5b21b6, #7c3aed)';
        });
        
        cancelButton.addEventListener('mouseover', () => {
          cancelButton.style.backgroundColor = '#282a36';
        });
        
        cancelButton.addEventListener('mouseout', () => {
          cancelButton.style.backgroundColor = 'transparent';
        });
        
        // Add event handlers
        cancelButton.addEventListener('click', () => {
          document.body.removeChild(modal);
        });
        
        selectButton.addEventListener('click', () => {
          // Store the selected question count 
          const questionCount = parseInt(slider.value);
          
          // Close settings modal
          document.body.removeChild(modal);
          
          // Create a file input element
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'application/pdf';
          fileInput.style.display = 'none';
          document.body.appendChild(fileInput);
          
          // Handle file selection
          fileInput.addEventListener('change', async () => {
            const file = fileInput.files?.[0];
            if (!file) {
              document.body.removeChild(fileInput);
              return;
            }
            
            // Show loading overlay
            const overlay = createLoadingOverlay();
            document.body.appendChild(overlay);
            
            try {
              // Create custom event for PDF processing
              const pdfEvent = new CustomEvent('quiz-pdf-upload', {
                detail: { 
                  file,
                  quizNode: node,
                  questionCount // Pass the selected question count
                },
                bubbles: true
              });
              
              // Dispatch event to be handled at the editor level
              node.dispatchEvent(pdfEvent);
              
            } catch (error) {
              console.error('Error processing PDF:', error);
              
              // Show error message
              const errorModal = document.createElement('div');
              errorModal.style.position = 'fixed';
              errorModal.style.top = '20px';
              errorModal.style.left = '50%';
              errorModal.style.transform = 'translateX(-50%)';
              errorModal.style.backgroundColor = '#ff5555';
              errorModal.style.color = 'white';
              errorModal.style.padding = '10px 20px';
              errorModal.style.borderRadius = '5px';
              errorModal.style.zIndex = '1001';
              errorModal.textContent = 'Error processing PDF. Please try again.';
              
              document.body.appendChild(errorModal);
              
              // Remove error message after 3 seconds
              setTimeout(() => {
                if (document.body.contains(errorModal)) {
                  document.body.removeChild(errorModal);
                }
              }, 3000);
            } finally {
              // Remove loading overlay and file input
              document.body.removeChild(overlay);
              document.body.removeChild(fileInput);
            }
          });
          
          // Trigger file selection
          fileInput.click();
        });
        
        buttons.appendChild(cancelButton);
        buttons.appendChild(selectButton);
        
        // Assemble modal content
        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(countContainer);
        content.appendChild(buttons);
        
        modal.appendChild(content);
        return modal;
      };
      
      // Create a loading overlay
      const createLoadingOverlay = () => {
        const overlay = document.createElement('div');
        overlay.className = 'pdf-loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';
        
        const content = document.createElement('div');
        content.style.backgroundColor = '#1e1e2e';
        content.style.padding = '25px';
        content.style.borderRadius = '10px';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.alignItems = 'center';
        content.style.gap = '15px';
        
        const spinner = document.createElement('div');
        spinner.className = 'pdf-spinner';
        spinner.style.width = '40px';
        spinner.style.height = '40px';
        spinner.style.border = '4px solid rgba(255, 255, 255, 0.1)';
        spinner.style.borderTopColor = '#7c3aed';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'pdf-spin 1s linear infinite';
        
        const message = document.createElement('div');
        message.textContent = 'Processing PDF...';
        message.style.color = 'white';
        message.style.fontSize = '16px';
        
        // Add keyframes for spinner animation
        const style = document.createElement('style');
        style.innerHTML = `
          @keyframes pdf-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
        
        content.appendChild(spinner);
        content.appendChild(message);
        overlay.appendChild(content);
        
        return overlay;
      };
      
      // Show the settings modal
      const modal = createPDFSettingsModal();
      document.body.appendChild(modal);
      
      // Close if clicking outside content
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
    });

    // Assemble navigation controls
    navControls.appendChild(prevButton);
    navControls.appendChild(navInfo);
    navControls.appendChild(nextButton);
    navControls.appendChild(resetButton);
    
    // Assemble the component
    node.appendChild(container);
    
    // Add action buttons to proper place in DOM hierarchy
    container.insertBefore(quizActions, container.firstChild);
    
    node.appendChild(navControls);
    
    // Listen for update events to handle AI-generated content
    node.addEventListener('quiz-update', (e: any) => {
      // Find the closest Quill instance
      let quillInstance;
      try {
        quillInstance = (node.closest('.ql-container') as any)?.['__quill'];
      } catch (err) {
        // Ignore errors here
      }
      
      // Wrap the update operation in markdown safety
      withDisabledMarkdown(quillInstance || Quill, () => {
        const newValue = e.detail;
        
        // Update questions with new content
        if (newValue && newValue.questions && Array.isArray(newValue.questions)) {
          // Preserve important elements before clearing the container
          const quizActions = container.querySelector('.ql-quiz-actions');
          const titleSection = container.querySelector('.ql-quiz-title-section');
          
          // Store all children we want to preserve
          const elementsToPreserve = [];
          if (titleSection) elementsToPreserve.push(titleSection);
          if (quizActions) elementsToPreserve.push(quizActions);
          
          // Remove preserved elements from container so they don't get cleared
          elementsToPreserve.forEach(el => container.removeChild(el));
          
          // Clear existing questions from the DOM
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          
          // Re-add preserved elements in correct order
          if (titleSection) {
            container.appendChild(titleSection);
          } else {
            // Recreate title section if it's missing
            const newTitleSection = document.createElement('div');
            newTitleSection.className = 'ql-quiz-title-section';
            
            const titleText = document.createElement('h3');
            titleText.className = 'ql-quiz-title-text';
            titleText.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-checks"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg> QUIZ`;
            
            newTitleSection.appendChild(titleText);
            container.appendChild(newTitleSection);
          }
          
          if (quizActions) {
            container.appendChild(quizActions);
          } else {
            // Recreate actions if they're missing
            const newQuizActions = document.createElement('div');
            newQuizActions.className = 'ql-quiz-actions';
            
            const generateButton = document.createElement('button');
            generateButton.className = 'ql-quiz-nav-btn ql-quiz-generate';
            generateButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
            generateButton.title = 'Generate quiz with AI';
            
            const pdfUploadButton = document.createElement('button');
            pdfUploadButton.className = 'ql-quiz-nav-btn ql-quiz-upload-pdf';
            pdfUploadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-type-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 12h8"/><path d="M8 16h8"/><path d="M8 20h8"/></svg>`;
            pdfUploadButton.title = 'Create quiz from PDF';
            
            const addButton = document.createElement('button');
            addButton.className = 'ql-quiz-nav-btn ql-quiz-add';
            addButton.innerHTML = '+';
            addButton.title = 'Add new question';
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'ql-quiz-nav-btn ql-quiz-delete';
            deleteButton.innerHTML = '&times;';
            deleteButton.title = 'Delete current question';
            
            // Set delete button state based on question count
            deleteButton.disabled = newValue.questions.length <= 1;
            deleteButton.style.display = newValue.questions.length <= 1 ? 'none' : 'flex';
            
            // Add the buttons to the actions div
            newQuizActions.appendChild(pdfUploadButton);
            newQuizActions.appendChild(generateButton);
            newQuizActions.appendChild(addButton);
            newQuizActions.appendChild(deleteButton);
            
            // Add the actions to the container
            container.appendChild(newQuizActions);
          }
          
          // Update the questions array
          const updatedQuestions = newValue.questions;
          
          // Reset current index
          container.dataset.currentIndex = '0';
          container.dataset.totalQuestions = updatedQuestions.length.toString();
          
          // Create new question elements with the updated content
          updatedQuestions.forEach((question: any, index: number) => {
            const questionElement = createQuestionElement(question, index);
            container.appendChild(questionElement);
          });
          
          // Update the navigation info
          navInfo.textContent = `Question 1 of ${updatedQuestions.length}`;
          
          // Update button states
          prevButton.disabled = true;
          nextButton.disabled = updatedQuestions.length <= 1;
          
          // Update delete button visibility
          deleteButton.disabled = updatedQuestions.length <= 1;
          deleteButton.style.display = updatedQuestions.length <= 1 ? 'none' : 'flex';
        }
      });
    });
    
    return node;
  },
  
  value(node: HTMLElement) {
    const container = node.querySelector('.ql-quiz-container') as HTMLElement;
    const currentIndex = parseInt(container?.dataset.currentIndex || '0');
    
    // Collect all questions data
    const questions: { question: string; options: { text: string; isCorrect: boolean }[] }[] = [];
    
    // Get all question elements
    const questionElements = node.querySelectorAll('.ql-quiz-question');
    
    questionElements.forEach((questionElement) => {
      const questionContent = questionElement.querySelector('.ql-quiz-question-content');
      const options: { text: string; isCorrect: boolean }[] = [];
      
      // Get all option elements for this question
      const optionElements = questionElement.querySelectorAll('.ql-quiz-option');
      
      optionElements.forEach((optionElement) => {
        const optionContent = optionElement.querySelector('.ql-quiz-option-content');
        const isCorrect = (optionElement as HTMLElement).dataset.isCorrect === 'true';
        
        options.push({
          text: optionContent ? optionContent.innerHTML : '',
          isCorrect: isCorrect
        });
      });
      
      questions.push({
        question: questionContent ? questionContent.innerHTML : '',
        options
      });
    });
    
    return {
      questions,
      currentIndex
    };
  }
};

// Export initialization function
export function registerQuizBlot(quillInstance: any) {
  Quill = quillInstance;
  
  const BlockEmbed = Quill.import('blots/block/embed');
  
  // Create a class that extends BlockEmbed
  class QuizBlotClass extends BlockEmbed {
    static create(value: { 
      questions?: { 
        question: string; 
        options: { text: string; isCorrect: boolean }[] 
      }[]; 
      currentIndex?: number;
    }) {
      return QuizBlot.create(value);
    }
    
    static value(node: HTMLElement) {
      return QuizBlot.value(node);
    }
    
    // Override attach method to set up MutationObserver for better handling
    attach() {
      super.attach();
      const quizNode = this.domNode;
      
      // Create a MutationObserver to temporarily disable markdown when DOM changes
      const observer = new MutationObserver((mutations) => {
        // Find the closest Quill instance
        let quillInstance;
        try {
          quillInstance = (quizNode.closest('.ql-container') as any)?.['__quill'];
        } catch (err) {
          // Ignore errors
        }
        
        if (!quillInstance) return;
        
        // Get the markdown module
        const markdownModule = quillInstance.getModule('markdown');
        if (!markdownModule) return;
        
        // Store original enabled state
        const wasEnabled = markdownModule.options?.enabled;
        
        try {
          // Disable markdown processing during mutations
          if (markdownModule.options) {
            markdownModule.options.enabled = false;
          }
          
          // Clear any pending matches
          if (markdownModule.matches) {
            markdownModule.matches = [];
          }
        } catch (error) {
          console.error('Error handling markdown during mutations:', error);
        }
        
        // Schedule restoration of markdown after mutations are processed
        setTimeout(() => {
          try {
            // Re-enable markdown if it was enabled before
            if (markdownModule.options && wasEnabled !== undefined) {
              markdownModule.options.enabled = wasEnabled;
            }
          } catch (error) {
            console.error('Error restoring markdown state:', error);
          }
        }, 0);
      });
      
      // Start observing the quiz node for all changes
      observer.observe(quizNode, { 
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true 
      });
      
      // Store the observer on the node to clean up later
      (quizNode as any)._mutationObserver = observer;
    }
    
    // Override detach to clean up MutationObserver
    detach() {
      // Disconnect the observer if it exists
      if ((this.domNode as any)._mutationObserver) {
        (this.domNode as any)._mutationObserver.disconnect();
        delete (this.domNode as any)._mutationObserver;
      }
      
      super.detach();
    }
  }
  
  // Set properties on the class
  QuizBlotClass.blotName = QuizBlot.blotName;
  QuizBlotClass.tagName = QuizBlot.tagName;
  QuizBlotClass.className = QuizBlot.className;
  
  // Register with Quill
  Quill.register(QuizBlotClass);
}