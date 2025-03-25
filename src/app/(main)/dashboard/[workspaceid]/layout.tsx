import MobileSidebar from '@/components/sidebar/mobile-sidebar';
import Sidebar from '@/components/sidebar/sidebar';
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  params: any;
}

const Layout: React.FC<LayoutProps> = ({ children, params }) => {
  return (
    <main
      className="flex overflow-hidden
      h-screen
      w-screen
  "
    >
      {/* Regular sidebar - only visible on sm screens and above */}
      <Sidebar 
        params={params} 
        className="hidden sm:flex" 
      />
      
      {/* Mobile sidebar - handles its own visibility */}
      <MobileSidebar>
        <Sidebar
          params={params}
          className="w-screen inline-block sm:hidden scrollbar-hide" 
        />
      </MobileSidebar>
      
      <div
        className="dark:boder-Neutrals-12/70
        border-l-[1px]
        w-full
        relative
        overflow-scroll
        scrollbar-hide
      "
      >
        {children}
      </div>   
    </main>
  );
};

export default Layout;