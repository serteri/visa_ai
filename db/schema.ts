import { pgTable, text, timestamp, uuid, jsonb, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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

// Relations
export const visaTypesRelations = relations(visaTypes, ({ one, many }) => ({
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
