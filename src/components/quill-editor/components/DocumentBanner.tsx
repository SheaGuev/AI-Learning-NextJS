import React from 'react';
import Image from 'next/image';
import { Button } from '../../ui/button';
import { XCircleIcon } from 'lucide-react';
import { createBClient } from '@/lib/server-actions/createClient';

interface DocumentBannerProps {
  bannerUrl: string | null;
  onDeleteBanner: () => Promise<void>;
  deletingBanner: boolean;
}

const DocumentBanner: React.FC<DocumentBannerProps> = ({
  bannerUrl,
  onDeleteBanner,
  deletingBanner
}) => {
  const supabase = createBClient();
  
  if (!bannerUrl) return null;

  return (
    <>
      <div className="relative w-full h-[200px]">
        <Image
          src={
            supabase.storage
              .from('file-banners')
              .getPublicUrl(bannerUrl).data.publicUrl
          }
          fill
          className="w-full md:h-48
          h-20
          object-cover"
          alt="Banner Image"
        />
      </div>
      <div className="flex">
        <Button
          disabled={deletingBanner}
          onClick={onDeleteBanner}
          variant="ghost"
          className="gap-2 hover:bg-background
          flex
          item-center
          justify-center
          mt-2
          text-sm
          text-muted-foreground
          w-36
          p-2
          rounded-md"
        >
          <XCircleIcon size={16} />
          <span className="whitespace-nowrap font-normal">
            Remove Banner
          </span>
        </Button>
      </div>
    </>
  );
};

export default DocumentBanner; 