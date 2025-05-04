declare module 'quilljs-markdown' {
  interface QuillMarkdownOptions {
    ignoreTags?: string[];
    matchVisual?: boolean;
    renderHtml?: boolean;
    tables?: boolean;
    breaks?: boolean;
    indentedCodeBlock?: boolean;
    linkify?: boolean;
    typographer?: boolean;
    customRules?: any[];
  }

  export default class QuillMarkdown {
    constructor(quill: any, options?: QuillMarkdownOptions);
    destroy(): void;
    process(): void;
    options: {
      enabled: boolean;
      [key: string]: any;
    };
    activity?: {
      onTextChange?: () => void;
      onRemoveElement?: () => void;
      [key: string]: any;
    };
    matches?: any[];
  }
} 