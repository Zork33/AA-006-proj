import { pgTable, serial, varchar, text, integer, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// =====================================================
// Enums
// =====================================================
// user_status: active | blocked | pending | deleted
// partner_status: active | pending | rejected | suspended
// user_role: super_admin | partner_admin | service_user
// access_level: full | view_only
// referral_code_type: partner_invite | user_referral
// target_type: service | partner
// referral_usage_status: pending | activated | rejected | expired
// lead_status: NEW | CONTACTED | QUALIFIED | CONVERTED | COMPLETED | REJECTED | DUPLICATE | CANCELLED

// =====================================================
// Users (единая таблица)
// =====================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// =====================================================
// Partners
// =====================================================
export const partners = pgTable('partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// =====================================================
// User Roles (many-to-many)
// =====================================================
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  partnerId: uuid('partner_id').references(() => partners.id, { onDelete: 'cascade' }),
  accessLevel: varchar('access_level', { length: 10 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
});

// =====================================================
// User Partners (many-to-many)
// =====================================================
export const userPartners = pgTable('user_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  partnerId: uuid('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================
// Referral Codes
// =====================================================
export const referralCodes = pgTable('referral_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 32 }).unique().notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  ownerPartnerId: uuid('owner_partner_id').references(() => partners.id),
  targetType: varchar('target_type', { length: 20 }).notNull(),
  targetPartnerId: uuid('target_partner_id').references(() => partners.id),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// =====================================================
// Referral Usages
// =====================================================
export const referralUsages = pgTable('referral_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  referralCodeId: uuid('referral_code_id').notNull().references(() => referralCodes.id, { onDelete: 'cascade' }),
  invitedUserId: uuid('invited_user_id').references(() => users.id),
  invitedEmail: varchar('invited_email', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  activatedAt: timestamp('activated_at'),
  snapshotCreatedByUserId: uuid('snapshot_created_by_user_id'),
  snapshotOwnerPartnerId: uuid('snapshot_owner_partner_id'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================
// Services
// =====================================================
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// =====================================================
// Leads
// =====================================================
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  leadNumber: varchar('lead_number', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  city: varchar('city', { length: 255 }).notNull(),
  messenger: varchar('messenger', { length: 50 }),
  serviceId: integer('service_id').references(() => services.id),
  partnerId: uuid('partner_id').references(() => partners.id),
  source: varchar('source', { length: 20 }).notNull().default('QR'),
  attribution: varchar('attribution', { length: 20 }).notNull().default('first_touch'),
  status: varchar('status', { length: 20 }).notNull().default('NEW'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// =====================================================
// Lead Feedback
// =====================================================
export const leadFeedback = pgTable('lead_feedback', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).unique().notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

// =====================================================
// Visits
// =====================================================
export const visits = pgTable('visits', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  partnerId: uuid('partner_id').references(() => partners.id),
  source: varchar('source', { length: 20 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// =====================================================
// Relations
// =====================================================
export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  userPartners: many(userPartners),
  referralCodes: many(referralCodes),
}));

export const partnersRelations = relations(partners, ({ one, many }) => ({
  createdByUser: one(users, { fields: [partners.createdBy], references: [users.id] }),
  roles: many(userRoles),
  userPartners: many(userPartners),
  referralCodes: many(referralCodes),
  leads: many(leads),
  visits: many(visits),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  partner: one(partners, { fields: [userRoles.partnerId], references: [partners.id] }),
  createdByUser: one(users, { fields: [userRoles.createdBy], references: [users.id] }),
}));

export const userPartnersRelations = relations(userPartners, ({ one }) => ({
  user: one(users, { fields: [userPartners.userId], references: [users.id] }),
  partner: one(partners, { fields: [userPartners.partnerId], references: [partners.id] }),
}));

export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  createdByUser: one(users, { fields: [referralCodes.createdByUserId], references: [users.id] }),
  ownerPartner: one(partners, { fields: [referralCodes.ownerPartnerId], references: [partners.id] }),
  targetPartner: one(partners, { fields: [referralCodes.targetPartnerId], references: [partners.id] }),
  usages: many(referralUsages),
}));

export const referralUsagesRelations = relations(referralUsages, ({ one }) => ({
  referralCode: one(referralCodes, { fields: [referralUsages.referralCodeId], references: [referralCodes.id] }),
  invitedUser: one(users, { fields: [referralUsages.invitedUserId], references: [users.id] }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  service: one(services, { fields: [leads.serviceId], references: [services.id] }),
  partner: one(partners, { fields: [leads.partnerId], references: [partners.id] }),
  feedback: one(leadFeedback),
}));

export const leadFeedbackRelations = relations(leadFeedback, ({ one }) => ({
  lead: one(leads, { fields: [leadFeedback.leadId], references: [leads.id] }),
}));

export const visitsRelations = relations(visits, ({ one }) => ({
  partner: one(partners, { fields: [visits.partnerId], references: [partners.id] }),
}));

// =====================================================
// Types
// =====================================================
export type User = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type Partner = InferSelectModel<typeof partners>;
export type PartnerInsert = InferInsertModel<typeof partners>;
export type UserRole = InferSelectModel<typeof userRoles>;
export type UserRoleInsert = InferInsertModel<typeof userRoles>;
export type UserPartner = InferSelectModel<typeof userPartners>;
export type UserPartnerInsert = InferInsertModel<typeof userPartners>;
export type ReferralCode = InferSelectModel<typeof referralCodes>;
export type ReferralCodeInsert = InferInsertModel<typeof referralCodes>;
export type ReferralUsage = InferSelectModel<typeof referralUsages>;
export type ReferralUsageInsert = InferInsertModel<typeof referralUsages>;
export type Service = InferSelectModel<typeof services>;
export type ServiceInsert = InferInsertModel<typeof services>;
export type Lead = InferSelectModel<typeof leads>;
export type LeadInsert = InferInsertModel<typeof leads>;
export type LeadFeedback = InferSelectModel<typeof leadFeedback>;
export type Visit = InferSelectModel<typeof visits>;
