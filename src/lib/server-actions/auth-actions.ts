"use server";

import { z } from "zod";
import { loginFormSchema } from "@/lib/types";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// import { createClient } from '@supabase/supabase-js';
import { createBClient } from './createClient';
import { createSClient } from './createServerClient';

export async function actionLoginUser({
    email,
    password,
  }: z.infer<typeof loginFormSchema>) {
    try {
      const supabase = await createSClient();

      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return response;
    } catch (error) {
      console.error('Login error:', error);
      return { 
        data: { user: null, session: null }, 
        error: { message: error instanceof Error ? error.message : 'An unexpected error occurred during login' } 
      };
    }
  }
  


  export async function actionSignUpUser({
    email,
    password,
  }: z.infer<typeof loginFormSchema>) {

    try{
      const supabase = await createSClient();
      const { data } = await supabase.from('users').select('*').ilike('email', email).throwOnError();

      if (data?.length) return { error: { message: 'User already exists', data } };

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}email`,
        },
      });

      if (signUpError) {
        return { error: { message: 'Sign-up failed', details: signUpError } };
      }

      return { data: signUpData };
    } catch (error) {
      console.error('Signup error:', error);
      return { error: { message: 'Unexpected error occurred', details: error } };
    }
  }