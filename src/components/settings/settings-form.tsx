'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { useAppState } from '@/lib/providers/state-provider';
import { User, workspace } from '@/supabase/supabase';
import { useSupabaseUser } from '@/lib/providers/supabase-user-provider';
import { useRouter } from 'next/navigation';
import { createBClient } from '@/lib/server-actions/createClient';
import {
  Briefcase,
  CreditCard,
  ExternalLink,
  Lock,
  LogOut,
  Plus,
  Share,
  User as UserIcon,
} from 'lucide-react';
import { CgProfile } from "react-icons/cg";
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  addCollaborators,
  deleteWorkspace,
  getCollaborators,
  removeCollaborators,
  updateWorkspace,
} from '@/supabase/queries';
import { v4 } from 'uuid';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import CollaboratorSearch from '../global/collaborator-search';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import Link from 'next/link';
// import { useSubscriptionModal } from '@/lib/providers/subscription-modal-provider';
// import { postData } from '@/lib/utils';
import { MdLogout } from "react-icons/md";


const SettingsForm = () => {
  const { toast } = useToast();
  const { user, subscription } = useSupabaseUser();
//   const { open, setOpen } = useSubscriptionModal();
  const router = useRouter();
  const supabase = createBClient();
  const { state, workspaceId, dispatch } = useAppState();
  const [permissions, setPermissions] = useState('private');
  const [collaborators, setCollaborators] = useState<User[] | []>([]);
  const [openAlertMessage, setOpenAlertMessage] = useState(false);
  const [workspaceDetails, setWorkspaceDetails] = useState<workspace>();
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); //referemce pr mi;; cjamge 
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState({
    gemini: false,
    googleSearch: false,
    searchEngineId: false
  });

  // Check API key status on mount and when localStorage changes
  useEffect(() => {
    const checkApiKeyStatus = () => {
      setApiKeyStatus({
        gemini: !!localStorage.getItem('gemini_api_key'),
        googleSearch: !!localStorage.getItem('google_search_api_key'),
        searchEngineId: !!localStorage.getItem('google_search_engine_id')
      });
    };
    
    // Check initially
    checkApiKeyStatus();
    
    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener('storage', checkApiKeyStatus);
    
    return () => {
      window.removeEventListener('storage', checkApiKeyStatus);
    };
  }, []);

  // Handle API key updates
  const handleApiKeyChange = (key: string, value: string) => {
    if (value.trim()) {
      localStorage.setItem(key, value.trim());
      
      // Update the API key status
      setApiKeyStatus(prev => {
        const newStatus = { ...prev };
        if (key === 'gemini_api_key') newStatus.gemini = true;
        if (key === 'google_search_api_key') newStatus.googleSearch = true;
        if (key === 'google_search_engine_id') newStatus.searchEngineId = true;
        return newStatus;
      });
      
      toast({
        title: "API Key Saved",
        description: `Your ${key.replace(/_/g, ' ').replace(/api key/i, 'API key')} has been saved.`,
      });
    }
  };
  
  //addcollborators
  const addCollaborator = async (profile: User) => {
    if (!workspaceId) {
      toast({
        title: "Error",
        description: "Workspace ID is missing. Please try again after refreshing the page.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Add the collaborator to the database
      await addCollaborators([profile], workspaceId);
      
      // Update the local state with the new collaborator
      setCollaborators([...collaborators, profile]);
      
      toast({
        title: "Success",
        description: `Added ${profile.email} as a collaborator`,
      });
    } catch (error) {
      console.error("Error adding collaborator:", error);
      toast({
        title: "Failed to add collaborator",
        description: "An error occurred while adding the collaborator",
        variant: "destructive"
      });
    }
  };

  //remove collaborators
  const removeCollaborator = async (user: User) => {
    if (!workspaceId) return;
    if (collaborators.length === 1) {
      setPermissions('private');
    }
    await removeCollaborators([user], workspaceId);
    setCollaborators(
      collaborators.filter((collaborator) => collaborator.id !== user.id)
    );
    router.refresh();
  };

  //on change
  const workspaceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!workspaceId) {
      console.error("Cannot update name: workspaceId is undefined");
      toast({
        title: "Error",
        description: "Workspace ID is missing. Please try again after refreshing the page.",
        variant: "destructive"
      });
      return;
    }
    
    if (!e.target.value) return;
    
    // Update state immediately for responsive UI
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { workspace: { title: e.target.value }, workspaceId },
    });
    
    // Debounce the API call
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(async () => {
      try {
        console.log("Updating workspace name to:", e.target.value);
        const result = await updateWorkspace({ title: e.target.value }, workspaceId);
        
        if (result?.error) {
          console.error("Error updating workspace name:", result.error);
          toast({
            title: "Name Update Failed",
            description: "Could not update the workspace name",
            variant: "destructive"
          });
        } else {
          console.log("Workspace name updated successfully");
        }
      } catch (err) {
        console.error("Unexpected error updating workspace name:", err);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      }
    }, 500);
  };

  const onChangeWorkspaceLogo = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!workspaceId) {
      console.error("Cannot upload logo: workspaceId is undefined");
      toast({
        title: "Error",
        description: "Workspace ID is missing. Please try again after refreshing the page.",
        variant: "destructive"
      });
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    const uuid = v4();
    setUploadingLogo(true);
    
    try {
      console.log("Uploading to storage bucket:", file.name, file.size);
      const { data, error } = await supabase.storage
        .from('workspace-logos')
        .upload(`workspaceLogo.${uuid}`, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error("Storage upload error:", error);
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive"
        });
        setUploadingLogo(false);
        return;
      }

      console.log("Upload successful, path:", data.path);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { workspace: { logo: data.path }, workspaceId },
      });
      
      const updateResult = await updateWorkspace({ logo: data.path }, workspaceId);
      if (updateResult?.error) {
        console.error("Database update error:", updateResult.error);
        toast({
          title: "Update Failed",
          description: "Logo uploaded but couldn't update workspace record",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Workspace logo updated successfully",
        });
      }
    } catch (err) {
      console.error("Unexpected error during upload:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const onClickAlertConfirm = async () => {
    if (!workspaceId) return;
    if (collaborators.length > 0) {
      await removeCollaborators(collaborators, workspaceId);
    }
    setPermissions('private');
    setOpenAlertMessage(false);
  };

  const onPermissionsChange = (val: string) => {
    if (val === 'private') {
      setOpenAlertMessage(true);
    } else setPermissions(val);
  };

  //CHALLENGE fetching avatar details
  //WIP Payment Portal redirect

  useEffect(() => {
    const showingWorkspace = state.workspaces.find(
      (workspace) => workspace.id === workspaceId
    );
    if (showingWorkspace) setWorkspaceDetails(showingWorkspace);
    console.log("Current workspaceId:", workspaceId); // Debug workspaceId
    console.log("Current workspaces:", state.workspaces); // Debug available workspaces
  }, [workspaceId, state]);

  useEffect(() => {
    if (!workspaceId) return;
    const fetchCollaborators = async () => {
      const response = await getCollaborators(workspaceId);
      if (response.length) {
        setPermissions('shared');
        setCollaborators(response);
      }
    };
    fetchCollaborators();
  }, [workspaceId]);

  //WIP PAYMENT PORTAL

//   const redirectToCustomerPortal = async () => {
//     setLoadingPortal(true);
//     try {
//       const { url, error } = await postData({
//         url: '/api/create-portal-link',
//       });
//       window.location.assign(url);
//     } catch (error) {
//       console.log(error);
//       setLoadingPortal(false);
//     }
//     setLoadingPortal(false);
//   };

  return (
    <div className="flex gap-4 flex-col">
      <p className="flex items-center gap-2 mt-6">
        <Briefcase size={20} />
        Workspace
      </p>
      <Separator />
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="workspaceName"
          className="text-sm text-muted-foreground"
        >
          Name
        </Label>
        <Input
          name="workspaceName"
          value={workspaceDetails ? workspaceDetails.title : ''}
          placeholder="Workspace Name"
          onChange={workspaceNameChange}
        />
        {/* Workspace Logo upload disabled temporarily
        <Label
          htmlFor="workspaceLogo"
          className="text-sm text-muted-foreground"
        >
          Workspace Logo
        </Label>
        <Input
          name="workspaceLogo"
          type="file"
          accept="image/*"
          placeholder="Workspace Logo"
          onChange={onChangeWorkspaceLogo}
          disabled={uploadingLogo || subscription?.status !== 'active'}
        />
        {subscription?.status !== 'active' && (
          <small className="text-muted-foreground">
            To customize your workspace, you need to be on a Pro Plan
          </small>
        )}
        */}
      </div>
      <>
        <Label htmlFor="permissions">Permissions</Label>
        <Select
          onValueChange={onPermissionsChange}
          value={permissions}
        >
          <SelectTrigger className="w-full h-26 -mt-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="private">
                <div
                  className="p-2
                  flex
                  gap-4
                  justify-center
                  items-center
                "
                >
                  <Lock />
                  <article className="text-left flex flex-col">
                    <span>Private</span>
                    <p>
                      Your workspace is private to you. You can choose to share
                      it later.
                    </p>
                  </article>
                </div>
              </SelectItem>
              <SelectItem value="shared">
                <div className="p-2 flex gap-4 justify-center items-center">
                  <Share></Share>
                  <article className="text-left flex flex-col">
                    <span>Shared</span>
                    <span>You can invite collaborators.</span>
                  </article>
                </div>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {permissions === 'shared' && (
          <div>
            <CollaboratorSearch
              existingCollaborators={collaborators}
              getCollaborator={(user) => {
                addCollaborator(user);
              }}
            >
              <Button
                type="button"
                className="text-sm mt-4"
              >
                <Plus />
                Add Collaborators
              </Button>
            </CollaboratorSearch>
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">
                Collaborators {collaborators.length || ''}
              </span>
              <ScrollArea
                className="
            h-[120px]
            overflow-y-scroll
            w-full
            rounded-md
            border
            border-muted-foreground/20"
              >
                {collaborators.length ? (
                  collaborators.map((c) => (
                    <div
                      className="p-4 flex
                      justify-between
                      items-center
                "
                      key={c.id}
                    >
                      <div className="flex gap-4 items-center">
                        <Avatar>
                          <AvatarImage src="/avatars/7.png" />
                          <AvatarFallback>PJ</AvatarFallback>
                        </Avatar>
                        <div
                          className="text-sm 
                          gap-2
                          text-muted-foreground
                          overflow-hidden
                          overflow-ellipsis
                          sm:w-[300px]
                          w-[140px]
                        "
                        >
                          {c.email}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => removeCollaborator(c)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                ) : (
                  <div
                    className="absolute
                  right-0 left-0
                  top-0
                  bottom-0
                  flex
                  justify-center
                  items-center
                "
                  >
                    <span className="text-muted-foreground text-sm">
                      You have no collaborators
                    </span>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
        <Alert variant={'destructive'}>
          <AlertDescription>
            Warning! deleting you workspace will permanantly delete all data
            related to this workspace.
          </AlertDescription>
          <Button
            type="submit"
            size={'sm'}
            variant={'destructive'}
            className="mt-4 
            text-sm
            bg-destructive/40 
            border-2 
            border-destructive"
            onClick={async () => {
              if (!workspaceId) return;
              await deleteWorkspace(workspaceId);
              toast({ 
                title: 'Successfully deleted your workspace',
                description: 'Your workspace and all associated data have been permanently deleted.' 
              });
              dispatch({ type: 'DELETE_WORKSPACE', payload: workspaceId });
              router.replace('/dashboard');
            }}
          >
            Delete Workspace
          </Button>
        </Alert>
        
        
        {/* API Keys Section */}
        <p className="flex items-center gap-2 mt-6">
          <Lock size={20} /> API Keys
        </p>
        <Separator />
        <div className="flex flex-col gap-4">
          <div>
            <Label
              htmlFor="geminiApiKey"
              className="text-sm text-muted-foreground flex items-center gap-2"
            >
              Gemini API Key
              <span className={`inline-block w-2 h-2 rounded-full ${apiKeyStatus.gemini ? 'bg-green-500' : 'bg-red-500'}`} title={apiKeyStatus.gemini ? 'API Key Set' : 'API Key Not Set'}></span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="geminiApiKey"
                type="password"
                placeholder="Enter your Gemini API key"
                defaultValue={localStorage.getItem('gemini_api_key') || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleApiKeyChange('gemini_api_key', value);
                }}
              />
              <a 
                href="https://ai.google.dev/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                Get Key
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Used for AI text generation and content formatting
            </p>
          </div>
          

          
          
          
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Clear all API keys from localStorage
                localStorage.removeItem('gemini_api_key');
                localStorage.removeItem('google_search_api_key');
                localStorage.removeItem('google_search_engine_id');
                
                // Reset the input fields
                const inputs = document.querySelectorAll('input[id^="gemini"], input[id^="google"], input[id^="search"]');
                inputs.forEach((input) => {
                  if (input instanceof HTMLInputElement) {
                    input.value = '';
                  }
                });
                
                // Reset the API key status
                setApiKeyStatus({
                  gemini: false,
                  googleSearch: false,
                  searchEngineId: false
                });
                
                toast({
                  title: "API Keys Cleared",
                  description: "All API keys have been removed from your browser.",
                  variant: "default",
                });
              }}
            >
              Clear API Keys
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              This will remove all API keys from your browser's local storage
            </p>
          </div>
        </div>
        
        
      </>
      <AlertDialog open={openAlertMessage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDescription>
              Changing a Shared workspace to a Private workspace will remove all
              collaborators permanantly.
            </AlertDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenAlertMessage(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={onClickAlertConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsForm;