INSERT INTO "Organization" (id, name, "adminId", "updatedAt") VALUES ('test-org', 'SKAI Default', 'temp', NOW()) ON CONFLICT (id) DO NOTHING;
INSERT INTO "User" (id, email, name, "passwordHash", role, plan, "orgId", "updatedAt") VALUES ('admin-id', 'admin@skai.todo', 'SKAI Admin', '$2b$10$V1SznSI2dwzdqAjkxCglc.LUVtqdTDnPQBKbgU781rDg.Up.jIKdu', 'ADMIN', 'ENTERPRISE', 'test-org', NOW()) ON CONFLICT (email) DO NOTHING;
UPDATE "Organization" SET "adminId" = 'admin-id' WHERE id = 'test-org';
INSERT INTO "User" (id, email, name, "passwordHash", role, plan, "orgId", "updatedAt") VALUES ('user-id', 'user@skai.todo', 'Test User', '$2b$10$V1SznSI2dwzdqAjkxCglc.LUVtqdTDnPQBKbgU781rDg.Up.jIKdu', 'USER', 'PRO', 'test-org', NOW()) ON CONFLICT (email) DO NOTHING;
