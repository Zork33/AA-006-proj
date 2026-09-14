-- Migration: Add missing indexes for query optimization
-- Date: 2026-09-15
-- Based on: postgres-patterns skill analysis
-- NOTE: CONCURRENTLY cannot run inside a transaction.
-- Run with: psql -f migration.sql OR mark as non-transactional in your runner.

-- UP: Create indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_service ON leads(service_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_dedup ON leads(phone, service_id, partner_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partners_referrer ON partners(referrer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partners_region ON partners(region);

-- DOWN: Drop indexes (must run outside transaction)
-- DROP INDEX CONCURRENTLY IF EXISTS idx_leads_service;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_leads_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_leads_dedup;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_partners_referrer;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_partners_region;