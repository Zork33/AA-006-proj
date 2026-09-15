-- =====================================================
-- Миграция 002: Unified Users + Roles + Referral Codes
-- Ветка: v2
-- =====================================================

-- =====================================================
-- 1. Таблица users (единая для admins, partners, clients)
-- =====================================================
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  name              VARCHAR(255),
  phone             VARCHAR(50),
  password_hash     VARCHAR(255),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_super_admin    BOOLEAN NOT NULL DEFAULT false,
  deleted_at        TIMESTAMP NULL,
  last_login_at     TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT super_admin_always_active CHECK (NOT is_super_admin OR status = 'active')
);

-- =====================================================
-- 2. Таблица partners
-- =====================================================
CREATE TABLE partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) UNIQUE NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. Таблица user_roles (many-to-many: пользователь ↔ роль)
-- =====================================================
CREATE TABLE user_roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              VARCHAR(20) NOT NULL,
  partner_id        UUID REFERENCES partners(id) ON DELETE CASCADE,
  access_level      VARCHAR(10),
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id),
  UNIQUE(user_id, role, partner_id),
  CONSTRAINT super_admin_no_partner CHECK (role != 'super_admin' OR partner_id IS NULL),
  CONSTRAINT partner_admin_has_partner CHECK (role != 'partner_admin' OR partner_id IS NOT NULL),
  CONSTRAINT access_level_only_for_partner_admin CHECK (role = 'partner_admin' OR access_level IS NULL)
);

-- =====================================================
-- 4. Таблица user_partners (many-to-many: пользователь ↔ партнёр)
-- =====================================================
CREATE TABLE user_partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id        UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id)
);

-- =====================================================
-- 5. Таблица referral_codes
-- =====================================================
CREATE TABLE referral_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(32) UNIQUE NOT NULL,
  type              VARCHAR(20) NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  owner_partner_id  UUID REFERENCES partners(id),
  target_type       VARCHAR(20) NOT NULL,
  target_partner_id UUID REFERENCES partners(id),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  expires_at        TIMESTAMP,
  max_uses          INT,
  used_count        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT partner_invite_must_have_owner CHECK (type != 'partner_invite' OR owner_partner_id IS NOT NULL)
);

-- =====================================================
-- 6. Таблица referral_usages
-- =====================================================
CREATE TABLE referral_usages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id  UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  invited_user_id   UUID REFERENCES users(id),
  invited_email     VARCHAR(255),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  activated_at      TIMESTAMP,
  snapshot_created_by_user_id UUID,
  snapshot_owner_partner_id   UUID,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. Таблица services
-- =====================================================
CREATE TABLE services (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  price           INTEGER,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 8. Таблица leads (обновлённая)
-- =====================================================
CREATE TABLE leads (
  id              SERIAL PRIMARY KEY,
  lead_number     VARCHAR(20) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  city            VARCHAR(255) NOT NULL,
  messenger       VARCHAR(50),
  service_id      INTEGER REFERENCES services(id),
  partner_id      UUID REFERENCES partners(id),
  source          VARCHAR(20) NOT NULL DEFAULT 'QR',
  attribution     VARCHAR(20) NOT NULL DEFAULT 'first_touch',
  status          VARCHAR(20) NOT NULL DEFAULT 'NEW',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 9. Таблица lead_feedback
-- =====================================================
CREATE TABLE lead_feedback (
  id              SERIAL PRIMARY KEY,
  lead_id         INTEGER REFERENCES leads(id) UNIQUE NOT NULL,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 10. Таблица visits (обновлённая)
-- =====================================================
CREATE TABLE visits (
  id              SERIAL PRIMARY KEY,
  session_id      VARCHAR(64) NOT NULL,
  partner_id      UUID REFERENCES partners(id),
  source          VARCHAR(20) NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ИНДЕКСЫ
-- =====================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_partner ON user_roles(partner_id);
CREATE INDEX idx_user_partners_user ON user_partners(user_id);
CREATE INDEX idx_user_partners_partner ON user_partners(partner_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_owner ON referral_codes(owner_partner_id);
CREATE INDEX idx_referral_usages_code ON referral_usages(referral_code_id);
CREATE INDEX idx_referral_usages_user ON referral_usages(invited_user_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_partner ON leads(partner_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_number ON leads(lead_number);
CREATE INDEX idx_leads_service ON leads(service_id);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_dedup ON leads(phone, service_id, partner_id, created_at DESC);
CREATE INDEX idx_feedback_lead ON lead_feedback(lead_id);
CREATE INDEX idx_visits_session ON visits(session_id);

-- =====================================================
-- ТРИГГЕРЫ
-- =====================================================

-- Super Admin всегда active
CREATE OR REPLACE FUNCTION check_super_admin_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_super_admin AND NEW.status != 'active' THEN
    RAISE EXCEPTION 'Super Admin always must be active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_super_admin_status
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_super_admin_status();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Seed: дефолтный список услуг
INSERT INTO services (name, description) VALUES
  ('Недвижимость', 'Помощь с покупкой, продажей или арендой недвижимости'),
  ('Сантехника', 'Установка и ремонт сантехники (краны, трубы, смесители)'),
  ('Кондиционирование', 'Установка и обслуживание кондиционеров'),
  ('Окна', 'Установка, замена и ремонт окон'),
  ('Двери', 'Установка и замена дверей, порталов'),
  ('Электрика', 'Электромонтажные работы, проводка, розетки'),
  ('Клиники', 'Услуги медицинских клиник');

-- Seed: корневой суперадмин (пароль задаётся при первом входе)
INSERT INTO users (email, name, status, is_super_admin)
VALUES ('admin@example.com', 'Суперадмин', 'active', true);

-- Seed: роль super_admin для корневого суперадмина
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin' FROM users WHERE email = 'admin@example.com';

-- Seed: тестовый суперадмин (пароль: test1234)
-- Хеш: $2b$12$2ERYXe8WAD8dsdiRdQQKIeRErsfd2sX/5wktodNI2OIvcywybb/xu
INSERT INTO users (email, name, password_hash, status, is_super_admin)
VALUES ('test@example.com', 'Тестовый Суперадмин', '$2b$12$2ERYXe8WAD8dsdiRdQQKIeRErsfd2sX/5wktodNI2OIvcywybb/xu', 'active', true);

INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin' FROM users WHERE email = 'test@example.com';

-- Seed: первый партнёр — наш собственный бизнес
INSERT INTO users (email, name, status, is_super_admin)
VALUES ('info@nashbiz.ru', 'НашБизнес', 'active', false);

INSERT INTO partners (name, slug, status, created_by)
SELECT 'НашБизнес', 'nashbiz', 'active', id FROM users WHERE email = 'info@nashbiz.ru';

-- Роль partner_admin для нашего партнёра
INSERT INTO user_roles (user_id, role, partner_id, access_level)
SELECT u.id, 'partner_admin', p.id, 'full'
FROM users u, partners p
WHERE u.email = 'info@nashbiz.ru' AND p.slug = 'nashbiz';

-- Реферальный код для нашего партнёра
INSERT INTO referral_codes (code, type, created_by_user_id, owner_partner_id, target_type, is_active)
SELECT 'NASH', 'partner_invite', u.id, p.id, 'partner', true
FROM users u, partners p
WHERE u.email = 'info@nashbiz.ru' AND p.slug = 'nashbiz';

-- Seed: тестовый партнёр
INSERT INTO users (email, name, password_hash, status, is_super_admin)
VALUES ('partner@example.com', 'Тестовый Партнёр', '$2b$12$765gQbaSLOSvVLWpHku/M.TCycYE8tTo6zkQakjYrdCe6/LbpntgW', 'active', false);

INSERT INTO partners (name, slug, status, created_by)
SELECT 'Тестовый Партнёр', 'test-partner', 'active', id FROM users WHERE email = 'admin@example.com';

INSERT INTO user_roles (user_id, role, partner_id, access_level)
SELECT u.id, 'partner_admin', p.id, 'full'
FROM users u, partners p
WHERE u.email = 'partner@example.com' AND p.slug = 'test-partner';

INSERT INTO referral_codes (code, type, created_by_user_id, owner_partner_id, target_type, is_active)
SELECT 'TESTPARTNER', 'partner_invite', u.id, p.id, 'partner', true
FROM users u, partners p
WHERE u.email = 'partner@example.com' AND p.slug = 'test-partner';
