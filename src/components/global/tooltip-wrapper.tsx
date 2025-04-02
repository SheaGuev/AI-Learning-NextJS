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
            <TooltipTrigger>
                {children}
            </TooltipTrigger>
            <TooltipContent 
              className="z-[100] !visible" 
              style={{ zIndex: 100 }}
              sideOffset={5}
              onPointerDownOutside={(e) => {
                console.log(`Tooltip "${tooltip}" pointer outside:`, e.target);
              }}
            >
                {tooltip}
            </TooltipContent>
        </Tooltip>

    </TooltipProvider>
  );
};

export default TooltipWrapper;


