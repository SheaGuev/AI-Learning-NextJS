import { createSClient } from '@/lib/server-actions/createServerClient';
import { getCollaboratingWorkspaces, getFolders, getPrivateWorkspaces, getSharedWorkspaces, getUserSubscriptionStatus } from '@/supabase/queries';
// import { redirect } from 'next/navigation;
import { RedirectType, redirect } from 'next/navigation';
import React from 'react'
import { twMerge } from 'tailwind-merge';
import WorkspaceDropdown from './workspace-dropdown';
import NativeNavigation from './native-navigation';
import { ScrollArea } from '../ui/scroll-area';
import FoldersDropdownList from './folders-dropdown-list';

interface sidebarProps {
    params: {workspaceid: string};
    className?: string;
}
const Sidebar: React.FC<sidebarProps> = async ({params, className}) => {
  const supabase = await createSClient();
  //user

  const { data: { user } } = await supabase.auth.getUser();

if (!user) return;

console.log(params);

//subscriptions
const { data: subStatus, error: subError } = await getUserSubscriptionStatus(user.id);

  //folders/

const { workspaceid } = await params;

const { data: folders, error: folderError } = await getFolders(workspaceid);


const { data: workspaceFolderData, error: foldersError } = await getFolders(
  params.workspaceid
);
  
if (subError || folderError) console.log(subError ||  folderError);
// redirect('/dashboard');

const [privateWorkspaces, collaboratingWorkspaces, sharedWorkspaces] = 
await Promise.all([
    getPrivateWorkspaces(user.id),
    getCollaboratingWorkspaces(user.id),
    getSharedWorkspaces(user.id),
]);



    return (
    <aside className={twMerge("scrollbar-thin overflow-hidden !justify-between sm:fkex sm:flex-col w-[280px] shrink-0p-4 md:gap-4" , className)}>

    <div>
        <WorkspaceDropdown
          privateWorkspaces={privateWorkspaces}
          sharedWorkspaces={sharedWorkspaces}
          collaboratingWorkspaces={collaboratingWorkspaces}
          defaultValue={[
            ...privateWorkspaces,
            ...collaboratingWorkspaces,
            ...sharedWorkspaces,
          ].find((workspace) => workspace.id === workspaceid)}
        />

        <NativeNavigation myWorkspaceId={params.workspaceid} />
                <ScrollArea
                  className="overflow-scroll relative
                  h-[450px]
                "
                >
                  <div
                    className="pointer-events-none 
                  w-full 
                  absolute 
                  bottom-0 
                  h-20 
                  bg-gradient-to-t 
                  from-background 
                  to-transparent 
                  z-40"
                  />
                  <FoldersDropdownList
                    workspaceFolders={workspaceFolderData || []}
                    workspaceId={params.workspaceid}
                  />
                </ScrollArea>



        </div>


        

        </aside>
  )
}

export default Sidebar



