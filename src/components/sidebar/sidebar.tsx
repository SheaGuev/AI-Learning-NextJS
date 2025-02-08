import { createSClient } from '@/lib/server-actions/createServerClient';
import { getCollaboratingWorkspaces, getFolders, getPrivateWorkspaces, getSharedWorkspaces, getUserSubscriptionStatus } from '@/supabase/queries';
// import { redirect } from 'next/navigation;
import { RedirectType, redirect } from 'next/navigation';
import React from 'react'
import { twMerge } from 'tailwind-merge';

interface sidebarProps {
    params: {workspaceId: string};
    className?: string;
}
const Sidebar: React.FC<sidebarProps> = async ({params, className}) => {
  const supabase = await createSClient();
  //user

  const { data: { user } } = await supabase.auth.getUser();

if (!user) return;

//subscriptions
const { data: subStatus, error: subError } = await getUserSubscriptionStatus(user.id);

  //folders/

const { data: folders, error: folderError } = await getFolders(params.workspaceId);
  
if (subError || folderError) console.log(subError ||  folderError);
// redirect('/dashboard');

const [privateWorkspaces, collaboratingWorkspaces, sharedWorkpaces] = 
await Promise.all([
    getPrivateWorkspaces(user.id),
    getCollaboratingWorkspaces(user.id),
    getSharedWorkspaces(user.id),
]);

    return (
    <aside className={twMerge("hidden !justify-between sm:fkex sm:flex-col w-[280px] shrink-0p-4 md:gap-4" , className)}>

        

    </aside>
  )
}

export default Sidebar