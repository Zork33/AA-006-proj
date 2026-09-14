import { pgTable, serial, varchar, text, integer, timestamp, boolean, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('admin_role', ['superadmin', 'admin']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);
export const partnerStatusEnum = pgEnum('partner_status', ['pending', 'active', 'blocked']);
export const leadStatusEnum = pgEnum('lead_status', ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'COMPLETED', 'REJECTED', 'DUPLICATE', 'CANCELLED']);

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: roleEnum('role').notNull().default('admin'),
  region: varchar('region', { length: 100 }),
  residentialComplex: varchar('residential_complex', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  isTest: boolean('is_test').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const partners = pgTable('partners', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  partnerCode: varchar('partner_code', { length: 20 }).unique().notNull(),
  status: partnerStatusEnum('status').notNull().default('pending'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending'),
  approvedBy: integer('approved_by').references(() => admins.id),
  approvedAt: timestamp('approved_at'),
  rating: integer('rating').notNull().default(100),
  referralToken: varchar('referral_token', { length: 64 }).unique().notNull(),
  referrerId: integer('referrer_id'),
  region: varchar('region', { length: 100 }),
  residentialComplex: varchar('residential_complex', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  uniqueIndex('idx_partners_token').on(table.referralToken),
  uniqueIndex('idx_partners_code').on(table.partnerCode),
]);

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  leadNumber: varchar('lead_number', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  city: varchar('city', { length: 255 }).notNull(),
  messenger: varchar('messenger', { length: 50 }),
  serviceId: integer('service_id').references(() => services.id),
  partnerId: integer('partner_id').references(() => partners.id),
  source: varchar('source', { length: 20 }).notNull().default('QR'),
  attribution: varchar('attribution', { length: 20 }).notNull().default('first_touch'),
  status: leadStatusEnum('status').notNull().default('NEW'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const leadFeedback = pgTable('lead_feedback', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).unique().notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const visits = pgTable('visits', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 64 }).notNull(),
  partnerId: integer('partner_id').references(() => partners.id),
  source: varchar('source', { length: 20 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});
