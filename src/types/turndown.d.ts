declare module 'turndown' {
  interface TurndownOptions {
    headingStyle?: 'setext' | 'atx';
    hr?: string;
    bulletListMarker?: string;
    codeBlockStyle?: 'indented' | 'fenced';
    fence?: string;
    emDelimiter?: string;
    strongDelimiter?: string;
    linkStyle?: 'inlined' | 'referenced';
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
    listIndent?: string;
  }

  class TurndownService {
    constructor(options?: TurndownOptions);
    turndown(html: string): string;
    use(plugin: any): this;
    addRule(key: string, rule: any): this;
  }

  export = TurndownService;
} 