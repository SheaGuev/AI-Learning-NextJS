import Link from 'next/link';
import React from 'react';
import { twMerge } from 'tailwind-merge';
// import CypressHomeIcon from '../icons/cypressHomeIcon';
// import CypressSettingsIcon from '../icons/cypressSettingsIcon';
// import CypressTrashIcon from '../icons/cypressTrashIcon';
import Settings from '../settings/settings';
import Trash from '../trash/trash';

import { FiHome } from "react-icons/fi";
import { FiSettings } from "react-icons/fi";
import { FiTrash2 } from "react-icons/fi";


interface NativeNavigationProps {
  myWorkspaceId: string;
  className?: string;
}

const NativeNavigation: React.FC<NativeNavigationProps> = ({
  myWorkspaceId,
  className,
}) => {
  return (
    <nav className={twMerge('my-2', className)}>
      <ul className="flex flex-col gap-2">
        <li>
          <Link
            className="group/native
            flex
            text-Neutrals/neutrals-7
            transition-all
            gap-2
          "
            href={`/dashboard/${myWorkspaceId}`}
          >
            <FiHome />
            <span>My Workspace</span>
          </Link>
        </li>

        <Settings>
          <li
            className="group/native
            flex
            text-Neutrals/neutrals-7
            transition-all
            gap-2
            cursor-pointer
          "
          >
            <FiSettings />
            <span>Settings</span>
          </li>
        </Settings>

        <Trash>
          <li
            className="group/native
            flex
            text-Neutrals/neutrals-7
            transition-all
            gap-2
          "
          >
            <FiTrash2 />
            <span>Trash</span>
          </li>
        </Trash>
      </ul>
    </nav>
  );
};

export default NativeNavigation;