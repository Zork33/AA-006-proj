-- Migration: Add missing indexes for query optimization
-- Date: 2026-09-15
-- Based on: postgres-patterns skill analysis

-- High priority: leads dedup query + listing sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_service ON leads(service_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_dedup ON leads(phone, service_id, partner_id, created_at DESC);

-- Medium priority: partners queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partners_referrer ON partners(referrer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partners_region ON partners(region);