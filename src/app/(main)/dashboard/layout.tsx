// import { SubscriptionModalProvider } from '@/lib/providers/subscription-modal-provider';
// import { getActiveProductsWithPrice } from '@/supabase/queries';
import AppStateProvider from '@/lib/providers/state-provider';
import React from 'react';


interface LayoutProps {
  children: React.ReactNode;
  params: any;
}

const Layout: React.FC<LayoutProps> = async ({ children, params }) => {
  // const { data: products, error } = await getActiveProductsWithPrice();
  // if (error) throw new Error();
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