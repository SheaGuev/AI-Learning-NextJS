'use client';

import React, { useState } from 'react';
import AiTutor from '@/components/dashboard-tools/ai-tutor/ai-tutor';
import { LearningPathPlanner } from '@/components/dashboard-tools/learning-path/learning-path-planner';
import ResearchTool from '@/components/dashboard-tools/research/research-tool';
import KnowledgeBaseDashboard from '@/components/dashboard-tools/knowledge-base/knowledge-base-dashboard';
import PomodoroTimer from '@/components/dashboard-tools/pomodoro-timer/pomodoro-timer';
import { RiRobot2Line, RiCodeLine, RiRoadMapLine, RiSearchLine, RiBrainLine, RiTimerLine } from 'react-icons/ri';

// Tool types
type ToolType = 'ai-tutor' | 'flashcard-quiz' | 'learning-path' | 'research' | 'knowledge-base' | 'pomodoro-timer' | null;

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
      className={`bg-[#1e1e2e] border p-5 rounded-lg shadow-md cursor-pointer transition-all hover:bg-[#2d2d3a] 
        ${isActive ? 'border-[#6052A8] ring-2 ring-[#6052A8]/30' : 'border-[#4A4A67]'}`}
      onClick={onClick}
    >
      <div className="flex items-center mb-3">
        <div className="text-[#6052A8] text-2xl mr-3">{icon}</div>
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
      id: 'knowledge-base',
      title: 'Knowledge Base',
      description: 'Centralised study system with spaced repetition',
      icon: <RiBrainLine />,
    },
    {
      id: 'learning-path',
      title: 'Learning Path Planner',
      description: 'Chart your learning journey',
      icon: <RiRoadMapLine />,
    },
    {
      id: 'ai-tutor',
      title: 'AI Tutor',
      description: 'Get learning assistance with AI-powered tutoring',
      icon: <RiRobot2Line />,
    },
    // {
    //   id: 'research',
    //   title: 'Research Tool',
    //   description: 'Find relevant sources and references',
    //   icon: <RiSearchLine />,
    // },
    {
      id: 'pomodoro-timer',
      title: 'Pomodoro Timer',
      description: 'Manage work and break sessions effectively',
      icon: <RiTimerLine />,
    }
    // {
    //   id: 'flashcard-quiz',
    //   title: 'Flashcards & Quiz',
    //   description: 'Generate study materials from your files',
    //   icon: <RiCodeLine />,
    // }
  ];

  const renderActiveTool = () => {
    switch(activeTool) {
      case 'ai-tutor':
        return <AiTutor />;
      case 'learning-path':
        return <LearningPathPlanner />;
      case 'research':
        return <ResearchTool />;
      case 'knowledge-base':
        return <KnowledgeBaseDashboard />;
      case 'pomodoro-timer':
        return <PomodoroTimer />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <div className="mt-4 transition-all min-h-[300px] bg-[#1e1e2e] border border-[#4A4A67] rounded-lg p-6 shadow-lg">
          {renderActiveTool()}
        </div>
      )}
    </div>
  );
};

export default DashboardTools;