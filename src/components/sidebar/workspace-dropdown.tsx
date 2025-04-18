'use client';
import { useAppState } from '@/lib/providers/state-provider';
import { workspace } from '@/supabase/supabase';
import React, { useEffect, useState } from 'react';
import SelectedWorkspace from './selected-workspace';
import WorkspaceCreator from '../global/workspace-creator';
import CustomDialogTrigger from '../global/custom-dialog-trigger';

interface WorkspaceDropdownProps {
  privateWorkspaces: workspace[] | [];
  sharedWorkspaces: workspace[] | [];
  collaboratingWorkspaces: workspace[] | [];
  defaultValue: workspace | undefined;
}

const WorkspaceDropdown: React.FC<WorkspaceDropdownProps> = ({
  privateWorkspaces,
  collaboratingWorkspaces,
  sharedWorkspaces,
  defaultValue,
}) => {
  const { dispatch, state } = useAppState();
  const [selectedOption, setSelectedOption] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!state.workspaces.length) {
      dispatch({
        type: 'SET_WORKSPACES',
        payload: {
          workspaces: [
            ...privateWorkspaces,
            ...sharedWorkspaces,
            ...collaboratingWorkspaces,
          ].map((workspace) => ({ ...workspace, folders: [] })),
        },
      });
    }
  }, [privateWorkspaces, collaboratingWorkspaces, sharedWorkspaces]);

  const handleSelect = (option: workspace) => {
    setSelectedOption(option);
    setIsOpen(false);
  };

  useEffect(() => {
    const findSelectedWorkspace = state.workspaces.find(
      (workspace) => workspace.id === defaultValue?.id
    );
    if (findSelectedWorkspace) setSelectedOption(findSelectedWorkspace);
  }, [state, defaultValue]);

  return (
    <div
      className=" relative inline-block
      text-left scrollbar-thin over over
      w-full 
  "
    >
      <div>
        <span onClick={() => setIsOpen(!isOpen)}
              className="text-base cursor-pointer text-gray-50 ">
          {selectedOption ? (
            <SelectedWorkspace workspace={selectedOption} />
          ) : (
            'Select a workspace'
          )}
        </span>
      </div>
      {isOpen && (
        <div
          className="origin-top-right
          absolute
          w-full
          rounded-md
          shadow-md
          z-50
          h-[240px]
          bg-black
          group
          overflow-scroll
          border-[1px]
          border-gray-800
          overflow-x-hidden
      "
        >
          <div className="rounded-md flex flex-col">
            <div className="!p-4">
              {!!privateWorkspaces.length && (
                <>
                  <p className="text-muted-foreground text-base font-medium mb-1">Private</p>
                  <hr className="mb-2"></hr>
                  {privateWorkspaces.map((option) => (
                    <SelectedWorkspace
                      key={option.id}
                      workspace={option}
                      onClick={handleSelect}
                    />
                  ))}
                </>
              )}
              {!!sharedWorkspaces.length && (
                <>
                  <p className="text-muted-foreground text-base font-medium mb-1 mt-3">Shared</p>
                  <hr className="mb-2" />
                  {sharedWorkspaces.map((option) => (
                    <SelectedWorkspace
                      key={option.id}
                      workspace={option}
                      onClick={handleSelect}
                    />
                  ))}
                </>
              )}
              {!!collaboratingWorkspaces.length && (
                <>
                  <p className="text-muted-foreground text-base font-medium mb-1 mt-3">Collaborating</p>
                  <hr className="mb-2" />
                  {collaboratingWorkspaces.map((option) => (
                    <SelectedWorkspace
                      key={option.id}
                      workspace={option}
                      onClick={handleSelect}
                    />
                  ))}
                </>
              )}
            </div>
            <CustomDialogTrigger
              header="Create A Workspace"
              content={<WorkspaceCreator />}
              description="Workspaces give you the power to collaborate with others. You can change your workspace privacy settings after creating the workspace too."
            >
              <div
                className="flex 
              transition-all 
              hover:bg-muted 
              justify-center 
              items-center 
              gap-2 
              p-3 
              w-full
              text-base"
              >
                <article
                  className="text-slate-500 
                rounded-full
                 bg-slate-800 
                 w-5 
                 h-5 
                 flex 
                 items-center 
                 justify-center"
                >
                  +
                </article>
                Create workspace
              </div>
            </CustomDialogTrigger>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDropdown;