import React from 'react';
import { cookies } from 'next/headers';
import { createBClient } from '@/lib/server-actions/createClient';
import { createSClient } from '@/lib/server-actions/createServerClient';
import db from '../../../supabase/db';
import { redirect } from 'next/navigation';
import DashboardSetup from '@/components/dashboard-setup/dashboard-setup';
import { getUserSubscriptionStatus } from '../../../supabase/queries';



const DashboardPage = async () => {
  const supabase = await createSClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const workspace = await db.query.workspaces.findFirst({
    where: (workspace, { eq }) => eq(workspace.workspaceOwner, user.id),
  });

  const { data: subscription, error: subscriptionError } =
    await getUserSubscriptionStatus(user.id);

  if (subscriptionError) return;

  if (!workspace)
    return (
      <div
        className="bg-background
        h-screen
        w-screen
        flex
        justify-center
        items-center
  " 
      > 
        <DashboardSetup
          user={user}
          subscription={subscription}
        />
      </div>
    );

  redirect(`/dashboard/${workspace.id}`);
};

export default DashboardPage;