// backend/src/modules/auth/auth.controller.ts
import { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { AUTH_COOKIE_NAME } from '../../middleware/auth.middleware';
import { AuthService } from './auth.service';
import { sendError } from '../../shared/http-error';
import { recordAudit } from '../../shared/audit';
import { emailSchema, passwordSchema } from '../../shared/password';

const loginSchema = z.object({
  email: z.string().trim().max(191),
  // Not trimmed: spaces are legitimate password characters.
  password: z.string().min(1).max(200),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().min(7).max(30).optional(),
});

const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(7).max(30).optional(),
    currentPassword: z.string().max(200).optional(),
    password: passwordSchema.optional(),
    avatarUrl: z.string().nullable().optional(),
  });
// (unknown keys are stripped by zod, so fields like role/status can never be self-assigned)

const parseDurationMs = (value: string) => {
  const amount = Number.parseInt(value, 10);
  const unit = value.slice(-1);
  const multiplier = unit === 's' ? 1_000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return amount * multiplier;
};

const authCookieOptions = (): CookieOptions => ({
  httpOnly: true, // not readable from JavaScript, so XSS cannot steal the session
  secure: env.isProduction, // HTTPS-only outside local development
  sameSite: 'lax',
  domain: env.COOKIE_DOMAIN || undefined,
  path: '/',
  maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
});

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });

      const result = await AuthService.login(parsed.data.email, parsed.data.password, req.ip);
      if (!result.ok) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });

      const { tokenVersion, ...user } = result.user;
      res.cookie(AUTH_COOKIE_NAME, AuthService.generateToken({ id: user.id, role: user.role, tokenVersion }), authCookieOptions());
      await recordAudit(req, { action: 'auth.login', entityType: 'auth', entityId: user.id, actorId: user.id });
      // The token is deliberately NOT returned in the body: it lives only in the httpOnly cookie.
      res.json({ user });
    } catch (error) {
      sendError(res, error);
    }
  }

  static async logout(req: Request, res: Response) {
    await AuthService.revokeSessionsFromToken((req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAME]);
    const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
    res.status(200).json({ success: true });
  }

  static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

      const user = await AuthService.registerFirstAdmin(parsed.data, req.ip);
      const { tokenVersion, ...publicUser } = user;
      res.cookie(AUTH_COOKIE_NAME, AuthService.generateToken({ id: user.id, role: user.role, tokenVersion }), authCookieOptions());
      res.status(201).json({ user: publicUser });
    } catch (error) {
      sendError(res, error);
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const profile = await AuthService.getProfile(req.user!.id);
      if (!profile) return res.status(404).json({ error: 'User not found' });
      res.json(profile);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async updateMe(req: Request, res: Response) {
    try {
      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
      if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: 'No update fields provided.' });

      const { profile, passwordChanged } = await AuthService.updateProfile(req.user!.id, parsed.data);
      const { tokenVersion, ...publicProfile } = profile;

      // Password change revoked all sessions; re-issue a fresh cookie for this one.
      if (passwordChanged) {
        await recordAudit(req, { action: 'auth.password_change', entityType: 'auth', entityId: profile.id });
        res.cookie(
          AUTH_COOKIE_NAME,
          AuthService.generateToken({ id: profile.id, role: profile.role, tokenVersion }),
          authCookieOptions()
        );
      }
      res.json(publicProfile);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async guardsLite(_req: Request, res: Response) {
    try {
      res.json(await AuthService.getGuardDirectory());
    } catch (error) {
      sendError(res, error);
    }
  }
}
