import React from 'react';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import { Button } from '../../ui/button';
import { FileDown } from 'lucide-react';
import { Collaborator } from '../types';

interface EditorHeaderProps {
  breadCrumbs?: string;
  collaborators: Collaborator[];
  saving: boolean;
  onExportMarkdown?: () => void;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  breadCrumbs,
  collaborators,
  saving,
  onExportMarkdown
}) => {
  return (
    <div
      className="flex 
      flex-col-reverse 
      sm:flex-row 
      sm:justify-between 
      justify-center 
      sm:items-center 
      sm:p-2 
      p-8"
    >
      <div>{breadCrumbs}</div>
      <div className="flex items-center gap-4">
        {onExportMarkdown && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onExportMarkdown}
                  className="flex items-center gap-1"
                >
                  <FileDown size={16} />
                  <span className="hidden sm:inline">Export Markdown</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export content as Markdown</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="flex items-center justify-center h-10">
          {collaborators?.map((collaborator) => (
            <TooltipProvider key={collaborator.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar
                    className="
                      -ml-3 
                      bg-background 
                      border-2 
                      flex 
                      items-center 
                      justify-center 
                      border-white 
                      h-8 
                      w-8 
                      rounded-full
                    "
                  >
                    <AvatarImage
                      src={
                        collaborator.avatarUrl ? collaborator.avatarUrl : ''
                      }
                      className="rounded-full"
                    />
                    <AvatarFallback>
                      {collaborator.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{collaborator.email}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        {saving ? (
          <Badge
            variant="secondary"
            className="bg-orange-600 top-4
            text-white
            right-4
            z-50
            "
          >
            Saving...
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="bg-emerald-600 
            top-4
            text-white
            right-4
            z-50
            "
          >
            Saved
          </Badge>
        )}
      </div>
    </div>
  );
};

export default EditorHeader; 