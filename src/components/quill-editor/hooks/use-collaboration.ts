import { useState, useEffect } from 'react';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { useSocket } from '@/lib/providers/socket-provider';
import { findUser } from '@/supabase/queries';
import { createBClient } from '@/lib/server-actions/createClient';
import { Collaborator } from '../types';

export const useCollaboration = (quill: any, fileId: string) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [localCursors, setLocalCursors] = useState<any>([]);
  const { socket, isConnected } = useSocket();
  const { user } = useSupabaseUser();
  const supabase = createBClient();

  // Set up socket room for collaboration
  useEffect(() => {
    if (!socket || !fileId) return;
    
    // Create a room for this document
    console.log('Socket connection setup for collaboration');
    
    if (socket.connected) {
      console.log('Socket already connected, creating room now');
      socket.emit('create-room', fileId);
    }
    
    // Connect handler for room creation
    const handleSocketConnect = () => {
      console.log('Socket reconnected, reattaching handlers');
      socket.emit('create-room', fileId);
    };
    
    socket.on('connect', handleSocketConnect);
    
    return () => {
      socket.off('connect', handleSocketConnect);
    };
  }, [socket, fileId]);
  
  // Handle document changes from other users
  useEffect(() => {
    if (!quill || !socket || !fileId) return;
    
    const socketHandler = (deltas: any, id: string) => {
      if (id === fileId) {
        quill.updateContents(deltas);
      }
    };
    
    socket.on('receive-changes', socketHandler);
    
    return () => {
      socket.off('receive-changes', socketHandler);
    };
  }, [quill, socket, fileId]);
  
  // Set up cursor tracking for collaborators
  useEffect(() => {
    if (!fileId || !quill) return;
    
    const room = supabase.channel(fileId);
    const subscription = room
      .on('presence', { event: 'sync' }, () => {
        const newState = room.presenceState();
        const newCollaborators = Object.values(newState).flat() as any[];
        
        // Filter out duplicate collaborators by ID
        const uniqueCollaborators = Array.from(
          new Map(
            newCollaborators.map((collab: Collaborator) => 
              [collab.id, collab]
            )
          ).values()
        ) as Collaborator[];
        
        setCollaborators(uniqueCollaborators);

        if (user) {
          const allCursors: any = [];
          uniqueCollaborators.forEach((collaborator: Collaborator) => {
            if (collaborator.id !== user.id) {
              const userCursor = quill.getModule('cursors');
              userCursor.createCursor(
                collaborator.id,
                collaborator.email.split('@')[0],
                `#${Math.random().toString(16).slice(2, 8)}`
              );
              allCursors.push(userCursor);
            }
          });
          setLocalCursors(allCursors);
        }
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED' || !user) return;
        const response = await findUser(user.id);
        if (!response) return;

        room.track({
          id: user.id,
          email: user.email?.split('@')[0],
          avatarUrl: response.avatarUrl
            ? supabase.storage.from('avatars').getPublicUrl(response.avatarUrl)
                .data.publicUrl
            : '',
        });
      });
      
    return () => {
      supabase.removeChannel(room);
    };
  }, [fileId, quill, supabase, user]);
  
  // Handle cursor movement
  const setupSelectionHandler = () => {
    if (!quill || !socket || !user) return () => {};
    
    const selectionChangeHandler = (range: any, oldRange: any, source: any) => {
      if (source === 'user' && user.id) {
        socket.emit('send-cursor-move', range, fileId, user.id);
      }
    };
    
    quill.on('selection-change', selectionChangeHandler);
    
    return () => {
      quill.off('selection-change', selectionChangeHandler);
    };
  };

  return {
    collaborators,
    setupSelectionHandler
  };
}; 