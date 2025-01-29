import React from 'react';
import { createServerClient, createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createBClient } from '@/lib/server-actions/createClient';
// import { createSClient } from '@/lib/server-actions/createServerClient';
import db from '../../../supabase/db';
import { redirect } from 'next/navigation';
import DashboardSetup from '@/components/dashboard-setup/dashboard-setup';
import { getUserSubscriptionStatus } from '@/lib/supabase/queries';



const DashboardPage: React.FC = async () => {
  const supabase = createBClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>loading...</div>;
  }

  const workspace = await db.query.workspaces.findFirst({
    where: (workspace, { eq }) => eq(workspace.workspaceOwner, user.id),
  });

  const { data: subscription, error: subscriptionError } =
    await getUserSubscriptionStatus(user.id);

  if (subscriptionError) return;
  return <div>Dashboard</div>;
};

export default DashboardPage;