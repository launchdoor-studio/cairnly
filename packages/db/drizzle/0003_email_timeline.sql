ALTER TABLE "email_message" ADD COLUMN "contact_id" text;--> statement-breakpoint
ALTER TABLE "email_message" ADD COLUMN "thread_root_message_id" text;--> statement-breakpoint
ALTER TABLE "email_message" ADD COLUMN "references_header" text;--> statement-breakpoint
ALTER TABLE "email_message" ADD COLUMN "tracking_token" text;--> statement-breakpoint
ALTER TABLE "email_message" ADD CONSTRAINT "email_message_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_message_tracking_token_unique" ON "email_message" USING btree ("tracking_token");--> statement-breakpoint
CREATE INDEX "email_message_contact_workspace_idx" ON "email_message" USING btree ("contact_id","workspace_id");
