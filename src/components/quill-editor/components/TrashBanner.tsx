import React from 'react';
import { Button } from '../../ui/button';

interface TrashBannerProps {
  dirType: 'workspace' | 'folder' | 'file';
  inTrash: string | null;
  onRestore: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const TrashBanner: React.FC<TrashBannerProps> = ({
  dirType,
  inTrash,
  onRestore,
  onDelete
}) => {
  if (!inTrash) return null;

  return (
    <article
      className="py-2 
      z-40 
      bg-[#EB5757] 
      flex  
      md:flex-row 
      flex-col 
      justify-center 
      items-center 
      gap-4 
      flex-wrap"
    >
      <div
        className="flex 
        flex-col 
        md:flex-row 
        gap-2 
        justify-center 
        items-center"
      >
        <span className="text-white">
          This {dirType} is in the trash.
        </span>
        <Button
          size="sm"
          variant="outline"
          className="bg-transparent
            border-white
            text-white
            hover:bg-white
            hover:text-[#EB5757]
          "
          onClick={onRestore}
        >
          Restore
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="bg-transparent
            border-white
            text-white
            hover:bg-white
            hover:text-[#EB5757]
          "
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
      <span className="text-sm text-white">{inTrash}</span>
    </article>
  );
};

export default TrashBanner; 