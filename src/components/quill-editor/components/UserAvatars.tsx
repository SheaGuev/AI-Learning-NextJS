import React from 'react';

interface UserAvatarsProps {
  collaborators: { id: string; email?: string; avatarUrl?: string }[];
}

const UserAvatars: React.FC<UserAvatarsProps> = ({ collaborators }) => {
  if (!collaborators || !collaborators.length) {
    return null;
  }
  
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {collaborators.map((collaborator) => (
        <div 
          key={collaborator.id}
          className="relative group"
        >
          <div 
            className="w-8 h-8 rounded-full border-2 border-[#1e1e2e] bg-[#2d2d3a] flex items-center justify-center overflow-hidden"
            title={collaborator.email || 'User'}
          >
            {collaborator.avatarUrl ? (
              <img 
                src={collaborator.avatarUrl} 
                alt={collaborator.email || 'User'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xs font-medium text-gray-200">
                {collaborator.email 
                  ? collaborator.email.substring(0, 2).toUpperCase() 
                  : '?'}
              </div>
            )}
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#1f1f2d] text-xs text-gray-300 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {collaborator.email || 'Unknown user'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserAvatars; 