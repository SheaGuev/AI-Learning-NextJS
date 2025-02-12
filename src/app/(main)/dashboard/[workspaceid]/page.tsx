export const dynamic = 'force-dynamic';

// import { QuillEditor } from '@/components/quill-editor/quill-editor';
import { getWorkspaceDetails } from '@/supabase/queries';
import { redirect } from 'next/navigation';
import React from 'react';

const Workspace = async ({ params }: { params: { workspaceid: string } }) => {
  const { data, error } = await getWorkspaceDetails(params.workspaceid);
  // if (error || !data.length) redirect('/dashboard');
  return (
    <div className="relative">
      
      {/* <QuillEditor
        dirType="workspace"
        fileId={params.workspaceId}
        dirDetails={data[0] || {}}
      /> */}
    </div>
  );
};

export default Workspace;