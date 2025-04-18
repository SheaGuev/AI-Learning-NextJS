// Quiz format for Quill - Moved to blocks directory
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
    
    // Rest of the implementation remains the same...
    // ...existing code...

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