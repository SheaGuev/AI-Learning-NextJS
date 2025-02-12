'use client';

import { AuthUser } from '@supabase/supabase-js';
import { Subscription } from '../../supabase/supabase';
import { getUserSubscriptionStatus } from '../../supabase/queries';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBClient } from '../server-actions/createClient';
// import { useToast } from '@/components/ui/use-toast';
import { useToast } from "@/hooks/use-toast"


type SupabaseUserContextType = {
  user: AuthUser | null;
  subscription: Subscription | null;
};

const SupabaseUserContext = createContext<SupabaseUserContextType>({
  user: null,
  subscription: null,
});

export const useSupabaseUser = () => {
  return useContext(SupabaseUserContext);
};

interface SupabaseUserProviderProps {
  children: React.ReactNode;
}

export const SupabaseUserProvider: React.FC<SupabaseUserProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const { toast } = useToast();

  const supabase = createBClient();

  //Fetch the user details
  //subscrip
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        console.log(user);
        setUser(user);
        const { data, error } = await getUserSubscriptionStatus(user.id);
        if (data) setSubscription(data);
        if (error) {
          toast({
            title: 'Unexpected Error',
            description:
              'Oppse! An unexpected error happened. Try again later.',
          });
        }
      }
    };
    getUser();
  }, [supabase, toast]);
  return (
    <SupabaseUserContext.Provider value={{ user, subscription }}>
      {children}
    </SupabaseUserContext.Provider>
  );
};