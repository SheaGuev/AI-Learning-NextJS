// Flashcard format for Quill
let Quill: any;

interface FlashcardBlotStatic {
  blotName: string;
  tagName: string;
  className: string;
  create: (value: any) => HTMLElement;
  value: (node: HTMLElement) => { cards: { front: string; back: string }[]; currentIndex: number; isFlipped: boolean };
}

// Utility function to temporarily disable markdown processing
const withDisabledMarkdown = (quill: any, callback: () => void) => {
  try {
    // Find the root Quill instance if we have a blot
    const quillInstance = quill.quill || quill;
    
    // Temporarily disable markdown module to prevent error during update
    const markdownModule = quillInstance.getModule && quillInstance.getModule('markdown');
    const originalProcessorEnabled = markdownModule?.options?.enabled;
    
    // Disable markdown processor if it exists
    if (markdownModule && markdownModule.options) {
      markdownModule.options.enabled = false;
    }
    
    // Execute the callback
    callback();
    
    // Re-enable markdown processor if it was enabled before
    if (markdownModule && markdownModule.options && originalProcessorEnabled !== undefined) {
      markdownModule.options.enabled = originalProcessorEnabled;
    }
  } catch (error) {
    // If something goes wrong, still execute the callback
    callback();
    console.error('Error handling markdown module:', error);
  }
};

// Create a flashcard blot
export const FlashcardBlot: FlashcardBlotStatic = {
  blotName: 'flashcard',
  tagName: 'div',
  className: 'ql-flashcard',
  
  create(value: { cards?: { front: string; back: string }[]; currentIndex?: number; isFlipped?: boolean } = {}) {
    const node = document.createElement('div');
    node.setAttribute('class', 'ql-flashcard');
    node.setAttribute('contenteditable', 'false');
    
    // Create title section with "FLASHCARD" heading - now directly inside node
    const titleSection = document.createElement('div');
    titleSection.className = 'ql-flashcard-title-section';
    
    const titleText = document.createElement('h3');
    titleText.className = 'ql-flashcard-title-text';
    titleText.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-stack"><path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><rect width="8" height="8" x="14" y="14" rx="2"></rect></svg> FLASHCARD`;
    
    // Add title to node (outside container)
    titleSection.appendChild(titleText);
    node.appendChild(titleSection);
    
    // Create top-right action buttons (add/delete) - now directly inside node
    const cardActions = document.createElement('div');
    cardActions.className = 'ql-flashcard-card-actions';
    
    const addButton = document.createElement('button');
    addButton.className = 'ql-flashcard-nav-btn ql-flashcard-add';
    addButton.innerHTML = '+';
    addButton.title = 'Add new card';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'ql-flashcard-nav-btn ql-flashcard-delete';
    deleteButton.innerHTML = '&times;';
    deleteButton.title = 'Delete current card';
    
    // Add AI generate button
    const generateButton = document.createElement('button');
    generateButton.className = 'ql-flashcard-nav-btn ql-flashcard-generate';
    generateButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
    generateButton.title = 'Generate flashcards with AI';

    // Add PDF upload button
    const pdfUploadButton = document.createElement('button');
    pdfUploadButton.className = 'ql-flashcard-nav-btn ql-flashcard-upload-pdf';
    pdfUploadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-type-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 12h8"/><path d="M8 16h8"/><path d="M8 20h8"/></svg>`;
    pdfUploadButton.title = 'Create flashcards from PDF';
    
    // Add buttons to card actions
    cardActions.appendChild(pdfUploadButton);
    cardActions.appendChild(generateButton);
    cardActions.appendChild(addButton);
    cardActions.appendChild(deleteButton);
    
    // Add actions to node (outside container)
    node.appendChild(cardActions);
    
    // Create flashcard container with flip animation capability
    const container = document.createElement('div');
    container.className = 'ql-flashcard-container';
    
    // Use provided cards or create a default one
    const cards = value.cards || [{ 
      front: 'Enter your question here...', 
      back: 'Write the answer here...' 
    }];
    
    // Handle the case where cards might be undefined
    const cardsLength = cards?.length || 1;
    
    deleteButton.disabled = cardsLength <= 1;
    deleteButton.style.display = cardsLength <= 1 ? 'none' : 'flex';
    
    // Set current index
    const currentIndex = value.currentIndex || 0;
    container.dataset.currentIndex = currentIndex.toString();
    container.dataset.totalCards = cards.length.toString();
    
    // Create card elements for each card in the stack
    cards.forEach((card, index) => {
      // Front side
      const front = document.createElement('div');
      front.className = 'ql-flashcard-front';
      front.dataset.cardIndex = index.toString();
      front.style.display = index === currentIndex ? 'block' : 'none';
      
      const frontLabel = document.createElement('div');
      frontLabel.className = 'ql-flashcard-label';
      frontLabel.textContent = 'FRONT';
      
      const frontContent = document.createElement('div');
      frontContent.className = 'ql-flashcard-content';
      frontContent.setAttribute('contenteditable', 'true');
      frontContent.innerHTML = card.front || 'Enter your question here...';
      
      // Add keyboard event handlers for front content
      frontContent.addEventListener('keydown', (e) => {
        // Prevent Enter key from creating new blocks outside of flashcard
        if (e.key === 'Enter' && !e.shiftKey) {
          e.stopPropagation(); // Don't let Quill handle this event
          
          // Insert a <br> at cursor position instead
          document.execCommand('insertLineBreak');
          e.preventDefault(); // Prevent default behavior
        }
        
        // Always prevent Delete/Backspace from bubbling up to Quill to avoid component deletion
        if (e.key === 'Delete' || e.key === 'Backspace') {
          // Still allow normal text deletion within the content
          if (frontContent.innerText.length === 0 || 
              window.getSelection()?.toString() === frontContent.innerText) {
            // If content would be emptied, prevent default behavior too
            e.preventDefault();
          }
          // Always stop propagation to prevent Quill from handling the event
          e.stopPropagation();
        }
      });
      
      front.appendChild(frontLabel);
      front.appendChild(frontContent);
      
      // Back side
      const back = document.createElement('div');
      back.className = 'ql-flashcard-back';
      back.dataset.cardIndex = index.toString();
      back.style.display = index === currentIndex ? 'block' : 'none';
      
      const backLabel = document.createElement('div');
      backLabel.className = 'ql-flashcard-label';
      backLabel.textContent = 'BACK';
      
      const backContent = document.createElement('div');
      backContent.className = 'ql-flashcard-content';
      backContent.setAttribute('contenteditable', 'true');
      backContent.innerHTML = card.back || 'Write the answer here...';
      
      // Add keyboard event handlers for back content
      backContent.addEventListener('keydown', (e) => {
        // Prevent Enter key from creating new blocks outside of flashcard
        if (e.key === 'Enter' && !e.shiftKey) {
          e.stopPropagation(); // Don't let Quill handle this event
          
          // Insert a <br> at cursor position instead
          document.execCommand('insertLineBreak');
          e.preventDefault(); // Prevent default behavior
        }
        
        // Always prevent Delete/Backspace from bubbling up to Quill to avoid component deletion
        if (e.key === 'Delete' || e.key === 'Backspace') {
          // Still allow normal text deletion within the content
          if (backContent.innerText.length === 0 || 
              window.getSelection()?.toString() === backContent.innerText) {
            // If content would be emptied, prevent default behavior too
            e.preventDefault();
          }
          // Always stop propagation to prevent Quill from handling the event
          e.stopPropagation();
        }
      });
      
      back.appendChild(backLabel);
      back.appendChild(backContent);
      
      // Add elements to container
      container.appendChild(front);
      container.appendChild(back);
    });
    
    // Create navigation controls
    const navControls = document.createElement('div');
    navControls.className = 'ql-flashcard-controls';
    
    const navInfo = document.createElement('div');
    navInfo.className = 'ql-flashcard-info';
    navInfo.textContent = `Card ${currentIndex + 1} of ${cards.length}`;
    
    const prevButton = document.createElement('button');
    prevButton.className = 'ql-flashcard-nav-btn ql-flashcard-prev';
    prevButton.innerHTML = '&larr;';
    prevButton.title = 'Previous card';
    prevButton.disabled = currentIndex === 0;
    
    const nextButton = document.createElement('button');
    nextButton.className = 'ql-flashcard-nav-btn ql-flashcard-next';
    nextButton.innerHTML = '&rarr;';
    nextButton.title = 'Next card';
    nextButton.disabled = currentIndex === cards.length - 1;
    
    // Flip button
    const flipButton = document.createElement('button');
    flipButton.className = 'ql-flashcard-flip-btn';
    flipButton.textContent = 'Flip';
    
    // Initially set the flipped state
    if (value.isFlipped) {
      container.classList.add('flipped');
    }
    
    // Update navigation info and button states
    const updateNavInfo = () => {
      const currentIdx = parseInt(container.dataset.currentIndex || '0');
      const totalCards = parseInt(container.dataset.totalCards || '1');
      navInfo.textContent = `Card ${currentIdx + 1} of ${totalCards}`;
      prevButton.disabled = currentIdx === 0;
      nextButton.disabled = currentIdx === totalCards - 1;
      
      // Update delete button visibility based on card count
      deleteButton.disabled = totalCards <= 1;
      deleteButton.style.display = totalCards <= 1 ? 'none' : 'flex';
    };
    
    // Add click handler to flip
    flipButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      container.classList.toggle('flipped');
      
      // Dispatch a custom event for state tracking
      const flipEvent = new CustomEvent('flashcard-flip', {
        detail: { 
          isFlipped: container.classList.contains('flipped'), 
          node 
        }
      });
      document.dispatchEvent(flipEvent);
    });
    
    // Add click handler for previous button
    prevButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentIdx = parseInt(container.dataset.currentIndex || '0');
      if (currentIdx > 0) {
        // Hide current card
        const currentFront = container.querySelector(`.ql-flashcard-front[data-card-index="${currentIdx}"]`);
        const currentBack = container.querySelector(`.ql-flashcard-back[data-card-index="${currentIdx}"]`);
        if (currentFront) (currentFront as HTMLElement).style.display = 'none';
        if (currentBack) (currentBack as HTMLElement).style.display = 'none';
        
        // Show previous card
        const newIdx = currentIdx - 1;
        const newFront = container.querySelector(`.ql-flashcard-front[data-card-index="${newIdx}"]`);
        const newBack = container.querySelector(`.ql-flashcard-back[data-card-index="${newIdx}"]`);
        if (newFront) (newFront as HTMLElement).style.display = 'block';
        if (newBack) (newBack as HTMLElement).style.display = 'block';
        
        // Update current index
        container.dataset.currentIndex = newIdx.toString();
        
        // Reset flip state when changing cards
        container.classList.remove('flipped');
        
        // Update navigation
        updateNavInfo();
      }
    });
    
    // Add click handler for next button
    nextButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currentIdx = parseInt(container.dataset.currentIndex || '0');
      const totalCards = parseInt(container.dataset.totalCards || '1');
      
      if (currentIdx < totalCards - 1) {
        // Hide current card
        const currentFront = container.querySelector(`.ql-flashcard-front[data-card-index="${currentIdx}"]`);
        const currentBack = container.querySelector(`.ql-flashcard-back[data-card-index="${currentIdx}"]`);
        if (currentFront) (currentFront as HTMLElement).style.display = 'none';
        if (currentBack) (currentBack as HTMLElement).style.display = 'none';
        
        // Show next card
        const newIdx = currentIdx + 1;
        const newFront = container.querySelector(`.ql-flashcard-front[data-card-index="${newIdx}"]`);
        const newBack = container.querySelector(`.ql-flashcard-back[data-card-index="${newIdx}"]`);
        if (newFront) (newFront as HTMLElement).style.display = 'block';
        if (newBack) (newBack as HTMLElement).style.display = 'block';
        
        // Update current index
        container.dataset.currentIndex = newIdx.toString();
        
        // Reset flip state when changing cards
        container.classList.remove('flipped');
        
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
        // Get current total cards
        const totalCards = parseInt(container.dataset.totalCards || '1');
        const newIndex = totalCards;
        
        // Create new card
        // Front side
        const front = document.createElement('div');
        front.className = 'ql-flashcard-front';
        front.dataset.cardIndex = newIndex.toString();
        front.style.display = 'none'; // New card is hidden initially
        
        const frontLabel = document.createElement('div');
        frontLabel.className = 'ql-flashcard-label';
        frontLabel.textContent = 'FRONT';
        
        const frontContent = document.createElement('div');
        frontContent.className = 'ql-flashcard-content';
        frontContent.setAttribute('contenteditable', 'true');
        frontContent.innerHTML = 'Enter your question here...';
        
        // Add keyboard event handlers for new front content
        frontContent.addEventListener('keydown', (e) => {
          // Prevent Enter key from creating new blocks outside of flashcard
          if (e.key === 'Enter' && !e.shiftKey) {
            e.stopPropagation();
            document.execCommand('insertLineBreak');
            e.preventDefault();
          }
          
          // Always prevent Delete/Backspace from bubbling up to Quill to avoid component deletion
          if (e.key === 'Delete' || e.key === 'Backspace') {
            // Still allow normal text deletion within the content
            if (frontContent.innerText.length === 0 || 
                window.getSelection()?.toString() === frontContent.innerText) {
              // If content would be emptied, prevent default behavior too
              e.preventDefault();
            }
            // Always stop propagation to prevent Quill from handling the event
            e.stopPropagation();
          }
        });
        
        front.appendChild(frontLabel);
        front.appendChild(frontContent);
        
        // Back side
        const back = document.createElement('div');
        back.className = 'ql-flashcard-back';
        back.dataset.cardIndex = newIndex.toString();
        back.style.display = 'none'; // New card is hidden initially
        
        const backLabel = document.createElement('div');
        backLabel.className = 'ql-flashcard-label';
        backLabel.textContent = 'BACK';
        
        const backContent = document.createElement('div');
        backContent.className = 'ql-flashcard-content';
        backContent.setAttribute('contenteditable', 'true');
        backContent.innerHTML = 'Write the answer here...';
        
        // Add keyboard event handlers for new back content
        backContent.addEventListener('keydown', (e) => {
          // Prevent Enter key from creating new blocks outside of flashcard
          if (e.key === 'Enter' && !e.shiftKey) {
            e.stopPropagation();
            document.execCommand('insertLineBreak');
            e.preventDefault();
          }
          
          // Always prevent Delete/Backspace from bubbling up to Quill to avoid component deletion
          if (e.key === 'Delete' || e.key === 'Backspace') {
            // Still allow normal text deletion within the content
            if (backContent.innerText.length === 0 || 
                window.getSelection()?.toString() === backContent.innerText) {
              // If content would be emptied, prevent default behavior too
              e.preventDefault();
            }
            // Always stop propagation to prevent Quill from handling the event
            e.stopPropagation();
          }
        });
        
        back.appendChild(backLabel);
        back.appendChild(backContent);
        
        // Add new card to container
        container.appendChild(front);
        container.appendChild(back);
        
        // Update total cards
        container.dataset.totalCards = (totalCards + 1).toString();
        
        // Switch to the new card
        const currentIdx = parseInt(container.dataset.currentIndex || '0');
        
        // Hide current card
        const currentFront = container.querySelector(`.ql-flashcard-front[data-card-index="${currentIdx}"]`);
        const currentBack = container.querySelector(`.ql-flashcard-back[data-card-index="${currentIdx}"]`);
        if (currentFront) (currentFront as HTMLElement).style.display = 'none';
        if (currentBack) (currentBack as HTMLElement).style.display = 'none';
        
        // Show new card
        (front as HTMLElement).style.display = 'block';
        (back as HTMLElement).style.display = 'block';
        
        // Update current index
        container.dataset.currentIndex = newIndex.toString();
        
        // Reset flip state when adding cards
        container.classList.remove('flipped');
        
        // Update navigation
        updateNavInfo();
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
        // Get current index and total cards
        const currentIdx = parseInt(container.dataset.currentIndex || '0');
        const totalCards = parseInt(container.dataset.totalCards || '1');
        
        // Don't allow deletion if it's the only card
        if (totalCards <= 1) return;
        
        // Remove the current card's front and back elements
        const currentFront = container.querySelector(`.ql-flashcard-front[data-card-index="${currentIdx}"]`);
        const currentBack = container.querySelector(`.ql-flashcard-back[data-card-index="${currentIdx}"]`);
        
        if (currentFront) container.removeChild(currentFront);
        if (currentBack) container.removeChild(currentBack);
        
        // Recalculate indices for remaining cards
        const fronts = container.querySelectorAll('.ql-flashcard-front');
        const backs = container.querySelectorAll('.ql-flashcard-back');
        
        // Update data-card-index attributes
        fronts.forEach((front, i) => {
          (front as HTMLElement).dataset.cardIndex = i.toString();
        });
        
        backs.forEach((back, i) => {
          (back as HTMLElement).dataset.cardIndex = i.toString();
        });
        
        // Update total cards
        container.dataset.totalCards = (totalCards - 1).toString();
        
        // Update current index or show another card if needed
        const newTotalCards = totalCards - 1;
        let newIndex = currentIdx;
        
        // If we deleted the last card, go to the previous one
        if (currentIdx >= newTotalCards) {
          newIndex = newTotalCards - 1;
        }
        
        container.dataset.currentIndex = newIndex.toString();
        
        // Show the new current card
        const newFront = container.querySelector(`.ql-flashcard-front[data-card-index="${newIndex}"]`);
        const newBack = container.querySelector(`.ql-flashcard-back[data-card-index="${newIndex}"]`);
        if (newFront) (newFront as HTMLElement).style.display = 'block';
        if (newBack) (newBack as HTMLElement).style.display = 'block';
        
        // Reset flip state when changing cards
        container.classList.remove('flipped');
        
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
        modal.className = 'flashcard-ai-modal';
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
        content.style.border = '1px solid #6d28d9';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.overflow = 'hidden';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Generate Flashcards with AI';
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
        desc.textContent = 'Enter text or paste content below and the AI will create question-answer flashcards for you. The more detailed your content, the better the cards.';
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
        
        // Add card count selection
        const optionsContainer = document.createElement('div');
        optionsContainer.style.marginBottom = '20px';
        
        const optionsLabel = document.createElement('label');
        optionsLabel.textContent = 'Number of flashcards to generate:';
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
            backgroundColor: '#6d28d9',
            color: 'white',
            border: '1px solid #6d28d9',
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
        generateButton.textContent = 'Generate Cards';
        generateButton.style.background = 'linear-gradient(to right, #4c1d95, #6d28d9)';
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
            alert('Please enter some content to generate flashcards.');
            return;
          }
          
          // Show spinner
          spinner.style.display = 'inline-block';
          generateButton.disabled = true;
          generateButton.textContent = 'Generating...';
          generateButton.prepend(spinner);
          
          try {
          // Create custom event for AI generation
          const aiGenerateEvent = new CustomEvent('flashcard-ai-generate', {
            detail: { 
              content,
                cardCount: selectedCount,
              flashcardNode: node
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
            generateButton.textContent = 'Generate Cards';
            
            console.error('Error generating flashcards:', error);
            alert('An error occurred while generating flashcards. Please try again.');
          }
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
        content.style.border = '1px solid #6d28d9';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Generate Flashcards from PDF';
        title.style.margin = '0 0 15px 0';
        title.style.color = '#f8f8f2';
        title.style.fontSize = '20px';
        title.style.display = 'flex';
        title.style.alignItems = 'center';
        title.style.gap = '8px';
        
        // Add PDF icon to title
        const titleIcon = document.createElement('span');
        titleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 12h8"/><path d="M8 16h8"/><path d="M8 20h8"/></svg>`;
        
        title.prepend(titleIcon);
        
        // Add description
        const desc = document.createElement('p');
        desc.textContent = 'Select a PDF file and choose how many flashcards to generate from its content.';
        desc.style.margin = '0 0 20px 0';
        desc.style.color = '#94a3b8';
        desc.style.fontSize = '14px';
        desc.style.lineHeight = '1.5';
        
        // Card count selection
        const countContainer = document.createElement('div');
        countContainer.style.marginBottom = '20px';
        
        const countLabel = document.createElement('label');
        countLabel.textContent = 'Number of flashcards to generate:';
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
        slider.value = '10'; // Default to 10 cards
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
            background: #6d28d9;
            cursor: pointer;
          }
          input[type=range]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #6d28d9;
            cursor: pointer;
            border: none;
          }
        `;
        document.head.appendChild(style);
        
        const countValue = document.createElement('div');
        countValue.textContent = '10';
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
        selectButton.style.background = 'linear-gradient(to right, #4c1d95, #6d28d9)';
        selectButton.style.color = 'white';
        selectButton.style.border = 'none';
        selectButton.style.borderRadius = '6px';
        selectButton.style.padding = '10px 20px';
        selectButton.style.cursor = 'pointer';
        selectButton.style.fontSize = '14px';
        selectButton.style.fontWeight = '500';
        
        // Add hover effects
        selectButton.addEventListener('mouseover', () => {
          selectButton.style.background = 'linear-gradient(to right, #5b21b6, #7c3aed)';
        });
        
        selectButton.addEventListener('mouseout', () => {
          selectButton.style.background = 'linear-gradient(to right, #4c1d95, #6d28d9)';
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
          // Store the selected card count 
          const cardCount = parseInt(slider.value);
          
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
              const pdfEvent = new CustomEvent('flashcard-pdf-upload', {
                detail: { 
                  file,
                  flashcardNode: node,
                  cardCount // Pass the selected card count
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
    
    // Container for action buttons (flip)
    const actionControls = document.createElement('div');
    actionControls.className = 'ql-flashcard-actions';
    actionControls.appendChild(flipButton);
    
    // Assemble the component
    node.appendChild(container);
    node.appendChild(navControls);
    node.appendChild(actionControls);
    
    // Listen for update events to handle AI-generated content
    node.addEventListener('flashcard-update', (e: any) => {
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
        
        // Update cards with new content
        if (newValue && newValue.cards && Array.isArray(newValue.cards)) {
          // Store original card count for comparison
          const originalCardCount = cards.length;
          
          // Preserve the card actions
          const cardActions = node.querySelector('.ql-flashcard-card-actions');
          const titleSection = node.querySelector('.ql-flashcard-title-section');
          
          // Clear existing cards from the container
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          
          // Update the internal cards array
          const updatedCards = newValue.cards;
          
          // Reset current index
          container.dataset.currentIndex = '0';
          container.dataset.totalCards = updatedCards.length.toString();
          
          // Re-add the card actions to the node if it exists
          if (!cardActions) {
            // If somehow the cardActions got lost, recreate them
            const newCardActions = document.createElement('div');
            newCardActions.className = 'ql-flashcard-card-actions';
            
            const generateButton = document.createElement('button');
            generateButton.className = 'ql-flashcard-nav-btn ql-flashcard-generate';
            generateButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
            generateButton.title = 'Generate flashcards with AI';
            
            const addButton = document.createElement('button');
            addButton.className = 'ql-flashcard-nav-btn ql-flashcard-add';
            addButton.innerHTML = '+';
            addButton.title = 'Add new card';
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'ql-flashcard-nav-btn ql-flashcard-delete';
            deleteButton.innerHTML = '&times;';
            deleteButton.title = 'Delete current card';
            
            // Set delete button state based on card count
            deleteButton.disabled = updatedCards.length <= 1;
            deleteButton.style.display = updatedCards.length <= 1 ? 'none' : 'flex';
            
            // Add the buttons to the actions div
            newCardActions.appendChild(generateButton);
            newCardActions.appendChild(addButton);
            newCardActions.appendChild(deleteButton);
            
            // Add the actions to the node (outside container)
            if (titleSection) {
              node.insertBefore(newCardActions, titleSection.nextSibling);
            } else {
              node.insertBefore(newCardActions, container);
            }
          }
          
          // Add title section if it doesn't exist
          if (!titleSection) {
            const newTitleSection = document.createElement('div');
            newTitleSection.className = 'ql-flashcard-title-section';
            
            const titleText = document.createElement('h3');
            titleText.className = 'ql-flashcard-title-text';
            titleText.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-stack"><path d="M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><path d="M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"></path><rect width="8" height="8" x="14" y="14" rx="2"></rect></svg> FLASHCARD`;
            
            newTitleSection.appendChild(titleText);
            node.insertBefore(newTitleSection, node.firstChild);
          }
          
          // Create new card elements with the updated content
          updatedCards.forEach((card: any, index: number) => {
            // Front side
            const front = document.createElement('div');
            front.className = 'ql-flashcard-front';
            front.dataset.cardIndex = index.toString();
            front.style.display = index === 0 ? 'block' : 'none';
            
            const frontLabel = document.createElement('div');
            frontLabel.className = 'ql-flashcard-label';
            frontLabel.textContent = 'FRONT';
            
            const frontContent = document.createElement('div');
            frontContent.className = 'ql-flashcard-content';
            frontContent.setAttribute('contenteditable', 'true');
            frontContent.innerHTML = card.front || 'Enter your question here...';
            
            // Add keyboard event handlers for front content
            frontContent.addEventListener('keydown', (e) => {
              // Prevent Enter key from creating new blocks outside of flashcard
              if (e.key === 'Enter' && !e.shiftKey) {
                e.stopPropagation(); // Don't let Quill handle this event
                
                // Insert a <br> at cursor position instead
                document.execCommand('insertLineBreak');
                e.preventDefault(); // Prevent default behavior
              }
              
              // Always prevent Delete/Backspace from bubbling up to Quill to avoid component deletion
              if (e.key === 'Delete' || e.key === 'Backspace') {
                // Still allow normal text deletion within the content
                if (frontContent.innerText.length === 0 || 
                    window.getSelection()?.toString() === frontContent.innerText) {
                  // If content would be emptied, prevent default behavior too
                  e.preventDefault();
                }
                // Always stop propagation to prevent Quill from handling the event
                e.stopPropagation();
              }
            });
            
            front.appendChild(frontLabel);
            front.appendChild(frontContent);
            
            // Back side
            const back = document.createElement('div');
            back.className = 'ql-flashcard-back';
            back.dataset.cardIndex = index.toString();
            back.style.display = index === 0 ? 'block' : 'none';
            
            const backLabel = document.createElement('div');
            backLabel.className = 'ql-flashcard-label';
            backLabel.textContent = 'BACK';
            
            const backContent = document.createElement('div');
            backContent.className = 'ql-flashcard-content';
            backContent.setAttribute('contenteditable', 'true');
            backContent.innerHTML = card.back || 'Write the answer here...';
            
            // Add keyboard event handlers for back content
            backContent.addEventListener('keydown', (e) => {
              // Prevent Enter key from creating new blocks outside of flashcard
              if (e.key === 'Enter' && !e.shiftKey) {
                e.stopPropagation(); // Don't let Quill handle this event
                
                // Insert a <br> at cursor position instead
                document.execCommand('insertLineBreak');
                e.preventDefault(); // Prevent default behavior
              }
              
              // Always prevent Delete/Backspace from bubbling up to Quill to avoid component deletion
              if (e.key === 'Delete' || e.key === 'Backspace') {
                // Still allow normal text deletion within the content
                if (backContent.innerText.length === 0 || 
                    window.getSelection()?.toString() === backContent.innerText) {
                  // If content would be emptied, prevent default behavior too
                  e.preventDefault();
                }
                // Always stop propagation to prevent Quill from handling the event
                e.stopPropagation();
              }
            });
            
            back.appendChild(backLabel);
            back.appendChild(backContent);
            
            // Add elements to container
            container.appendChild(front);
            container.appendChild(back);
          });
          
          // Reset flip state
          container.classList.remove('flipped');
          
          // Update the navigation info
          navInfo.textContent = `Card 1 of ${updatedCards.length}`;
          
          // Update button states
          prevButton.disabled = true;
          nextButton.disabled = updatedCards.length <= 1;
          
          // Update delete button visibility
          deleteButton.disabled = updatedCards.length <= 1;
          deleteButton.style.display = updatedCards.length <= 1 ? 'none' : 'flex';
        }
      });
    });
    
    return node;
  },
  
  value(node: HTMLElement) {
    console.log('FlashcardBlot value method called for node:', node);
    
    const container = node.querySelector('.ql-flashcard-container') as HTMLElement;
    const currentIndex = parseInt(container?.dataset.currentIndex || '0');
    const isFlipped = container?.classList.contains('flipped') || false;
    
    // Collect all cards data
    const cards: { front: string; back: string }[] = [];
    
    // Get all front and back pairs
    const fronts = node.querySelectorAll('.ql-flashcard-front');
    const backs = node.querySelectorAll('.ql-flashcard-back');
    
    console.log('Found fronts/backs:', { frontsCount: fronts.length, backsCount: backs.length });
    
    fronts.forEach((front, idx) => {
      const frontContent = front.querySelector('.ql-flashcard-content');
      const backContent = backs[idx]?.querySelector('.ql-flashcard-content');
      
      cards.push({
        front: frontContent ? frontContent.innerHTML : '',
        back: backContent ? backContent.innerHTML : ''
      });
    });
    
    const result = {
      cards,
      currentIndex,
      isFlipped
    };
    
    console.log('FlashcardBlot value result:', result);
    return result;
  }
};

// Export initialization function
export function registerFlashcardBlot(quillInstance: any) {
  Quill = quillInstance;
  
  const BlockEmbed = Quill.import('blots/block/embed');
  
  // Create a class that extends BlockEmbed
  class FlashcardBlotClass extends BlockEmbed {
    static create(value: { cards?: { front: string; back: string }[]; currentIndex?: number; isFlipped?: boolean }) {
      return FlashcardBlot.create(value);
    }
    
    static value(node: HTMLElement) {
      return FlashcardBlot.value(node);
    }
  }
  
  // Set properties on the class
  FlashcardBlotClass.blotName = FlashcardBlot.blotName;
  FlashcardBlotClass.tagName = FlashcardBlot.tagName;
  FlashcardBlotClass.className = FlashcardBlot.className;
  
  // Register with Quill
  Quill.register(FlashcardBlotClass);
} 