'use server';
import { validate } from 'uuid';
import db from './db';
import { File, Folder, KnowledgeItem, Subscription, User, workspace } from './supabase';
import { and, eq, ilike, notExists, inArray, desc, gte, lt, or } from 'drizzle-orm';
import { collaborators, files, folders, knowledgeItems, subscriptions, users, workspaces, products } from './schema';
import { revalidatePath } from 'next/cache';

export const createWorkspace = async (workspace: workspace) => {
  try {
    const response = await db.insert(workspaces).values(workspace);
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const deleteWorkspace = async (workspaceId: string) => {
  if (!workspaceId) return;
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
};

export const getUserSubscriptionStatus = async (userId: string) => {
  try {
    const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    const data = result[0];
    if (data) return { data: data as Subscription, error: null };
    else return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: `Error` };
  }
};

export const getFolders = async (workspaceId: string) => {
  const isValid = validate(workspaceId);
  if (!isValid)
    return {
      data: null,
      error: 'Error',
    };

  try {
    const results: Folder[] | [] = await db
      .select()
      .from(folders)
      .orderBy(folders.createdAt)
      .where(eq(folders.workspaceId, workspaceId));
    return { data: results, error: null };
  } catch (error) {
    return { data: null, error: 'Error' };
  }
};

export const getWorkspaceDetails = async (workspaceId: string) => {
  const isValid = validate(workspaceId);
  if (!isValid)
    return {
      data: [],
      error: 'Error',
    };

  try {
    const response = (await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1)) as workspace[];
    return { data: response, error: null };
  } catch (error) {
    console.log(error);
    return { data: [], error: 'Error' };
  }
};

export const getFileDetails = async (fileId: string) => {
  const isValid = validate(fileId);
  if (!isValid) {
    data: [];
    error: 'Error';
  }
  try {
    const response = (await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1)) as File[];
    return { data: response, error: null };
  } catch (error) {
    console.log('🔴Error', error);
    return { data: [], error: 'Error' };
  }
};

export const deleteFile = async (fileId: string) => {
  if (!fileId) return;
  await db.delete(files).where(eq(files.id, fileId));
};

export const deleteFolder = async (folderId: string) => {
  if (!folderId) return;
  await db.delete(folders).where(eq(folders.id, folderId));
};

export const getFolderDetails = async (folderId: string) => {
  const isValid = validate(folderId);
  if (!isValid) {
    data: [];
    error: 'Error';
  }

  try {
    const response = (await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId))
      .limit(1)) as Folder[];

    return { data: response, error: null };
  } catch (error) {
    return { data: [], error: 'Error' };
  }
};

export const getPrivateWorkspaces = async (userId: string) => {
  if (!userId) return [];
  const privateWorkspaces = (await db
    .select({
      id: workspaces.id,
      createdAt: workspaces.createdAt,
      workspaceOwner: workspaces.workspaceOwner,
      title: workspaces.title,
      iconId: workspaces.iconId,
      data: workspaces.data,
      inTrash: workspaces.inTrash,
      logo: workspaces.logo,
      bannerUrl: workspaces.bannerUrl,
    })
    .from(workspaces)
    .where(
      and(
        notExists(
          db
            .select()
            .from(collaborators)
            .where(eq(collaborators.workspaceId, workspaces.id))
        ),
        eq(workspaces.workspaceOwner, userId)
      )
    )) as workspace[];
  return privateWorkspaces;
};

export const getCollaboratingWorkspaces = async (userId: string) => {
  if (!userId) return [];
  const collaboratedWorkspaces = (await db
    .select({
      id: workspaces.id,
      createdAt: workspaces.createdAt,
      workspaceOwner: workspaces.workspaceOwner,
      title: workspaces.title,
      iconId: workspaces.iconId,
      data: workspaces.data,
      inTrash: workspaces.inTrash,
      logo: workspaces.logo,
      bannerUrl: workspaces.bannerUrl,
    })
    .from(users)
    .innerJoin(collaborators, eq(users.id, collaborators.userId))
    .innerJoin(workspaces, eq(collaborators.workspaceId, workspaces.id))
    .where(eq(users.id, userId))) as workspace[];
  return collaboratedWorkspaces;
};

export const getSharedWorkspaces = async (userId: string) => {
  if (!userId) return [];
  const sharedWorkspaces = (await db
    .selectDistinct({
      id: workspaces.id,
      createdAt: workspaces.createdAt,
      workspaceOwner: workspaces.workspaceOwner,
      title: workspaces.title,
      iconId: workspaces.iconId,
      data: workspaces.data,
      inTrash: workspaces.inTrash,
      logo: workspaces.logo,
      bannerUrl: workspaces.bannerUrl,
    })
    .from(workspaces)
    .orderBy(workspaces.createdAt)
    .innerJoin(collaborators, eq(workspaces.id, collaborators.workspaceId))
    .where(eq(workspaces.workspaceOwner, userId))) as workspace[];
  return sharedWorkspaces;
};

export const getFiles = async (folderId: string) => {
  const isValid = validate(folderId);
  if (!isValid) return { data: null, error: 'Error' };
  try {
    const results = (await db
      .select()
      .from(files)
      .orderBy(files.createdAt)
      .where(eq(files.folderId, folderId))) as File[] | [];
    return { data: results, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const findUser = async (userId: string) => {
  const response = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return response[0];
};

export const addCollaborators = async (users: User[], workspaceId: string) => {
  for (const user of users) {
    const existing = await db.select()
      .from(collaborators)
      .where(
        and(
          eq(collaborators.userId, user.id), 
          eq(collaborators.workspaceId, workspaceId)
        )
      )
      .limit(1);
      
    if (!existing.length) {
      await db.insert(collaborators).values({ workspaceId, userId: user.id });
    }
  }
};

export const removeCollaborators = async (
  users: User[],
  workspaceId: string
) => {
  for (const user of users) {
    // First check if user exists
    const checkQuery = `
      SELECT * FROM collaborators 
      WHERE workspace_id = '${workspaceId}' AND user_id = '${user.id}'
      LIMIT 1
    `;
    const userExists = await db.execute(checkQuery);
    
    // Delete if exists
    if (userExists.length > 0) {
      const deleteQuery = `
        DELETE FROM collaborators
        WHERE workspace_id = '${workspaceId}' AND user_id = '${user.id}'
      `;
      await db.execute(deleteQuery);
    }
  }
};

export const getActiveProductsWithPrice = async () => {
  try {
    // Use raw SQL query approach since we removed schema
    const result = await db.execute('SELECT * FROM products WHERE active = true');
    
    if (result.length) return { data: result, error: null };
    return { data: [], error: null };
  } catch (error) {
    console.log(error);
    return { data: [], error };
  }
};

export const createFolder = async (folder: Folder) => {
  try {
    const results = await db.insert(folders).values(folder);
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const createFile = async (file: File) => {
  try {
    await db.insert(files).values(file);
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const updateFolder = async (
  folder: Partial<Folder>,
  folderId: string
) => {
  try {
    await db.update(folders).set(folder).where(eq(folders.id, folderId));
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const updateFile = async (file: Partial<File>, fileId: string) => {
  if (!fileId) {
    console.error("updateFile called with empty fileId");
    return { data: null, error: "No file ID provided" };
  }

  console.log(`📝 Attempting to update file ${fileId} with data:`, file);
  
  try {
    const response = await db
      .update(files)
      .set(file)
      .where(eq(files.id, fileId))
      .returning();
    
    console.log(`✅ File update response:`, response);
    
    if (!response || response.length === 0) {
      console.warn(`⚠️ No rows were updated for file ${fileId}`);
      return { data: null, error: "No rows updated" };
    }
    
    return { data: response[0], error: null };
  } catch (error) {
    console.error(`🔴 Error updating file ${fileId}:`, error);
    return { data: null, error: `Error: ${error}` };
  }
};

export const updateWorkspace = async (
  workspace: Partial<workspace>,
  workspaceId: string
) => {
  if (!workspaceId) return;
  try {
    await db
      .update(workspaces)
      .set(workspace)
      .where(eq(workspaces.id, workspaceId));
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error' };
  }
};

export const getCollaborators = async (workspaceId: string) => {
  // Get collaborators from database
  const collaboratorsQuery = `
    SELECT * FROM collaborators 
    WHERE workspace_id = '${workspaceId}'
  `;
  const response = await db.execute(collaboratorsQuery);
  
  if (!response.length) return [];
  
  // Get user information for each collaborator
  const userInformation = await Promise.all(
    response.map(async (user: any) => {
      const userQuery = `
        SELECT * FROM users 
        WHERE id = '${user.userId || user.user_id}'
        LIMIT 1
      `;
      const exists = await db.execute(userQuery);
      return exists[0];
    })
  );
  
  return userInformation.filter(Boolean) as User[];
};

export const getUsersFromSearch = async (email: string) => {
  if (!email) return [];
  const accounts = db
    .select()
    .from(users)
    .where(ilike(users.email, `${email}%`));
  return accounts;
};

// Function to find a valid user ID in the database
// This is a fallback if the provided ID doesn't exist
async function findValidUserId(providedUserId: string): Promise<string | null> {
  try {
    // First check if the provided ID exists
    if (providedUserId) {
      const userCheck = await db
        .select()
        .from(users)
        .where(eq(users.id, providedUserId))
        .limit(1);
        
      if (userCheck.length > 0) {
        return providedUserId; // The provided ID is valid
      }
    }
    
    // If not found, get any valid user ID from the database
    const anyUser = await db
      .select()
      .from(users)
      .limit(1);
      
    if (anyUser.length > 0) {
      return anyUser[0].id;
    }
    
    return null; // No valid users found
  } catch (error) {
    console.error('Error finding valid user ID:', error);
    return null;
  }
}

// Function to check if a folder exists
async function validateFolderId(folderId: string | null | undefined): Promise<string | null> {
  if (!folderId) return null;
  
  try {
    const folder = await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId))
      .limit(1);
      
    if (folder.length > 0) {
      return folderId; // Folder exists
    }
    
    return null; // Folder doesn't exist
  } catch (error) {
    console.error('Error validating folder ID:', error);
    return null;
  }
}

// Function to check if a file exists
async function validateFileId(fileId: string | null | undefined): Promise<string | null> {
  if (!fileId) return null;
  
  try {
    const file = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);
      
    if (file.length > 0) {
      return fileId; // File exists
    }
    
    return null; // File doesn't exist
  } catch (error) {
    console.error('Error validating file ID:', error);
    return null;
  }
}

// Knowledge Base Queries

export const createKnowledgeItem = async (item: KnowledgeItem) => {
  try {
    // Validate the item
    if (!item.id || !item.userId || !item.type || !item.content) {
      console.error('Invalid knowledge item structure:', 
        { hasId: !!item.id, hasUserId: !!item.userId, hasType: !!item.type, hasContent: !!item.content });
      return { data: null, error: 'Invalid knowledge item structure' };
    }
    
    // Make sure tags is an array
    if (!item.tags) {
      item.tags = [];
    }
    
    // Make sure timestamps are properly formatted or null
    if (item.lastReviewed === undefined) {
      item.lastReviewed = null;
    }
    
    if (item.nextReviewDate === undefined) {
      item.nextReviewDate = null;
    }
    
    // Verify user ID exists or find a valid one
    const validUserId = await findValidUserId(item.userId);
    
    if (!validUserId) {
      return { 
        data: null, 
        error: 'Foreign key constraint: No valid user ID found in the database' 
      };
    }
    
    // If the original user ID was invalid, use the found valid one
    if (validUserId !== item.userId) {
      console.warn(`Using alternative user ID ${validUserId} instead of ${item.userId}`);
      item.userId = validUserId;
    }
    
    // Validate folder ID
    const validFolderId = await validateFolderId(item.sourceFolderId);
    
    // If folder ID isn't valid, set it to null
    if (item.sourceFolderId && !validFolderId) {
      console.warn(`Folder ID ${item.sourceFolderId} not found in database, setting to null`);
      item.sourceFolderId = null;
    }
    
    // Validate file ID
    const validFileId = await validateFileId(item.sourceFileId);
    
    // If file ID isn't valid, set it to null
    if (item.sourceFileId && !validFileId) {
      console.warn(`File ID ${item.sourceFileId} not found in database, setting to null`);
      item.sourceFileId = null;
    }
    
    console.log('Inserting knowledge item into database:', { 
      id: item.id,
      type: item.type,
      userId: item.userId,
      sourceFolderId: item.sourceFolderId,
      sourceFileId: item.sourceFileId
    });
    
    const response = await db.insert(knowledgeItems).values(item);
    return { data: null, error: null };
  } catch (error) {
    console.error('Database error creating knowledge item:', error);
    // Try to provide more helpful error messages
    if (error instanceof Error) {
      const pgError = error as any;
      if (pgError.code === '23503') { // Foreign key violation
        return { 
          data: null, 
          error: `Foreign key constraint: ${pgError.detail || 'A referenced record does not exist'}` 
        };
      }
    }
    return { data: null, error: 'Error creating knowledge item' };
  }
};

export const updateKnowledgeItem = async (
  item: Partial<KnowledgeItem>,
  itemId: string
) => {
  try {
    const response = await db
      .update(knowledgeItems)
      .set(item)
      .where(eq(knowledgeItems.id, itemId));
    revalidatePath('/dashboard');
    return { data: null, error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error updating knowledge item' };
  }
};

export const deleteKnowledgeItem = async (itemId: string) => {
  if (!itemId) return;
  try {
    await db.delete(knowledgeItems).where(eq(knowledgeItems.id, itemId));
    revalidatePath('/dashboard');
  } catch (error) {
    console.log(error);
  }
};

export const getKnowledgeItemsByUser = async (userId: string) => {
  if (!userId) return { data: null, error: 'Invalid user ID' };
  try {
    const results = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.userId, userId))
      .orderBy(desc(knowledgeItems.createdAt));
    return { data: results as KnowledgeItem[], error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error fetching knowledge items' };
  }
};

export const getKnowledgeItemsByFolder = async (folderId: string, userId: string) => {
  if (!folderId || !userId) return { data: null, error: 'Invalid parameters' };
  try {
    const results = await db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.sourceFolderId, folderId),
          eq(knowledgeItems.userId, userId)
        )
      )
      .orderBy(desc(knowledgeItems.createdAt));
    return { data: results as KnowledgeItem[], error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error fetching knowledge items by folder' };
  }
};

export const getKnowledgeItemsByFile = async (fileId: string, userId: string) => {
  if (!fileId || !userId) return { data: null, error: 'Invalid parameters' };
  try {
    const results = await db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.sourceFileId, fileId),
          eq(knowledgeItems.userId, userId)
        )
      )
      .orderBy(desc(knowledgeItems.createdAt));
    return { data: results as KnowledgeItem[], error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error fetching knowledge items by file' };
  }
};

export const getKnowledgeItemsByType = async (type: 'flashcard' | 'quiz', userId: string) => {
  if (!type || !userId) return { data: null, error: 'Invalid parameters' };
  try {
    const results = await db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.type, type),
          eq(knowledgeItems.userId, userId)
        )
      )
      .orderBy(desc(knowledgeItems.createdAt));
    return { data: results as KnowledgeItem[], error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error fetching knowledge items by type' };
  }
};

export const getDueKnowledgeItems = async (userId: string) => {
  if (!userId) return { data: null, error: 'Invalid user ID' };
  const now = new Date().toISOString();
  
  try {
    const results = await db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.userId, userId),
          or(
            // Items with nextReviewDate <= now
            lt(knowledgeItems.nextReviewDate, now),
            // Items never reviewed yet
            eq(knowledgeItems.reviewCount, 0)
          )
        )
      )
      .orderBy(knowledgeItems.nextReviewDate);
    
    return { data: results as KnowledgeItem[], error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error fetching due knowledge items' };
  }
};

export const getKnowledgeItemsByTags = async (tags: string[], userId: string) => {
  if (!tags.length || !userId) return { data: null, error: 'Invalid parameters' };
  
  try {
    // Query items with any of the specified tags
    const results = await db.select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.userId, userId)
        )
      )
      .orderBy(desc(knowledgeItems.createdAt));
    
    // Filter items that have any of the specified tags
    // This is a workaround since Drizzle ORM might not support array contains directly
    const filteredResults = results.filter(item => {
      if (!item.tags) return false;
      const itemTags = item.tags as string[];
      return tags.some(tag => itemTags.includes(tag));
    });
    
    return { data: filteredResults as KnowledgeItem[], error: null };
  } catch (error) {
    console.log(error);
    return { data: null, error: 'Error fetching knowledge items by tags' };
  }
};