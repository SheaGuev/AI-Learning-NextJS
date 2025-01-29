"use server";

import { z } from "zod";
import { loginFormSchema } from "@/lib/types";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { createClient1 } from './create-client';
// import { createClient } from '@supabase/supabase-js';
import { createSClient } from './createServerClient';

export async function actionLoginUser({
    email,
    password,
  }: z.infer<typeof loginFormSchema>) {
    const cookieStore = await cookies()
    const supabase = await createSClient();
    // const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    //     {
    //       cookies: {
    //         getAll() {
    //           return cookieStore.getAll()
    //         },
    //         setAll(cookiesToSet) {
    //           try {
    //             cookiesToSet.forEach(({ name, value, options }) =>
    //               cookieStore.set(name, value, options)
    //             )
    //           } catch {
    //             // The `setAll` method was called from a Server Component.
    //             // This can be ignored if you have middleware refreshing
    //             // user sessions.
    //           }
    //         },
    //       },
    //     }
    //   );

    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return response;
  }
  

//   export async function actionSignUpUser({
//     email,
//     password,
//   }: z.infer<typeof loginFormSchema>) {
//     const cookieStore = await cookies()
//     const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//         {
//           cookies: {
//             getAll() {
//               return cookieStore.getAll()
//             },
//             setAll(cookiesToSet) {
//               try {
//                 cookiesToSet.forEach(({ name, value, options }) =>
//                   cookieStore.set(name, value, options)
//                 )
//               } catch {
//                 // The `setAll` method was called from a Server Component.
//                 // This can be ignored if you have middleware refreshing
//                 // user sessions.
//               }
//             },
//           },
//         }
//       );
        
//       const { data } = await supabase
//       .from('profiles')
//       .select('*')
//       .eq('email', email);
  
//     if (data?.length) return { error: { message: 'User already exists', data } };
//     const response = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}api/auth/callback`,
//       },
//     });
//     return response;
// }

// export async function actionSignUpUser({
  //   email,
  //   password,
  // }: z.infer<typeof loginFormSchema>) {
  //   const supabase = createClient1()

  
  //   try {
  //     const { data, error } = await supabase.auth.signUp({
  //       email,
  //       password,
  //       options: {
  //         emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
  //       },
  //     })
      
  //     if (error) throw error
  //     return { data }
  //   } catch (error) {
  //     return { error: { message: 'Sign-up failed', error } }
  //   }
  // // }
  

  export async function actionSignUpUser({
    email,
    password,
  }: z.infer<typeof loginFormSchema>) {

    try{
    const supabase = await createClient1();

      
        const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

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
    return { error: { message: 'Unexpected error occurred', details: error } };
  }}