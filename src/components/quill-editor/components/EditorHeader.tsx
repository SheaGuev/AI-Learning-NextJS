import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileDown, Users, Wifi } from 'lucide-react';
import { Collaborator } from '../types';
import { useSocket } from '@/lib/providers/socket-provider';

interface EditorHeaderProps {
  breadCrumbs: { folderId: string; folderTitle: string } | null;
  collaborators: Collaborator[];
  saving: boolean;
  onExportMarkdown: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  breadCrumbs,
  collaborators,
  saving,
  onExportMarkdown
}) => {
  const { isConnected } = useSocket();
  
  return (
    <div className="flex items-center justify-between w-full p-2 overflow-x-auto">
      <div>
        {breadCrumbs && (
          <p className="text-sm text-muted-foreground">
            {breadCrumbs.folderTitle}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {isConnected && (
          <div className="flex items-center gap-2 text-xs">
            <Wifi size={14} className={`${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={`${isConnected ? 'text-green-500' : 'text-gray-400'}`}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        )}
        
        {saving && (
          <div className="text-sm text-muted-foreground animate-pulse">Saving...</div>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onExportMarkdown}
                className="flex gap-2 items-center"
              >
                <FileDown size={16} />
                <span className="sr-only md:not-sr-only md:inline">Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export as Markdown</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex items-center justify-center">
          {collaborators.length > 0 && (
            <div className="flex gap-2 items-center">
              <Users size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground mr-2">
                {collaborators.length} active
              </span>
              <div className="flex -space-x-2">
                {collaborators.map((c) => (
                  <Tooltip key={c.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-6 w-6 border border-background">
                        <AvatarImage
                          src={c.avatarUrl || '/default-avatar.png'}
                          alt={c.email}
                        />
                        <AvatarFallback className="text-xs">
                          {c.email?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{c.email}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorHeader; 