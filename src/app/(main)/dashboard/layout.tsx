'use client';

// import { SubscriptionModalProvider } from '@/lib/providers/subscription-modal-provider';
// import { getActiveProductsWithPrice } from '@/supabase/queries';
import AppStateProvider from '@/lib/providers/state-provider';
import React, { useEffect } from 'react';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  params: any;
}

const Layout: React.FC<LayoutProps> = ({ children, params }) => {
  const { user } = useSupabaseUser();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (user === null) {
      // Add a small delay to avoid flickering during initial load
      const redirectTimer = setTimeout(() => {
        console.log('No user found, redirecting to login');
        router.push('/login');
      }, 1000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, router]);

  // Show loading state while checking authentication
  // if (user === null) {
  //   return (
  //     <div className="flex items-center justify-center h-screen w-screen">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //       <p className="ml-2">Checking authentication...</p>
  //     </div>
  //   );
  // }

  return (
    <main className="flex over-hidden h-screen">
      {/* <SubscriptionModalProvider products={products}> */}
      <AppStateProvider>
        {children}
      </AppStateProvider>
      {/* </SubscriptionModalProvider> */}
    </main>
  );
};

export default Layout;