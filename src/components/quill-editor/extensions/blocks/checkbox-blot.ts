// Checkbox implementation for Quill
let Quill: any;

interface CheckboxBlotStatic {
  blotName: string;
  tagName: string;
  className: string;
  create: (value: any) => HTMLElement;
  value: (node: HTMLElement) => { checked: boolean };
}

// Create a checkbox blot
export const CheckboxBlot: CheckboxBlotStatic = {
  blotName: 'checkbox',
  tagName: 'div',
  className: 'ql-checkbox',
  
  create(value: { checked?: boolean } = {}) {
    const node = document.createElement('div');
    node.setAttribute('class', 'ql-checkbox');
    node.setAttribute('contenteditable', 'false');
    
    // Create checkbox input
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = value.checked || false;
    
    // Add click handler to toggle checkbox
    checkbox.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle checked state
      checkbox.checked = !checkbox.checked;
      
      // Dispatch a custom event for state tracking
      const checkboxEvent = new CustomEvent('checkbox-change', {
        detail: { 
          checked: checkbox.checked, 
          node 
        }
      });
      document.dispatchEvent(checkboxEvent);
    });
    
    // Create label
    const label = document.createElement('span');
    label.setAttribute('contenteditable', 'true');
    label.textContent = value.text || 'Checkbox item';
    
    // Add keyboard event handler to prevent Enter key from creating new blocks
    label.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    
    node.appendChild(checkbox);
    node.appendChild(label);
    
    return node;
  },
  
  value(node: HTMLElement) {
    const checkbox = node.querySelector('input[type="checkbox"]');
    const label = node.querySelector('span');
    
    return {
      checked: checkbox ? (checkbox as HTMLInputElement).checked : false,
      text: label ? label.textContent : ''
    };
  }
};

// Register the checkbox blot with Quill
export function registerCheckboxBlot(quillInstance: any) {
  Quill = quillInstance;
  
  const BlockEmbed = Quill.import('blots/block/embed');
  
  class CheckboxBlotClass extends BlockEmbed {
    static create(value: any) {
      return CheckboxBlot.create(value);
    }
    
    static value(node: HTMLElement) {
      return CheckboxBlot.value(node);
    }
  }
  
  CheckboxBlotClass.blotName = CheckboxBlot.blotName;
  CheckboxBlotClass.tagName = CheckboxBlot.tagName;
  CheckboxBlotClass.className = CheckboxBlot.className;
  
  Quill.register(CheckboxBlotClass);
}