export const dynamic = 'force-dynamic';

import DashboardTools from '@/components/dashboard/dashboard-tools';
import { getWorkspaceDetails } from '@/supabase/queries';
import { redirect } from 'next/navigation';
import React from 'react';

type Params = Promise<{ workspaceid: string }>;

const Workspace = async ({ params }: { params: Params }) => {
  const { workspaceid } = await params;
  const { data, error } = await getWorkspaceDetails(workspaceid);
    // if (error || !data.length) redirect('/dashboard');

  return (
    <div className="p-6 bg-gradient-to-br from-black via-black to-indigo-950 min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <DashboardTools />
      </div>
    </div>
  );
};

export default Workspace;