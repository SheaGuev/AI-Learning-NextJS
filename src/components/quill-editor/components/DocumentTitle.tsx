import React from 'react';
import EmojiPicker from '../../global/emoji-picker';

interface DocumentTitleProps {
  title: string;
  iconId: string;
  onIconChange: (icon: string) => Promise<void>;
}

const DocumentTitle: React.FC<DocumentTitleProps> = ({
  title,
  iconId,
  onIconChange
}) => {
  return (
    <div className="w-full self-start max-w-[1200px] flex flex-col px-2 lg:my-6">
      <div className="text-[65px]">
        <EmojiPicker getValue={onIconChange}>
          <span
            className="w-[80px]
            cursor-pointer
            transition-colors
            h-[80px]
            flex
            items-center
            justify-center
            hover:bg-muted
            rounded-xl"
          >
            {iconId}
          </span>
        </EmojiPicker>
      </div>
      <span
        className="
        text-muted-foreground
        text-3xl
        font-bold
        h-9
        ml-2
        mt-4
      "
      >
        {title}
      </span>
    </div>
  );
};

export default DocumentTitle; 