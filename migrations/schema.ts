// import { pgTable, uuid, timestamp, text, foreignKey, pgPolicy, jsonb, boolean, check, bigint, integer, pgEnum } from "drizzle-orm/pg-core"
// import { sql } from "drizzle-orm"

// export const pricingPlanInterval = pgEnum("pricing_plan_interval", ['day', 'week', 'month', 'year'])
// export const pricingType = pgEnum("pricing_type", ['one_time', 'recurring'])
// export const subscriptionStatus = pgEnum("subscription_status", ['trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid'])


// export const workspaces = pgTable("workspaces", {
// 	id: uuid().defaultRandom().primaryKey().notNull(),
// 	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
// 	workspaceOwner: uuid("workspace_owner").notNull(),
// 	title: text().notNull(),
// 	iconId: text("icon_id").notNull(),
// 	data: text(),
// 	inTrash: text("in_trash"),
// 	logo: text(),
// 	bannerUrl: text("banner_url"),
// });

// export const files = pgTable("files", {
// 	id: uuid().defaultRandom().primaryKey().notNull(),
// 	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
// 	title: text().notNull(),
// 	iconId: text("icon_id").notNull(),
// 	data: text(),
// 	inTrash: text("in_trash"),
// 	bannerUrl: text("banner_url"),
// 	workspaceId: uuid("workspace_id").notNull(),
// 	folderId: uuid("folder_id").notNull(),
// }, (table) => [
// 	foreignKey({
// 			columns: [table.folderId],
// 			foreignColumns: [folders.id],
// 			name: "files_folder_id_folders_id_fk"
// 		}).onDelete("cascade"),
// 	foreignKey({
// 			columns: [table.workspaceId],
// 			foreignColumns: [workspaces.id],
// 			name: "files_workspace_id_workspaces_id_fk"
// 		}).onDelete("cascade"),
// ]);

// export const folders = pgTable("folders", {
// 	id: uuid().defaultRandom().primaryKey().notNull(),
// 	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
// 	title: text().notNull(),
// 	iconId: text("icon_id").notNull(),
// 	data: text(),
// 	inTrash: text("in_trash"),
// 	bannerUrl: text("banner_url"),
// 	workspaceId: uuid("workspace_id").notNull(),
// }, (table) => [
// 	foreignKey({
// 			columns: [table.workspaceId],
// 			foreignColumns: [workspaces.id],
// 			name: "folders_workspace_id_workspaces_id_fk"
// 		}).onDelete("cascade"),
// ]);

// export const users = pgTable("users", {
// 	id: uuid().primaryKey().notNull(),
// 	fullName: text("full_name"),
// 	avatarUrl: text("avatar_url"),
// 	billingAddress: jsonb("billing_address"),
// 	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
// 	paymentMethod: jsonb("payment_method"),
// 	email: text(),
// }, (table) => [
// 	foreignKey({
// 			columns: [table.id],
// 			foreignColumns: [table.id],
// 			name: "users_id_fkey"
// 		}),
// 	pgPolicy("Everyone Can view own user data.", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
// 	pgPolicy("Can update own user data.", { as: "permissive", for: "update", to: ["public"] }),
// ]);

// export const customers = pgTable("customers", {
// 	id: uuid().primaryKey().notNull(),
// 	stripeCustomerId: text("stripe_customer_id"),
// }, (table) => [
// 	foreignKey({
// 			columns: [table.id],
// 			foreignColumns: [users.id],
// 			name: "customers_id_fkey"
// 		}),
// ]);

// export const products = pgTable("products", {
// 	id: text().primaryKey().notNull(),
// 	active: boolean(),
// 	name: text(),
// 	description: text(),
// 	image: text(),
// 	metadata: jsonb(),
// }, (table) => [
// 	pgPolicy("Allow public read-only access.", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
// ]);

// export const prices = pgTable("prices", {
// 	id: text().primaryKey().notNull(),
// 	productId: text("product_id"),
// 	active: boolean(),
// 	description: text(),
// 	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
// 	unitAmount: bigint("unit_amount", { mode: "number" }),
// 	currency: text(),
// 	type: pricingType(),
// 	interval: pricingPlanInterval(),
// 	intervalCount: integer("interval_count"),
// 	trialPeriodDays: integer("trial_period_days"),
// 	metadata: jsonb(),
// }, (table) => [
// 	foreignKey({
// 			columns: [table.productId],
// 			foreignColumns: [products.id],
// 			name: "prices_product_id_fkey"
// 		}),
// 	pgPolicy("Allow public read-only access.", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
// 	check("prices_currency_check", sql`char_length(currency) = 3`),
// ]);

// export const subscriptions = pgTable("subscriptions", {
// 	id: text().primaryKey().notNull(),
// 	userId: uuid("user_id").notNull(),
// 	status: subscriptionStatus(),
// 	metadata: jsonb(),
// 	priceId: text("price_id"),
// 	quantity: integer(),
// 	cancelAtPeriodEnd: boolean("cancel_at_period_end"),
// 	created: timestamp({ withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
// 	currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
// 	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`).notNull(),
// 	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`),
// 	cancelAt: timestamp("cancel_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`),
// 	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`),
// 	trialStart: timestamp("trial_start", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`),
// 	trialEnd: timestamp("trial_end", { withTimezone: true, mode: 'string' }).default(sql`timezone('utc'::text, now())`),
// }, (table) => [
// 	foreignKey({
// 			columns: [table.priceId],
// 			foreignColumns: [prices.id],
// 			name: "subscriptions_price_id_fkey"
// 		}),
// 	foreignKey({
// 			columns: [table.userId],
// 			foreignColumns: [users.id],
// 			name: "subscriptions_user_id_fkey"
// 		}),
// 	pgPolicy("Can only view own subs data.", { as: "permissive", for: "select", to: ["public"], using: sql`(( SELECT auth.uid() AS uid) = user_id)` }),
// ]);

// export const collaborators = pgTable("collaborators", {
// 	id: uuid().defaultRandom().primaryKey().notNull(),
// 	workspaceId: uuid("workspace_id").notNull(),
// 	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
// 	userId: uuid("user_id").notNull(),
// }, (table) => [
// 	foreignKey({
// 			columns: [table.workspaceId],
// 			foreignColumns: [workspaces.id],
// 			name: "collaborators_workspace_id_workspaces_id_fk"
// 		}).onDelete("cascade"),
// ]);

// export const usersInAuth = pgTable("usersInAuth", {
// 	id: uuid("id").primaryKey().notNull(),
// 	// add other column definitions as needed
// 	email: text("email").notNull(),
// 	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
//   });
	

import {
	pgTable,
	pgEnum,
	uuid,
	timestamp,
	text,
	foreignKey,
	jsonb,
	boolean,
	bigint,
	integer,
  } from 'drizzle-orm/pg-core';
  
  import { relations, sql } from 'drizzle-orm';
  export const keyStatus = pgEnum('key_status', [
	'expired',
	'invalid',
	'valid',
	'default',
  ]);
  export const keyType = pgEnum('key_type', [
	'stream_xchacha20',
	'secretstream',
	'secretbox',
	'kdf',
	'generichash',
	'shorthash',
	'auth',
	'hmacsha256',
	'hmacsha512',
	'aead-det',
	'aead-ietf',
  ]);
  export const factorStatus = pgEnum('factor_status', ['verified', 'unverified']);
  export const factorType = pgEnum('factor_type', ['webauthn', 'totp']);
  export const aalLevel = pgEnum('aal_level', ['aal3', 'aal2', 'aal1']);
  export const codeChallengeMethod = pgEnum('code_challenge_method', [
	'plain',
	's256',
  ]);
  export const pricingType = pgEnum('pricing_type', ['recurring', 'one_time']);
  export const pricingPlanInterval = pgEnum('pricing_plan_interval', [
	'year',
	'month',
	'week',
	'day',
  ]);
  export const subscriptionStatus = pgEnum('subscription_status', [
	'unpaid',
	'past_due',
	'incomplete_expired',
	'incomplete',
	'canceled',
	'active',
	'trialing',
  ]);
  export const equalityOp = pgEnum('equality_op', [
	'in',
	'gte',
	'gt',
	'lte',
	'lt',
	'neq',
	'eq',
  ]);
  export const action = pgEnum('action', [
	'ERROR',
	'TRUNCATE',
	'DELETE',
	'UPDATE',
	'INSERT',
  ]);
  
  export const workspaces = pgTable('workspaces', {
	id: uuid('id').defaultRandom().primaryKey().notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
	  .defaultNow()
	  .notNull(),
	workspaceOwner: uuid('workspace_owner').notNull(),
	title: text('title').notNull(),
	iconId: text('icon_id').notNull(),
	data: text('data'),
	inTrash: text('in_trash'),
	logo: text('logo'),
	bannerUrl: text('banner_url'),
  });
  
  export const folders = pgTable('folders', {
	id: uuid('id').defaultRandom().primaryKey().notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
	  .defaultNow()
	  .notNull(),
	title: text('title').notNull(),
	iconId: text('icon_id').notNull(),
	data: text('data'),
	inTrash: text('in_trash'),
	bannerUrl: text('banner_url'),
	workspaceId: uuid('workspace_id')
	  .notNull()
	  .references(() => workspaces.id, { onDelete: 'cascade' }),
  });
  
  export const files = pgTable('files', {
	id: uuid('id').defaultRandom().primaryKey().notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
	  .defaultNow()
	  .notNull(),
	title: text('title').notNull(),
	iconId: text('icon_id').notNull(),
	data: text('data'),
	inTrash: text('in_trash'),
	bannerUrl: text('banner_url'),
	workspaceId: uuid('workspace_id')
	  .notNull()
	  .references(() => workspaces.id, { onDelete: 'cascade' }),
	folderId: uuid('folder_id')
	  .notNull()
	  .references(() => folders.id, { onDelete: 'cascade' }),
  });
  
  export const users = pgTable('users', {
	id: uuid('id').primaryKey().notNull(),
	fullName: text('full_name'),
	avatarUrl: text('avatar_url'),
	billingAddress: jsonb('billing_address'),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
	paymentMethod: jsonb('payment_method'),
	email: text('email'),
  });
  
  export const customers = pgTable('customers', {
	id: uuid('id').primaryKey().notNull(),
	stripeCustomerId: text('stripe_customer_id'),
  });
  
  export const prices = pgTable('prices', {
	id: text('id').primaryKey().notNull(),
	productId: text('product_id').references(() => products.id),
	active: boolean('active'),
	description: text('description'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	unitAmount: bigint('unit_amount', { mode: 'number' }),
	currency: text('currency'),
	type: pricingType('type'),
	interval: pricingPlanInterval('interval'),
	intervalCount: integer('interval_count'),
	trialPeriodDays: integer('trial_period_days'),
	metadata: jsonb('metadata'),
  });
  
  export const products = pgTable('products', {
	id: text('id').primaryKey().notNull(),
	active: boolean('active'),
	name: text('name'),
	description: text('description'),
	image: text('image'),
	metadata: jsonb('metadata'),
  });
  
  export const subscriptions = pgTable('subscriptions', {
	id: text('id').primaryKey().notNull(),
	userId: uuid('user_id').notNull(),
	status: subscriptionStatus('status'),
	metadata: jsonb('metadata'),
	priceId: text('price_id').references(() => prices.id),
	quantity: integer('quantity'),
	cancelAtPeriodEnd: boolean('cancel_at_period_end'),
	created: timestamp('created', { withTimezone: true, mode: 'string' })
	  .default(sql`now()`)
	  .notNull(),
	currentPeriodStart: timestamp('current_period_start', {
	  withTimezone: true,
	  mode: 'string',
	})
	  .default(sql`now()`)
	  .notNull(),
	currentPeriodEnd: timestamp('current_period_end', {
	  withTimezone: true,
	  mode: 'string',
	})
	  .default(sql`now()`)
	  .notNull(),
	endedAt: timestamp('ended_at', {
	  withTimezone: true,
	  mode: 'string',
	}).default(sql`now()`),
	cancelAt: timestamp('cancel_at', {
	  withTimezone: true,
	  mode: 'string',
	}).default(sql`now()`),
	canceledAt: timestamp('canceled_at', {
	  withTimezone: true,
	  mode: 'string',
	}).default(sql`now()`),
	trialStart: timestamp('trial_start', {
	  withTimezone: true,
	  mode: 'string',
	}).default(sql`now()`),
	trialEnd: timestamp('trial_end', {
	  withTimezone: true,
	  mode: 'string',
	}).default(sql`now()`),
  });
  
  export const collaborators = pgTable('collaborators', {
	workspaceId: uuid('workspace_id')
	  .notNull()
	  .references(() => workspaces.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
	  .defaultNow()
	  .notNull(),
	userId: uuid('user_id')
	  .notNull()
	  .references(() => users.id, { onDelete: 'cascade' }),
	id: uuid('id').defaultRandom().primaryKey().notNull(),
  });
  
  export const productsRelations = relations(products, ({ many }) => ({
	prices: many(prices),
  }));
  
  export const pricesRelations = relations(prices, ({ one }) => ({
	product: one(products, {
	  fields: [prices.productId],
	  references: [products.id],
	}),
  }));