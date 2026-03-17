// backend/src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  password: z.string().min(6).optional(),
  avatarUrl: z.string().optional(),
});

export class AuthController {
  
  // LOGIN METHOD
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      // 1. Verify User credentials
      const user = await AuthService.validateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // 2. GENERATE TOKEN (This was likely missing or failing)
      const token = AuthService.generateToken(user);

      // 3. Send BOTH user and token
      res.json({ 
        token, 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: (user as { avatarUrl?: string | null }).avatarUrl || null
        } 
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // REGISTER METHOD (Optional, for creating the first admin)
  static async register(req: Request, res: Response) {
    try {
      const user = await AuthService.register(req.body);
      const token = AuthService.generateToken(user);
      res.status(201).json({ token, user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profile = await AuthService.getProfile(actor.id);
      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateMe(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string } | undefined;
      if (!actor) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const payload = parsed.data;
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'No update fields provided.' });
      }

      const profile = await AuthService.updateProfile(actor.id, payload);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async guardsLite(req: Request, res: Response) {
    try {
      const guards = await AuthService.getGuardDirectory();
      res.json(guards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
