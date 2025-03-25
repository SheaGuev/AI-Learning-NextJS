export const dynamic = 'force-dynamic';

import React from 'react';
import QuillEditor from '@/components/quill-editor/quill-editor';
import { getFileDetails } from '@/supabase/queries';
import { redirect } from 'next/navigation';

const File = async ({ params }: { params: Promise<{ fileId: string }> }) => {
  const { fileId } = await params;
  const { data, error } = await getFileDetails(fileId);
  if (error || !data.length) redirect('/dashboard');

  return (
    <div className="relative ">
      <QuillEditor
        dirType="file"
        fileId={fileId}
        dirDetails={data[0] || {}}
        
      />
    </div>
  );
};

export default File;