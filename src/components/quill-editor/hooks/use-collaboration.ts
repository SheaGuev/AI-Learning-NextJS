import { useState, useEffect } from 'react';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { useSocket } from '@/lib/providers/socket-provider';
import { findUser } from '@/supabase/queries';
import { createBClient } from '@/lib/server-actions/createClient';
import { Collaborator } from '../types';
import { useToast } from '@/lib/hooks/use-toast';

export const useCollaboration = (quill: any, fileId: string) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [localCursors, setLocalCursors] = useState<any>([]);
  const { socket, isConnected } = useSocket();
  const { user } = useSupabaseUser();
  const supabase = createBClient();
  const { toast } = useToast();
  const [previousCollaborators, setPreviousCollaborators] = useState<Collaborator[]>([]);

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
    
    // Receive confirmation of room join
    socket.on('room-joined', (roomId: string) => {
      console.log(`Successfully joined room: ${roomId}`);
      toast({
        title: "Collaboration active",
        description: "You're now connected to the real-time collaboration server",
      });
    });
    
    return () => {
      socket.off('connect', handleSocketConnect);
      socket.off('room-joined');
    };
  }, [socket, fileId, toast]);
  
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
        
        // Check for new collaborators
        if (previousCollaborators.length > 0) {
          // Find users who just joined (in new list but not in previous list)
          const newUsers = uniqueCollaborators.filter(
            newUser => !previousCollaborators.some(prevUser => prevUser.id === newUser.id)
          );
          
          // Find users who just left (in previous list but not in new list)
          const leftUsers = previousCollaborators.filter(
            prevUser => !uniqueCollaborators.some(newUser => newUser.id === prevUser.id)
          );
          
          // Show notifications for join/leave events
          newUsers.forEach(newUser => {
            if (newUser.id !== user?.id) {
              toast({
                title: "Collaborator joined",
                description: `${newUser.email} joined the document`,
              });
            }
          });
          
          leftUsers.forEach(leftUser => {
            if (leftUser.id !== user?.id) {
              toast({
                title: "Collaborator left",
                description: `${leftUser.email} left the document`,
              });
            }
          });
        }
        
        // Update previous collaborators list for next comparison
        setPreviousCollaborators(uniqueCollaborators);
        
        // Update the current collaborators state
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
    
    // Setup cursor movement reception
    const handleCursorMove = (range: any, cursorId: string) => {
      if (cursorId !== user?.id) {
        console.log(`Received cursor movement from ${cursorId}`);
        const cursors = quill.getModule('cursors');
        if (cursors) {
          cursors.moveCursor(cursorId, range);
        }
      }
    };
    
    // Add event listener for cursor movements
    socket.on('receive-cursor-move', handleCursorMove);
    
    // Start tracking selection changes in the editor
    quill.on('selection-change', selectionChangeHandler);
    
    return () => {
      quill.off('selection-change', selectionChangeHandler);
      socket.off('receive-cursor-move', handleCursorMove);
    };
  };

  return {
    collaborators,
    setupSelectionHandler
  };
}; 