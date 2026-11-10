-- Session revocation + brute-force lockout tracking
ALTER TABLE `User`
  ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lockedUntil` DATETIME(3) NULL,
  ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
  ADD COLUMN `passwordChangedAt` DATETIME(3) NULL;

-- Emails are now always stored lower-case so login is a single indexed lookup.
UPDATE `User` SET `email` = LOWER(TRIM(`email`));

-- Accounts soft-deleted via isActive=false are treated as INACTIVE everywhere.
UPDATE `User` SET `status` = 'INACTIVE' WHERE `isActive` = false;

-- Only managed upload paths (or legacy inline images) are valid avatars; drop external URLs.
UPDATE `User` SET `avatarUrl` = NULL
  WHERE `avatarUrl` IS NOT NULL
    AND `avatarUrl` NOT LIKE '/uploads/avatars/%'
    AND `avatarUrl` NOT LIKE 'data:image/%';
