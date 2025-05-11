# Markdown Constants

This file provides centralized constants related to Markdown formatting that are used throughout the application.

## `MARKDOWN_FORMATTING_INSTRUCTIONS`

A string constant containing standardized instructions for formatting text in Markdown. These instructions are provided to AI generation services to ensure consistent markdown output.

### Key formatting guidelines included:

* Paragraph breaks with blank lines
* Bullet lists using `*` followed by a space
* Numbered lists with proper numbering format
* Nested lists using 4-space indentation (not tabs)
* Code blocks with triple backticks
* Inline code with single backticks
* Headings using `#` syntax
* Text emphasis with asterisks
* Blockquotes with `>` prefix
* Tables with proper markdown format

### Usage

```typescript
import { MARKDOWN_FORMATTING_INSTRUCTIONS } from '@/lib/utils/markdown-constants';

// Example: Include in an AI generation prompt
const fullPrompt = `${userPrompt}\n\n${MARKDOWN_FORMATTING_INSTRUCTIONS}`;
```

The centralization of these instructions ensures consistency across the application and makes it easier to update formatting requirements in a single location. 