# Lateral Project Documentation

## Project Overview

Lateral is a Next.js application that appears to be a document/note management system with collaborative features. The application uses Supabase for database storage, Tailwind CSS for styling, and includes features like real-time editing with Socket.io.

## Directory Structure

### Root Directory

- `.next/`: Contains the compiled Next.js application code
- `public/`: Static assets that are served directly
- `src/`: Main source code for the application
- `migrations/`: Database migration files for Drizzle ORM
- `.vscode/`: VS Code specific configuration
- `node_modules/`: Dependencies installed via npm

### Configuration Files

- `package.json`: Contains project dependencies and scripts
- `next.config.js/ts`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `drizzle.config.ts`: Drizzle ORM configuration
- `jest.config.js`: Jest testing configuration
- `postcss.config.mjs`: PostCSS configuration
- `tsconfig.json`: TypeScript configuration
- `eslint.config.mjs`: ESLint configuration

## Source Code Structure (src/)

### App Directory (src/app/)

The app directory uses Next.js 13+ App Router pattern which is organized by routes:

- `(auth)/`: Authentication-related pages and components
- `(main)/`: Main application pages
- `(site)/`: Public-facing website pages
- `demo/`: Demo pages
- `api/`: API route handlers
- `layout.tsx`: Root layout component
- `globals.css`: Global CSS styles

### Components Directory (src/components/)

Contains reusable UI components organized by feature or domain:

- `dashboard/`: Components for the main dashboard UI
- `dashboard-setup/`: Components for setting up the dashboard
- `dashboard-tools/`: Tools and utilities for the dashboard
- `ui/`: Base UI components like buttons, inputs, etc.
- `global/`: Components used across the entire app
- `sidebar/`: Sidebar navigation components
- `settings/`: Components for settings pages
- `quill-editor/`: Rich text editor integration
- `trash/`: Components for the trash/recycle bin feature
- `landing-page/`: Components for the public landing page
- `icons/`: Custom icon components
- `__tests__/`: Component tests

### Library Directory (src/lib/)

Contains utility functions, hooks, and shared logic:

- `hooks/`: React hooks for reusable logic
- `providers/`: React context providers 
- `server-actions/`: Next.js server actions
- `utils.ts`: General utility functions
- `types.ts`: TypeScript type definitions
- `knowledge-base.ts`: knowledge base implementation
- `__tests__/`: Library tests

### Supabase Directory (src/supabase/)

Contains the database integration with Supabase:

- `supabase.ts`: Supabase client configuration
- `schema.ts`: Database schema definitions using Drizzle ORM
- `queries.ts`: Database queries
- `db.ts`: Database connection and utility functions
- `reset-db.ts`: Script to reset the database
- `db-scripts.js`: Database management scripts

### Types Directory (src/types/)

Contains TypeScript type definitions for the application.

### Middleware (src/middleware.ts)

Next.js middleware for handling requests before they reach the routes.

## Key Features

1. **Dashboard**: The main interface for users to interact with their content
2. **Real-time Collaboration**: Using Socket.io for real-time updates
3. **Rich Text Editing**: Quill editor integration for document editing
4. **Authentication**: User authentication and authorization system
5. **Database Integration**: Supabase for storage with Drizzle ORM
6. **Responsive UI**: Built with Tailwind CSS and Radix UI components

## Development Workflow

1. Use `npm run dev` or `node server.js` to start the development server
2. Use Drizzle ORM commands for database migrations:
   - `npm run push`: Push schema changes to the database
   - `npm run generate`: Generate migration files
   - `npm run migrate`: Apply migrations

## Testing

The project includes Jest for testing:
- `npm run test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Generate test coverage report

## Technologies Used

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: React Hooks
- **Testing**: Jest and React Testing Library
- **Real-time**: Socket.io
- **Form Handling**: React Hook Form with Zod validation
- **Markdown**: Support for markdown content with react-markdown 