// 


"use server";

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient1() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll: async (cookiesToSet) => {
          try {
            const currentCookies = cookieStore.getAll();
            cookiesToSet.forEach(({ name, value, options }) => {
              // Update only changed cookies
              if (currentCookies.find(c => c.name === name)?.value !== value) {
                cookieStore.set(name, value, options);
              }
            });
          } catch (error) {
            console.error('Cookie setAll error:', error);
            // Add error handling logic if needed
          }
        },
      },
    }
  );
}