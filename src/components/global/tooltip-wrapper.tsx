import React from 'react'
import { TooltipProvider, TooltipTrigger, Tooltip, TooltipContent } from '../ui/tooltip';
// import { TooltipContent } from '@radix-ui/react-tooltip';

interface TooltipWrapperProps {
  children: React.ReactNode;
    tooltip: string;
}


const TooltipWrapper:React.FC<TooltipWrapperProps> = ({children, tooltip}) => {
  return (
    <TooltipProvider>
        <Tooltip >
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            <TooltipContent>
                {tooltip}
            </TooltipContent>
        </Tooltip>

    </TooltipProvider>
  );
};

export default TooltipWrapper;


