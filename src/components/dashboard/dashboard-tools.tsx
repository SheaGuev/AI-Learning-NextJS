'use client';

import React, { useState } from 'react';
import AiTutor from '@/components/dashboard-tools/ai-tutor/ai-tutor';
import { RiRobot2Line, RiCodeLine, RiFileTextLine, RiSettings4Line } from 'react-icons/ri';

// Tool types
type ToolType = 'ai-tutor' | 'code-editor' | 'notes' | 'settings' | null;

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
      id: 'code-editor',
      title: 'Code Editor',
      description: 'Write and edit code with syntax highlighting',
      icon: <RiCodeLine />,
    },
    {
      id: 'notes',
      title: 'Notes',
      description: 'Take and manage learning notes',
      icon: <RiFileTextLine />,
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure your workspace settings',
      icon: <RiSettings4Line />,
    }
  ];

  const renderActiveTool = () => {
    switch(activeTool) {
      case 'ai-tutor':
        return <AiTutor />;
      case 'code-editor':
        return <div className="bg-gray-900 p-4 rounded-lg text-white h-[400px]">Code Editor (Coming Soon)</div>;
      case 'notes':
        return <div className="bg-gray-900 p-4 rounded-lg text-white h-[400px]">Notes (Coming Soon)</div>;
      case 'settings':
        return <div className="bg-gray-900 p-4 rounded-lg text-white h-[400px]">Settings (Coming Soon)</div>;
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
        <div className="mt-4 transition-all">
          {renderActiveTool()}
        </div>
      )}
    </div>
  );
};

export default DashboardTools; 