-- Services (фиксированный список на старте)
CREATE TABLE services (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  price           INTEGER,  -- в копках, NULL если не отображается
  status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | hidden
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Admins (Администраторы)
CREATE TABLE admins (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'admin',  -- superadmin | admin
  region          VARCHAR(100),  -- регион ответственности (NULL = все регионы)
  residential_complex VARCHAR(255),  -- ЖК ответственности (NULL = все ЖК)
  password_hash   VARCHAR(255),  -- NULL у корневого суперадмина до первого входа
  is_test         BOOLEAN NOT NULL DEFAULT false,  -- тестовый суперадмин
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Partners (Партнёры)
CREATE TABLE partners (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  partner_code    VARCHAR(20) UNIQUE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | active | blocked
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  approved_by     INTEGER REFERENCES admins(id),
  approved_at     TIMESTAMP,
  rating          INTEGER NOT NULL DEFAULT 100,  -- 0–100, автоматически
  referral_token  VARCHAR(64) UNIQUE NOT NULL,
  referrer_id     INTEGER REFERENCES partners(id),
  region          VARCHAR(100),  -- регион (Берск, Иркутск и т.д.)
  residential_complex VARCHAR(255),  -- ЖК (если привязан)
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_partners_token ON partners(referral_token);
CREATE UNIQUE INDEX idx_partners_code ON partners(partner_code);

-- Leads (Заявки)
CREATE TABLE leads (
  id              SERIAL PRIMARY KEY,
  lead_number     VARCHAR(20) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  city            VARCHAR(255) NOT NULL,
  messenger       VARCHAR(50),
  service_id      INTEGER REFERENCES services(id),
  partner_id      INTEGER REFERENCES partners(id),
  source          VARCHAR(20) NOT NULL DEFAULT 'QR',  -- QR | partner
  attribution     VARCHAR(20) NOT NULL DEFAULT 'first_touch',
  status          VARCHAR(20) NOT NULL DEFAULT 'NEW',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_partner ON leads(partner_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_number ON leads(lead_number);

-- Visits (Посещения / Атрибуция)
CREATE TABLE visits (
  id              SERIAL PRIMARY KEY,
  session_id      VARCHAR(64) NOT NULL,
  partner_id      INTEGER REFERENCES partners(id),
  source          VARCHAR(20) NOT NULL,  -- QR | partner
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visits_session ON visits(session_id);

-- === SEED DATA ===

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
INSERT INTO admins (name, email, role, password_hash)
VALUES ('Суперадмин', 'admin@example.com', 'superadmin', NULL);

-- Seed: тестовый суперадмин (только в test-режиме)
-- INSERT INTO admins (name, email, role, password_hash, is_test)
-- VALUES ('ТестовыйАдмин', 'test@example.com', 'superadmin', 'test-hash', true);

-- Seed: первый партнёр — наш собственный бизнес (одобрен сразу)
INSERT INTO partners (name, email, partner_code, referral_token, status, approval_status, rating, region)
VALUES ('НашБизнес', 'info@nashbiz.ru', 'NASH', 'nash-ref-token-seed', 'active', 'approved', 100, 'Берск');
