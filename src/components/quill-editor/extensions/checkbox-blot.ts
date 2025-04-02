// Checkbox format for Quill
let Quill: any;

interface CheckboxBlotStatic {
  blotName: string;
  tagName: string;
  className: string;
  create: (value: any) => HTMLElement;
  value: (node: HTMLElement) => boolean;
}

// Create a checkbox blot
export const CheckboxBlot: CheckboxBlotStatic = {
  blotName: 'checkbox',
  tagName: 'span',
  className: 'ql-checkbox',
  
  create(value: boolean = false) {
    const node = document.createElement('span');
    node.setAttribute('class', 'ql-checkbox');
    node.setAttribute('contenteditable', 'false');
    
    // Create the checkbox input
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'ql-checkbox-input';
    checkbox.checked = value;
    
    // Add the checkbox to the node
    node.appendChild(checkbox);
    
    // Add a text node after the checkbox to allow text entry
    const text = document.createElement('span');
    text.className = 'ql-checkbox-text';
    text.setAttribute('contenteditable', 'true');
    
    node.appendChild(text);
    
    // Add click handler to toggle checkbox
    checkbox.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      checkbox.checked = !checkbox.checked;
      
      // Dispatch a custom event so we can handle state changes
      const changeEvent = new CustomEvent('checkbox-change', {
        detail: { checked: checkbox.checked, node }
      });
      document.dispatchEvent(changeEvent);
    });
    
    return node;
  },
  
  value(node: HTMLElement) {
    const checkbox = node.querySelector('input[type=checkbox]');
    return checkbox ? (checkbox as HTMLInputElement).checked : false;
  }
};

// Initialize checkbox clicks in the editor
export function initializeCheckboxes(quill: any) {
  // Listen for checkbox clicks within the editor
  quill.root.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if we clicked on a checkbox
    if (target && target.tagName === 'INPUT' && target.classList.contains('ql-checkbox-input')) {
      const checkboxNode = target.closest('.ql-checkbox');
      if (!checkboxNode) return;
      
      // Toggle the checkbox
      const checkboxInput = target as HTMLInputElement;
      checkboxInput.checked = !checkboxInput.checked;
      e.preventDefault();
      
      // Update the Quill delta to reflect the change
      const checkboxIndex = quill.getIndex(checkboxNode);
      if (checkboxIndex >= 0) {
        quill.updateContents([
          { retain: checkboxIndex },
          { attributes: { checkbox: checkboxInput.checked } }
        ], 'user');
      }
    }
  });
}

// Register the checkbox blot with Quill
export function registerCheckboxBlot(quillInstance: any) {
  Quill = quillInstance;
  
  const Inline = Quill.import('blots/inline');
  
  // Create a class that extends Inline
  class CheckboxBlotClass extends Inline {
    static create(value: boolean) {
      return CheckboxBlot.create(value);
    }
    
    static value(node: HTMLElement) {
      return CheckboxBlot.value(node);
    }
  }
  
  // Set properties on the class
  CheckboxBlotClass.blotName = CheckboxBlot.blotName;
  CheckboxBlotClass.tagName = CheckboxBlot.tagName;
  CheckboxBlotClass.className = CheckboxBlot.className;
  
  // Register with Quill
  Quill.register(CheckboxBlotClass);
} 