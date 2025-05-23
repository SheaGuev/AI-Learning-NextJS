'use client';
import { useAppState } from '@/lib/providers/state-provider';
import { Folder } from '@/supabase/supabase';
import React, { useEffect, useState } from 'react';
// import TooltipComponent from '../global/tooltip-component';
import { PlusIcon } from 'lucide-react';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { v4 } from 'uuid';
import { createFolder } from '@/supabase/queries';
import { useToast } from '@/lib/hooks/use-toast';
import { Accordion } from '../ui/accordion';
import TooltipWrapper from '../global/tooltip-wrapper';
import Dropdown from './Dropdown';
// import useSupabaseRealtime from '@/lib/hooks/useSupabaseRealtime';
// import { useSubscriptionModal } from '@/lib/providers/subscription-modal-provider';

interface FoldersDropdownListProps {
  workspaceFolders: Folder[];
  workspaceId: string;
}

const FoldersDropdownList: React.FC<FoldersDropdownListProps> = ({
  workspaceFolders,
  workspaceId,
}) => {
  // useSupabaseRealtime();
  const { state, dispatch, folderId } = useAppState();
//   const { open, setOpen } = useSubscriptionModal();
  const { toast } = useToast();
  const [folders, setFolders] = useState(workspaceFolders);
  const { subscription } = useSupabaseUser();

  //effec set nitial satte server app state
  useEffect(() => {
    if (workspaceFolders.length > 0) {
      dispatch({
        type: 'SET_FOLDERS',
        payload: {
          workspaceId,
          folders: workspaceFolders.map((folder) => ({
            ...folder,
            files:
              state.workspaces
                .find((workspace) => workspace.id === workspaceId)
                ?.folders.find((f) => f.id === folder.id)?.files || [],
          })),
        },
      });
    }
  }, [workspaceFolders, workspaceId]);
  //state

  useEffect(() => {
    setFolders(
      state.workspaces.find((workspace) => workspace.id === workspaceId)
        ?.folders || []
    );
  }, [state]);

  //add folder
  const addFolderHandler = async () => {
    // if (folders.length >= 3 && !subscription) {
      // setOpen(true);
      // return;
    // }
    const newFolder: Folder = {
      data: null,
      id: v4(),
      createdAt: new Date().toISOString(),
      title: 'Untitled',
      iconId: '📂',
      inTrash: null,
      workspaceId,
      bannerUrl: '',
    };
    dispatch({
      type: 'ADD_FOLDER',
      payload: { workspaceId, folder: { ...newFolder, files: [] } },
    });
    const { data, error } = await createFolder(newFolder);
    if (error) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: 'Could not create the folder',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Created folder.',
      });
    }
  };

  return (
    <>
      <div
        className="flex
        sticky 
        z-20 
        top-0 
        bg-neutral-950
        w-full  
        h-10 
        group/title 
        justify-between 
        items-center 
        pr-4 
        pl-2
        text-neutral-100
  "
      >
        <span
          className="text-neutral-300
        font-bold 
        text-sm"
        >
          FOLDERS
        </span>
        <TooltipWrapper tooltip="Create Folder">
          <span className="inline-flex p-1 hover:bg-slate-600 rounded-full transition-colors opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 ease-in-out">
            <PlusIcon
              onClick={addFolderHandler}
              size={16}
              className="cursor-pointer
              hover:dark:text-white
            "
            />
          </span>
        </TooltipWrapper>
      </div>
      <Accordion
        type="multiple"
        defaultValue={[folderId || '']}
        className="pb-20"
      >
        {folders
          .filter((folder) => !folder.inTrash)
          .map((folder) => (
            <Dropdown
              key={folder.id}
              title={folder.title}
              listType="folder"
              id={folder.id}
              iconId={folder.iconId}
            />
          ))
          }
      </Accordion>
    </>
  );
};

export default FoldersDropdownList;