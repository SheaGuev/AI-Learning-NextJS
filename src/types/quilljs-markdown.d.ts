declare module 'quilljs-markdown' {
  interface QuillMarkdownOptions {
    ignoreTags?: string[];
    matchVisual?: boolean;
    renderHtml?: boolean;
  }

  export default class QuillMarkdown {
    constructor(quill: any, options?: QuillMarkdownOptions);
    destroy(): void;
  }
} 