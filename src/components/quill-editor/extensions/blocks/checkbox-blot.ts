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
  tagName: 'span', // Keep as span for inline behavior
  className: 'ql-checkbox',

  create(value: boolean = false) {
    const node = document.createElement('span');
    node.setAttribute('class', 'ql-checkbox');
    node.setAttribute('contenteditable', 'false'); // The whole blot is not editable directly

    // Create the checkbox input
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'ql-checkbox-input';
    checkbox.checked = value;

    // Add the checkbox to the node
    node.appendChild(checkbox);

    // Add a non-editable space after the checkbox for visual separation
    // This prevents text from being directly typed immediately after the box
    const space = document.createTextNode('\u00A0'); // Non-breaking space
    node.appendChild(space);

    // Add click handler directly to the checkbox
    checkbox.addEventListener('click', (e) => {
      // We don't need preventDefault/stopPropagation here if Quill handles it.
      // The state change happens via the default checkbox behavior.
      // Quill's MutationObserver should detect the 'checked' attribute change
      // and update the internal model if necessary.

      // Optional: If Quill doesn't automatically update, we might need to trigger
      // an update manually, but let's try without it first.
      // const blot = Quill.find(node);
      // if (blot) {
      //   blot.format('checkbox', checkbox.checked); // Try formatting directly
      // }

      // Dispatch an event *on the node itself* if needed by external listeners,
      // but avoid global document dispatch.
      const changeEvent = new CustomEvent('checkbox-change', {
        detail: { checked: checkbox.checked, node },
        bubbles: true // Allow event to bubble up if needed
      });
      node.dispatchEvent(changeEvent);
    });

    return node;
  },

  value(node: HTMLElement): boolean { // Ensure return type is boolean
    const checkbox = node.querySelector('input[type=checkbox]');
    return checkbox ? (checkbox as HTMLInputElement).checked : false;
  }
};

// Register the checkbox blot with Quill
export function registerCheckboxBlot(quillInstance: any) {
  Quill = quillInstance;

  const Inline = Quill.import('blots/inline');

  // Create a class that extends Inline
  class CheckboxBlotClass extends Inline {
    static create(value: boolean) {
      // Ensure the value passed is boolean
      return CheckboxBlot.create(!!value);
    }

    static value(node: HTMLElement): boolean { // Ensure return type is boolean
      return CheckboxBlot.value(node);
    }

    // Define how formats are applied to this blot
    static formats(node: HTMLElement): { [key: string]: any } {
      const checkbox = node.querySelector('input[type=checkbox]');
      return { checkbox: checkbox ? (checkbox as HTMLInputElement).checked : false };
    }

    // Handle format changes
    format(name: string, value: any) {
      if (name === 'checkbox' && typeof value === 'boolean') {
        const checkbox = this.domNode.querySelector('input[type=checkbox]') as HTMLInputElement | null;
        if (checkbox) {
          checkbox.checked = value;
          // No need to call super.format typically for embeds unless managing attributes
        }
      } else {
        super.format(name, value);
      }
    }
  }

  // Set properties on the class
  CheckboxBlotClass.blotName = CheckboxBlot.blotName;
  CheckboxBlotClass.tagName = CheckboxBlot.tagName;
  CheckboxBlotClass.className = CheckboxBlot.className;

  // Register with Quill
  Quill.register(CheckboxBlotClass);
}