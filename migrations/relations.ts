// import { relations } from "drizzle-orm/relations";
// // import { folders, files, workspaces, usersInAuth, users, customers, products, prices, subscriptions, collaborators } from "./schema";
// import { folders, files, workspaces, usersInAuth, users, customers, products, prices, subscriptions, collaborators } from "./schema";

// export const filesRelations = relations(files, ({one}) => ({
// 	folder: one(folders, {
// 		fields: [files.folderId],
// 		references: [folders.id]
// 	}),
// 	workspace: one(workspaces, {
// 		fields: [files.workspaceId],
// 		references: [workspaces.id]
// 	}),
// }));

// export const foldersRelations = relations(folders, ({one, many}) => ({
// 	files: many(files),
// 	workspace: one(workspaces, {
// 		fields: [folders.workspaceId],
// 		references: [workspaces.id]
// 	}),
// }));

// export const workspacesRelations = relations(workspaces, ({many}) => ({
// 	files: many(files),
// 	folders: many(folders),
// 	collaborators: many(collaborators),
// }));

// export const usersRelations = relations(users, ({one}) => ({
// 	usersInAuth: one(usersInAuth, {
// 		fields: [users.id],
// 		references: [usersInAuth.id]
// 	}),
// }));

// export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
// 	users: many(users),
// 	customers: many(customers),
// 	subscriptions: many(subscriptions),
// }));

// export const customersRelations = relations(customers, ({one}) => ({
// 	usersInAuth: one(usersInAuth, {
// 		fields: [customers.id],
// 		references: [usersInAuth.id]
// 	}),
// }));

// export const pricesRelations = relations(prices, ({one, many}) => ({
// 	product: one(products, {
// 		fields: [prices.productId],
// 		references: [products.id]
// 	}),
// 	subscriptions: many(subscriptions),
// }));

// export const productsRelations = relations(products, ({many}) => ({
// 	prices: many(prices),
// }));

// export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
// 	price: one(prices, {
// 		fields: [subscriptions.priceId],
// 		references: [prices.id]
// 	}),
// 	usersInAuth: one(usersInAuth, {
// 		fields: [subscriptions.userId],
// 		references: [usersInAuth.id]
// 	}),
// }));

// export const collaboratorsRelations = relations(collaborators, ({one}) => ({
// 	workspace: one(workspaces, {
// 		fields: [collaborators.workspaceId],
// 		references: [workspaces.id]
// 	}),
// }));