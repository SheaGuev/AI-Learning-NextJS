// Type definitions for PDF.js
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