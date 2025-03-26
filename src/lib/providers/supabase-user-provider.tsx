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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const supabase = createBClient();

  // Debug function to check environment variables
  useEffect(() => {
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  // Fetch the user details
  useEffect(() => {
    const getUser = async () => {
      try {
        console.log('Fetching user...');
        setIsLoading(true);
        
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast({
            title: 'Session Error',
            description: 'Could not retrieve your session. Please try logging in again.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        
        console.log('Session data:', sessionData);
        
        if (!sessionData.session) {
          console.log('No active session found');
          setIsLoading(false);
          return;
        }
        
        // Get user data
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('User error:', userError);
          toast({
            title: 'Authentication Error',
            description: 'Could not retrieve user information.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        
        if (user) {
          console.log('User found:', user);
          setUser(user);
          
          // Get subscription data
          const { data, error } = await getUserSubscriptionStatus(user.id);
          if (data) {
            console.log('Subscription data:', data);
            setSubscription(data);
          }
          if (error) {
            console.error('Subscription error:', error);
            toast({
              title: 'Subscription Error',
              description: 'Could not retrieve subscription information.',
              variant: 'destructive',
            });
          }
        } else {
          console.log('No user found despite having a session');
        }
      } catch (error) {
        console.error('Unexpected error in getUser:', error);
        toast({
          title: 'Unexpected Error',
          description: 'An unexpected error occurred while retrieving user data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    getUser();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const { data } = await getUserSubscriptionStatus(session.user.id);
          if (data) setSubscription(data);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSubscription(null);
        }
      }
    );
    
    // Clean up the listener
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, toast]);

  return (
    <SupabaseUserContext.Provider value={{ user, subscription }}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading user information...</p>
        </div>
      ) : (
        children
      )}
    </SupabaseUserContext.Provider>
  );
};