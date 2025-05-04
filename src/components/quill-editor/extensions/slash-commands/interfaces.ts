// Shared interfaces for slash-commands module

// Command option interface for slash commands
export interface CommandOption {
  label: string;
  icon?: string;
  description?: string;
  className?: string;
  handler: (quill: any, range: any) => void;
}

// Interface for processed PDF sections
export interface ProcessedSection {
  element: HTMLElement;
  contentContainer: HTMLElement;
  loadingIndicator: HTMLElement;
  insertBtn: HTMLButtonElement;
  insertWithSummaryBtn: HTMLButtonElement;
  checkbox: HTMLInputElement;
  enhancedFormatBtn?: HTMLButtonElement;
  content: string;
  heading: string;
  summary: string;
  selected: boolean;
}

// Interface for processing overlay controls
export interface OverlayControls {
  update: (newMessage: string) => void;
  close: () => void;
}

// Interface for dialog structure
export interface Dialog {
  containerEl: HTMLElement | null;
  hide: () => void;
}

// Add PDF.js type definition for TypeScript
declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (params: { data: Uint8Array }) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNum: number) => Promise<{
            getTextContent: () => Promise<{
              items: Array<{ str: string }>;
            }>;
          }>;
        }>;
      };
    };
  }
} 