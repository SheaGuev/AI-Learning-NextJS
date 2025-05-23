'use client';
import { createBClient } from '@/lib/server-actions/createClient';
import { workspace } from '@/supabase/supabase';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { FiBookOpen } from 'react-icons/fi';

interface SelectedWorkspaceProps {
  workspace: workspace;
  onClick?: (option: workspace) => void;
}

const SelectedWorkspace: React.FC<SelectedWorkspaceProps> = ({
  workspace,
  onClick,
}) => {
  const supabase = createBClient();
  const [workspaceLogo, setWorkspaceLogo] = useState('/cypresslogo.svg');
  useEffect(() => {
    if (workspace.logo) {
      const path = supabase.storage
        .from('workspace-logos')
        .getPublicUrl(workspace.logo)?.data.publicUrl;
      setWorkspaceLogo(path);
    }
  }, [workspace]);
  return (
    <Link
      href={`/dashboard/${workspace.id}`}
      onClick={() => {
        if (onClick) onClick(workspace);
      }}
      className="flex 
      rounded-md 
      hover:bg-muted 
      transition-all 
      flex-row 
      p-3 
      gap-4 
      justify-center 
      cursor-pointer 
      items-center 
      my-2"
    >
      <FiBookOpen className="h-8 w-8 text-violet-500" />
      <div className="flex flex-col">
        <p
          className="text-lg 
        w-[170px] 
        overflow-hidden 
        overflow-ellipsis 
        whitespace-nowrap
        font-medium"
        >
          {workspace.title}
        </p>
      </div>
    </Link>
  );
};

export default SelectedWorkspace;