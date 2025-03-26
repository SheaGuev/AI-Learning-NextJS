import { workspace } from './../supabase/supabase';
import { createWorkspace } from './../supabase/queries';
import { z } from 'zod'
// import { Socket } from 'socket.io-client';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Socket, Server as NetServer } from 'net';


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

 export const UploadBannerFormSchema = z.object({
  banner: z.string().describe('Banner Image'),
});

export type NextApiResponseServerIo = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};