import React from 'react';
import { cookies } from 'next/headers';
// import { createBClient } from '@/lib/server-actions/createClient';
import { createSClient } from '@/lib/server-actions/createServerClient';
import db from '@/supabase/db';
import { redirect } from 'next/navigation';
import DashboardSetup from '@/components/dashboard-setup/dashboard-setup';
import { getUserSubscriptionStatus } from '../../../supabase/queries';
import AppStateProvider from '../../../lib/providers/state-provider';
import AiTutor from '@/components/dashboard-tools/ai-tutor/ai-tutor';
import { workspaces } from '@/supabase/schema';
import { eq } from 'drizzle-orm';

const DashboardPage = async () => {
  console.log("retrieving data...")
  const supabase = await createSClient();
  console.log("supabase")
  const {
    data: { user },
  } = await supabase.auth.getUser(); 
  
  // const {
  //   data: { user },
  // } = await supabase.getSession().session.user

  if (!user) return (console.error('No user found'));

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.workspaceOwner, user.id)).limit(1).execute();

  const { data: subscription, error: subscriptionError } =
    await getUserSubscriptionStatus(user.id);

  if (subscriptionError) return(console.error(subscriptionError));

  if (workspace && subscription) {
    redirect(`/dashboard/${workspace.id}`);
  }

  if(workspace) {
    redirect(`/dashboard/${workspace.id}`);};


  if (!workspace) 
    return (
      <div
        className="bg-background
        h-screen
        w-screen
        flex
        justify-center
        items-center"> 

        <DashboardSetup
          user={user}
          subscription={subscription}
        />
      </div>
    );
    // redirect(`/dashboard/${workspace.id}`);

  // If workspace exists, show dashboard with AI Tutor
  
};

export default DashboardPage;



// DB SETUP YEAH
        