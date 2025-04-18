'use client';

import React, { useState } from 'react';
import AiTutor from '@/components/dashboard-tools/ai-tutor/ai-tutor';
import FlashcardQuizGenerator from '@/components/dashboard-tools/flashcard-quiz/flashcard-quiz-generator';
import LearningPathPlanner from '@/components/dashboard-tools/learning-path/learning-path-planner';
import ResearchTool from '@/components/dashboard-tools/research/research-tool';
import { RiRobot2Line, RiCodeLine, RiRoadMapLine, RiSearchLine } from 'react-icons/ri';

// Tool types
type ToolType = 'ai-tutor' | 'flashcard-quiz' | 'learning-path' | 'research' | null;

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, description, icon, onClick, isActive }) => {
  return (
    <div 
      className={`bg-gray-800 border p-5 rounded-lg shadow-md cursor-pointer transition-all hover:bg-gray-700 
        ${isActive ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-700'}`}
      onClick={onClick}
    >
      <div className="flex items-center mb-3">
        <div className="text-blue-500 text-2xl mr-3">{icon}</div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  );
};

const DashboardTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>(null);

  const tools = [
    {
      id: 'ai-tutor',
      title: 'AI Tutor',
      description: 'Get learning assistance with AI-powered tutoring',
      icon: <RiRobot2Line />,
    },
    {
      id: 'flashcard-quiz',
      title: 'Flashcards & Quiz',
      description: 'Generate study materials from your files',
      icon: <RiCodeLine />,
    },
    {
      id: 'research',
      title: 'Research Tool',
      description: 'Find relevant sources and references',
      icon: <RiSearchLine />,
    },
    {
      id: 'learning-path',
      title: 'Learning Path Planner',
      description: 'Chart your learning journey',
      icon: <RiRoadMapLine />,
    }
  ];

  const renderActiveTool = () => {
    switch(activeTool) {
      case 'ai-tutor':
        return <AiTutor />;
      case 'flashcard-quiz':
        return <FlashcardQuizGenerator />;
      case 'learning-path':
        return <LearningPathPlanner />;
      case 'research':
        return <ResearchTool />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            isActive={activeTool === tool.id}
            onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id as ToolType)}
          />
        ))}
      </div>
      
      {activeTool && (
        <div className="mt-4 transition-all min-h-[600px]">
          {renderActiveTool()}
        </div>
      )}
    </div>
  );
};

export default DashboardTools; 