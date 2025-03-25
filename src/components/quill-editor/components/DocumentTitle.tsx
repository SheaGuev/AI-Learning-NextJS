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
    <div className="w-full self-center max-w-[800px] flex flex-col px-7 lg:my-8">
      <div className="text-[80px]">
        <EmojiPicker getValue={onIconChange}>
          <div
            className="w-[100px]
            cursor-pointer
            transition-colors
            h-[100px]
            flex
            items-center
            justify-center
            hover:bg-muted
            rounded-xl"
          >
            {iconId}
          </div>
        </EmojiPicker>
      </div>
      <span
        className="
        text-muted-foreground
        text-3xl
        font-bold
        h-9
        m-3
      "
      >
        {title}
      </span>
    </div>
  );
};

export default DocumentTitle; 