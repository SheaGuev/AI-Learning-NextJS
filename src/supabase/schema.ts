// // // import { date } from 'drizzle-orm/mysql-core';
// // // import { pgTable, timestamp, uuid, text } from 'drizzle-orm/pg-core';

// // // export const workspaces = pgTable('workspaces', {
// // //     id: uuid('id').defaultRandom().primaryKey().notNull(),
// // //     createdAt: timestamp('created_at', {
// // //         withTimezone: true,
// // //         mode: 'string',
// // //     }),
// // //     workspaceOwner: uuid('workspace_owner').notNull(),
// // //     title: text('title').notNull(),
// // //     iconId: text('icon_id').notNull(),
// // //     data: text('data'),
// // //     inTrash: text('in_trash'),
// // //     logo: text('logo'),
// // //     bannerUrl: text('banner_url'),
// // // });

// import { relations, sql } from 'drizzle-orm';

// import {
//   boolean,
//   foreignKey,
//   integer,
//   jsonb,
//   pgPolicy,
//   pgTable,
//   text,
//   timestamp,
//   uuid,
// } from 'drizzle-orm/pg-core';





// export const workspaces = pgTable('workspaces', {
//   id: uuid('id').defaultRandom().primaryKey().notNull(),
//   createdAt: timestamp('created_at', {
//     withTimezone: true,
//     mode: 'string',
//   })
//     .defaultNow()
//     .notNull(),
//   workspaceOwner: uuid('workspace_owner').notNull(),
//   title: text('title').notNull(),
//   iconId: text('icon_id').notNull(),
//   data: text('data'),
//   inTrash: text('in_trash'),
//   logo: text('logo'),
//   bannerUrl: text('banner_url'),
// });

// export const folders = pgTable('folders', {
//   id: uuid('id').defaultRandom().primaryKey().notNull(),
//   createdAt: timestamp('created_at', {
//     withTimezone: true,
//     mode: 'string',
//   })
//     .defaultNow()
//     .notNull(),
//   title: text('title').notNull(),
//   iconId: text('icon_id').notNull(),
//   data: text('data'),
//   inTrash: text('in_trash'),
//   bannerUrl: text('banner_url'),
//   workspaceId: uuid('workspace_id')
//     .notNull()
//     .references(() => workspaces.id, {
//       onDelete: 'cascade',
//     }),
// });

// export const files = pgTable('files', {
//   id: uuid('id').defaultRandom().primaryKey().notNull(),
//   createdAt: timestamp('created_at', {
//     withTimezone: true,
//     mode: 'string',
//   })
//     .defaultNow()
//     .notNull(),
//   title: text('title').notNull(),
//   iconId: text('icon_id').notNull(),
//   data: text('data'),
//   inTrash: text('in_trash'),
//   bannerUrl: text('banner_url'),
//   workspaceId: uuid('workspace_id')
//     .notNull()
//     .references(() => workspaces.id, {
//       onDelete: 'cascade',
//     }),
//   folderId: uuid('folder_id')
//     .notNull()
//     .references(() => folders.id, {
//       onDelete: 'cascade',
//     }),
// });


// import {
//   prices,
//   products,
//   subscriptionStatus,
//   users,
// } from '../../migrations/schema';

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


// export const collaborators = pgTable('collaborators', {
//   id: uuid('id').defaultRandom().primaryKey().notNull(),
//   workspaceId: uuid('workspace_id')
//     .notNull()
//     .references(() => workspaces.id, { onDelete: 'cascade' }),
//   createdAt: timestamp('created_at', {
//     withTimezone: true,
//     mode: 'string',
//   })
//     .defaultNow()
//     .notNull(),
//   userId: uuid('user_id')
//     .notNull()
//     .references(() => users.id, { onDelete: 'cascade' }),
// });

// // // //Dont Delete!!!
// // export const productsRelations = relations(products, ({ many }) => ({
// //   prices: many(prices),
// // }));

// // export const pricesRelations = relations(prices, ({ one }) => ({
// //   product: one(products, {
// //     fields: [prices.productId],
// //     references: [products.id],
// //   }),
// // }));


import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Define missing enums
export const subscriptionStatus = pgEnum('subscription_status', [
  'trialing', 'active', 'canceled', 'incomplete', 
  'incomplete_expired', 'past_due', 'unpaid'
]);

// Define tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  billingAddress: jsonb('billing_address'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  paymentMethod: jsonb('payment_method'),
  email: text('email'),
});

export const products = pgTable('products', {
  id: text('id').primaryKey().notNull(),
  active: boolean('active'),
  name: text('name'),
  description: text('description'),
  image: text('image'),
  metadata: jsonb('metadata'),
});

export const prices = pgTable('prices', {
  id: text('id').primaryKey().notNull(),
  productId: text('product_id').references(() => products.id),
  active: boolean('active'),
  description: text('description'),
  // Add other fields as needed
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  })
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
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  })
    .defaultNow()
    .notNull(),
  title: text('title').notNull(),
  iconId: text('icon_id').notNull(),
  data: text('data'),
  inTrash: text('in_trash'),
  bannerUrl: text('banner_url'),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {
      onDelete: 'cascade',
    }),
});

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  })
    .defaultNow()
    .notNull(),
  title: text('title').notNull(),
  iconId: text('icon_id').notNull(),
  data: text('data'),
  inTrash: text('in_trash'),
  bannerUrl: text('banner_url'),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, {
      onDelete: 'cascade',
    }),
  folderId: uuid('folder_id')
    .notNull()
    .references(() => folders.id, {
      onDelete: 'cascade',
    }),
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
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  })
    .defaultNow()
    .notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

//Dont Delete!!!
export const productsRelations = relations(products, ({ many }) => ({
  prices: many(prices),
}));

export const pricesRelations = relations(prices, ({ one }) => ({
  product: one(products, {
    fields: [prices.productId],
    references: [products.id],
  }),
}));