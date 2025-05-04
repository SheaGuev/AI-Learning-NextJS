import React from 'react';
import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';

interface BreadCrumbsProps {
  breadCrumbs: { folderId: string; folderName: string; workspaceId: string }[];
}

const BreadCrumbs: React.FC<BreadCrumbsProps> = ({ breadCrumbs }) => {
  if (!breadCrumbs || !breadCrumbs.length) {
    return null;
  }
  
  return (
    <div className="flex items-center text-sm text-gray-400">
      {breadCrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.workspaceId + (crumb.folderId || '')}>
          {index > 0 && <FiChevronRight className="mx-2" />}
          
          <Link 
            href={index === 0 
              ? `/dashboard/${crumb.workspaceId}` 
              : `/dashboard/${crumb.workspaceId}/${crumb.folderId}`}
            className="hover:text-white transition-colors"
          >
            {crumb.folderName}
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
};

export default BreadCrumbs; 