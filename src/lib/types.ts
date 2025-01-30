import { workspace } from './../supabase/supabase';
import { createWorkspace } from './../supabase/queries';
import { z } from 'zod'

export const loginFormSchema = z.object({
  email: z.string().describe('Email required').email(),
  password: z.string().describe('Password required').min(8),
})  

export const createWorkspaceFormSchema = z.object({
  workspaceName:z.string()
  .describe('Workspace Name',  )
.min(4, 'Minimum of 4 characters'),
logo: z.any(),
 });