CREATE TYPE "public"."export_job_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "deal" ADD COLUMN "lost_reason" text;--> statement-breakpoint
CREATE TABLE "export_job" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"report_id" text NOT NULL,
	"format" text DEFAULT 'csv' NOT NULL,
	"status" "export_job_status" NOT NULL,
	"row_count" integer,
	"result_csv" text,
	"error_message" text,
	"actor_id" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "export_job" ADD CONSTRAINT "export_job_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_job" ADD CONSTRAINT "export_job_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "export_job_workspace_created_idx" ON "export_job" USING btree ("workspace_id","created_at");
