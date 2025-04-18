// Custom block formats for Quill
import { CheckboxBlot, registerCheckboxBlot } from './checkbox-blot';
import { FlashcardBlot, registerFlashcardBlot } from './flashcard-blot';
import { QuizBlot, registerQuizBlot } from './quiz-blot'; // Removed .ts extension
import SlashCommands from '../commands/slash-commands'; // Removed .ts extension

// We'll need to register these with Quill when we import them
let Quill: any;

interface HorizontalRuleStatic {
  create: (value: any) => HTMLElement;
  value: (node: HTMLElement) => boolean;
  blotName: string;
  tagName: string;
}

interface CalloutBlotStatic {
  create: (value: any) => HTMLElement;
  value: (node: HTMLElement) => { type: string; icon: string; content: string };
  blotName: string;
  tagName: string;
}

// Create a horizontal rule blot
export const HorizontalRule: HorizontalRuleStatic = {
  blotName: 'hr',
  tagName: 'hr',
  
  create(value: any) {
    const node = document.createElement('hr');
    node.setAttribute('class', 'ql-hr');
    return node;
  },

  value(node: HTMLElement) {
    return true;
  }
};

// Create a callout block
export const CalloutBlot: CalloutBlotStatic = {
  blotName: 'callout',
  tagName: 'div',
  
  create(value: any) {
    const node = document.createElement('div');
    node.setAttribute('class', 'ql-callout');
    
    // Add appropriate styles based on type
    if (value.type) {
      node.classList.add(`ql-callout-${value.type}`);
    }
    
    // Add icon based on callout type
    const icon = document.createElement('div');
    icon.setAttribute('class', 'ql-callout-icon');
    icon.textContent = value.icon || '💡';
    
    // Add content container
    const content = document.createElement('div');
    content.setAttribute('class', 'ql-callout-content');
    content.innerHTML = value.content || '';
    
    node.appendChild(icon);
    node.appendChild(content);
    
    return node;
  },

  value(node: HTMLElement) {
    const type = Array.from(node.classList)
      .find(cls => cls.startsWith('ql-callout-') && cls !== 'ql-callout')
      ?.replace('ql-callout-', '') || '';
    
    const icon = node.querySelector('.ql-callout-icon')?.textContent || '';
    const content = node.querySelector('.ql-callout-content')?.innerHTML || '';
    
    return { type, icon, content };
  }
};

// Function to register these custom formats with Quill
export function registerCustomBlocks(quillInstance: any) {
  Quill = quillInstance;
  
  const BlockEmbed = Quill.import('blots/block/embed');
  
  // Create classes that extend BlockEmbed
  class HorizontalRuleBlot extends BlockEmbed {}
  class CalloutBlotClass extends BlockEmbed {}
  
  // Set properties on the classes
  HorizontalRuleBlot.blotName = HorizontalRule.blotName;
  HorizontalRuleBlot.tagName = HorizontalRule.tagName;
  
  CalloutBlotClass.blotName = CalloutBlot.blotName;
  CalloutBlotClass.tagName = CalloutBlot.tagName;
  
  // Set up the static methods
  HorizontalRuleBlot.create = HorizontalRule.create;
  HorizontalRuleBlot.value = HorizontalRule.value;
  
  CalloutBlotClass.create = CalloutBlot.create;
  CalloutBlotClass.value = CalloutBlot.value;
  
  // Register with Quill
  Quill.register(HorizontalRuleBlot);
  Quill.register(CalloutBlotClass);
  
  // Register checkbox blot
  registerCheckboxBlot(Quill);
  
  // Register flashcard blot
  registerFlashcardBlot(Quill);
  
  // Register quiz blot
  registerQuizBlot(Quill);
  
  // Register the slash commands module
  Quill.register('modules/slashCommands', SlashCommands);
}