'use client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Ll from '@/components/icons/ll';
import Loader from '../../../components/global/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LayoutListIcon, MailCheck } from 'lucide-react';
import { loginFormSchema } from '@/lib/types';
import { actionSignUpUser } from '@/lib/server-actions/auth-actions';

const SignUpFormSchema = z
  .object({
    email: z.string().describe('Email').email({ message: 'Invalid Email' }),
    password: z
      .string()
      .describe('Password')
      .min(6, 'Password must be minimum 6 characters'),
    confirmPassword: z
      .string()
      .describe('Confirm Password')
      .min(6, 'Password must be minimum 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

const Signup = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [asyncSearchParams, setAsyncSearchParams] = useState<URLSearchParams | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [confirmation, setConfirmation] = useState(false);

  // Manually wrap the synchronous searchParams in a promise
  useEffect(() => {
    Promise.resolve(searchParams).then((params) => {
      setAsyncSearchParams(params);
    });
  }, [searchParams]);

  const codeExchangeError = useMemo(() => {
    if (!asyncSearchParams) return '';
    return asyncSearchParams.get('error_description') || '';
  }, [asyncSearchParams]);

  const confirmationAndErrorStyles = useMemo(
    () =>
      clsx('bg-primary', {
        'bg-red-500/10': codeExchangeError,
        'border-red-500/50': codeExchangeError,
        'text-red-700': codeExchangeError,
      }),
    [codeExchangeError]
  );

  const form = useForm<z.infer<typeof SignUpFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const isLoading = form.formState.isSubmitting;
  const onSubmit = async ({ email, password }: z.infer<typeof SignUpFormSchema>) => {
    try {
      const result = await actionSignUpUser({ email, password });
      
      if (!result) {
        // Handle case where server action returned undefined (server deployment changed)
        setSubmitError('Session expired. Please refresh the page and try again.');
        form.reset();
        return;
      }
      
      const { error } = result;
      
      if (error) {
        setSubmitError(error.message);
        console.log(error.message);
        form.reset();
        return;
      }
      
      setConfirmation(true);
    } catch (error) {
      console.error('Signup error:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
      form.reset();
    }
  };

  return (
    <Suspense>
      <Form {...form}>
        <form
          onChange={() => {
            if (submitError) setSubmitError('');
          }}
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full sm:justify-center sm:w-[400px] space-y-6 flex flex-col"
        >
          <Link href="/" className="w-full flex justify-left items-center">
            <Ll />
            <span className="font-semibold dark:text-white text-4xl first-letter:ml-2">
              Lateral Learning AI
            </span>
          </Link>
          <FormDescription className="text-foreground/60">
            An all-In-One Collaboration and Productivity Platform
          </FormDescription>
          {!confirmation && !codeExchangeError && (
            <>
              <FormField
                disabled={isLoading}
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isLoading}
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                disabled={isLoading}
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="password" placeholder="Confirm Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full p-6" disabled={isLoading}>
                {!isLoading ? 'Create Account' : <Loader />}
              </Button>
            </>
          )}

          {submitError && <FormMessage>{submitError}</FormMessage>}
          <span className="self-container">
            Already have an account?{' '}
            <Link href="/login" className="text-primary">
              Login
            </Link>
          </span>
          {(confirmation || codeExchangeError) && (
            <Alert className={confirmationAndErrorStyles}>
              {!codeExchangeError && <MailCheck className="h-4 w-4" />}
              <AlertTitle>
                {codeExchangeError ? 'Invalid Link' : 'Check your email.'}
              </AlertTitle>
              <AlertDescription>
                {codeExchangeError || 'An email confirmation has been sent.'}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </Suspense>
  );
};

export default Signup;
