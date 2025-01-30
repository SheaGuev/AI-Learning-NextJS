CREATE TABLE "collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "subscription_status",
	"metadata" jsonb,
	"price_id" text,
	"quantity" integer,
	"cancel_at_period_end" boolean,
	"created" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"current_period_start" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"current_period_end" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
	"ended_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
	"cancel_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
	"canceled_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
	"trial_start" timestamp with time zone DEFAULT timezone('utc'::text, now()),
	"trial_end" timestamp with time zone DEFAULT timezone('utc'::text, now())
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "public"."prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Can only view own subs data." ON "subscriptions" AS PERMISSIVE FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) = user_id));