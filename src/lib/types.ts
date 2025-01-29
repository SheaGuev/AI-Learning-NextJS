import { z } from 'zod'

export const loginFormSchema = z.object({
  email: z.string().describe('Email required').email(),
  password: z.string().describe('Password required').min(8),
})  