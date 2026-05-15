import { pgTable, text, timestamp, uuid, jsonb, date, boolean, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// NOTE: auth + user dashboard tables (users, accounts, sessions, verification_tokens,
// saved_calculations, saved_quiz_results, saved_reports, visa_tracking) are now
// managed by Prisma (prisma/schema.prisma). Do not add them here.

export const visaTypes = pgTable("visa_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  subclass: text("subclass").notNull().unique(),
  visa_name: text("visa_name").notNull(),
  category: text("category").notNull(),
  purpose: text("purpose"),
  stay_period: text("stay_period"),
  cost: text("cost"),
  work_rights: text("work_rights"),
  source_url: text("source_url"),
  last_checked: date("last_checked"),
  reviewed_status: text("reviewed_status").default("needs_review"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const visaStructuredData = pgTable("visa_structured_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  visa_type_id: uuid("visa_type_id")
    .notNull()
    .references(() => visaTypes.id),
  key_requirements: jsonb("key_requirements"),
  documents_required: jsonb("documents_required"),
  application_steps: jsonb("application_steps"),
  visa_conditions: jsonb("visa_conditions"),
  risks: jsonb("risks"),
  english_requirements: jsonb("english_requirements"),
  financial_requirements: jsonb("financial_requirements"),
  raw_json: jsonb("raw_json"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const sourceSnapshots = pgTable("source_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  visa_type_id: uuid("visa_type_id")
    .notNull()
    .references(() => visaTypes.id),
  source_url: text("source_url").notNull(),
  pdf_snapshot_url: text("pdf_snapshot_url"),
  raw_text: text("raw_text"),
  captured_at: timestamp("captured_at").defaultNow(),
  content_hash: text("content_hash"),
  notes: text("notes"),
});

export const agentReferrals = pgTable("agent_referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  full_name: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  country_of_passport: text("country_of_passport").notNull(),
  current_country: text("current_country").notNull(),
  preferred_language: text("preferred_language").notNull(),
  visa_interest: text("visa_interest").notNull(),
  short_message: text("short_message").notNull(),
  consent: boolean("consent").notNull(),
  status: text("status").default("new"),
  assigned_agent_id: uuid("assigned_agent_id").references(() => agents.id),
  assigned_at: timestamp("assigned_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const fullCheckWaitlist = pgTable("full_check_waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  full_name: text("full_name"),
  visa_interest: text("visa_interest"),
  preferred_language: text("preferred_language"),
  current_country: text("current_country"),
  passport_country: text("passport_country"),
  age: text("age"),
  occupation: text("occupation"),
  english_level: text("english_level"),
  english_test_taken: text("english_test_taken"),
  occupation_confirmed: text("occupation_confirmed"),
  estimated_budget_range: text("estimated_budget_range"),
  timeline: text("timeline"),
  sponsor_or_family: text("sponsor_or_family"),
  biggest_concern: text("biggest_concern"),
  main_goal: text("main_goal"),
  lead_score: integer("lead_score"),
  lead_tier: text("lead_tier"),
  source: text("source").default("full_check"),
  created_at: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").default("full_check"),
  full_name: text("full_name"),
  email: text("email").notNull(),
  preferred_language: text("preferred_language"),
  current_country: text("current_country"),
  passport_country: text("passport_country"),
  age: text("age"),
  occupation: text("occupation"),
  english_level: text("english_level"),
  english_test_taken: text("english_test_taken"),
  occupation_confirmed: text("occupation_confirmed"),
  estimated_budget_range: text("estimated_budget_range"),
  timeline: text("timeline"),
  sponsor_or_family: text("sponsor_or_family"),
  biggest_concern: text("biggest_concern"),
  main_goal: text("main_goal"),
  selected_visa: text("selected_visa"),
  system_score: integer("system_score"),
  lead_score: integer("lead_score"),
  lead_tier: text("lead_tier"),
  report_id: uuid("report_id"),
  report_locale: text("report_locale"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const fullCheckUsage = pgTable("full_check_usage", {
  id: integer("id").primaryKey().default(1),
  free_reports_used: integer("free_reports_used").default(0),
  free_limit: integer("free_limit").default(50),
  is_free_active: boolean("is_free_active").default(true),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const pdfDownloads = pgTable("pdf_downloads", {
  id: uuid("id").primaryKey().defaultRandom(),
  full_name: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  ip_address: text("ip_address").notNull(),
  pdf_slug: text("pdf_slug").notNull().default("avustralya-pr-rehberi-2026"),
  is_paid: boolean("is_paid").default(false),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => ({
  ip_idx: index("pdf_downloads_ip_idx").on(table.ip_address),
  email_idx: index("pdf_downloads_email_idx").on(table.email),
}));

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  full_name: text("full_name").notNull(),
  business_name: text("business_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  marn: text("marn"),
  languages: jsonb("languages"),
  specialties: jsonb("specialties"),
  locations: jsonb("locations"),
  active: boolean("active").default(true),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Relations
export const visaTypesRelations = relations(visaTypes, ({ many }) => ({
  structured_data: many(visaStructuredData),
  snapshots: many(sourceSnapshots),
}));

export const visaStructuredDataRelations = relations(
  visaStructuredData,
  ({ one }) => ({
    visa_type: one(visaTypes, {
      fields: [visaStructuredData.visa_type_id],
      references: [visaTypes.id],
    }),
  })
);

export const sourceSnapshotsRelations = relations(
  sourceSnapshots,
  ({ one }) => ({
    visa_type: one(visaTypes, {
      fields: [sourceSnapshots.visa_type_id],
      references: [visaTypes.id],
    }),
  })
);
