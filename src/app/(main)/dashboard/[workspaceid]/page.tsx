export const dynamic = 'force-dynamic';

// import { QuillEditor } from '@/components/quill-editor/quill-editor';
import { getWorkspaceDetails } from '@/supabase/queries';
import { redirect } from 'next/navigation';
import React from 'react';

type Params = Promise<{ workspaceid: string }>;

const Workspace = async ({ params }: { params: Params }) => {
  const { workspaceid } = await params;
  const { data, error } = await getWorkspaceDetails(workspaceid);
    // if (error || !data.length) redirect('/dashboard');
  return (
    <div className="relative scrollbar-hide">
      
      {/* <QuillEditor
        dirType="workspace"
        fileId={params.workspaceId}
        dirDetails={data[0] || {}}
      /> */}
    </div>
  );
};

export default Workspace;