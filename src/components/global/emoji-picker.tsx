'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Simple, minimal emoji list to avoid browser crashes
const SAFE_EMOJIS = [
  "😀", "😁", "😂", "🙂", "😊", "😍", 
  "👍", "👎", "👏", "🙌", "👋", "✌️",
  "🎉", "🎊", "🎈", "🎁", "🎂", "🎄",
  "⭐", "🌟", "💫", "✨", "⚡", "🔥",
  "❤️", "💙", "💚", "💛", "💜", "🧡",
  "📚", "📝", "📒", "📂", "📁", "📊"
];

interface EmojiPickerProps {
  children: React.ReactNode;
  getValue?: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ children, getValue }) => {
  // Simple handler that won't crash
  const handleEmojiSelect = (emoji: string) => {
    if (getValue) {
      try {
        getValue(emoji);
      } catch (error) {
        console.log('Error selecting emoji:', error);
      }
    }
  };

  return (
    <div className="flex items-center">
      <Popover>
        <PopoverTrigger className="cursor-pointer">{children}</PopoverTrigger>
        <PopoverContent className="p-2 w-[240px] border-none">
          <div className="grid grid-cols-6 gap-2">
            {SAFE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EmojiPicker;