CREATE TABLE "source_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visa_type_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"pdf_snapshot_url" text,
	"raw_text" text,
	"captured_at" timestamp DEFAULT now(),
	"content_hash" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "visa_structured_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visa_type_id" uuid NOT NULL,
	"key_requirements" jsonb,
	"documents_required" jsonb,
	"application_steps" jsonb,
	"visa_conditions" jsonb,
	"risks" jsonb,
	"english_requirements" jsonb,
	"financial_requirements" jsonb,
	"raw_json" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "visa_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subclass" text NOT NULL,
	"visa_name" text NOT NULL,
	"category" text NOT NULL,
	"purpose" text,
	"stay_period" text,
	"cost" text,
	"work_rights" text,
	"source_url" text,
	"last_checked" date,
	"reviewed_status" text DEFAULT 'needs_review',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "visa_types_subclass_unique" UNIQUE("subclass")
);
--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_visa_type_id_visa_types_id_fk" FOREIGN KEY ("visa_type_id") REFERENCES "public"."visa_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visa_structured_data" ADD CONSTRAINT "visa_structured_data_visa_type_id_visa_types_id_fk" FOREIGN KEY ("visa_type_id") REFERENCES "public"."visa_types"("id") ON DELETE no action ON UPDATE no action;