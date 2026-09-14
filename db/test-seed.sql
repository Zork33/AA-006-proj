-- Тестовый суперадмин (только для тестов)
-- Использование: psql -d leads_db -f db/test-seed.sql
-- Пароль: test1234
INSERT INTO admins (name, email, role, password_hash, is_test)
VALUES ('ТестовыйАдмин', 'test@example.com', 'superadmin', '$2b$12$cNYHF6BqURK3En8TRsCCm./fEjcnNVUqKzRt67YiCKZ3piifaqKDS', true)
ON CONFLICT (email) DO NOTHING;
