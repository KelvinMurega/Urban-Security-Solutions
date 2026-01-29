// backend/src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

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
          role: user.role
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
}