import { Router, Request, Response } from 'express';

export const authRouter = Router();

// POST /api/auth/login - Optional minimal sign in endpoint
authRouter.post('/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid work email is required' });
  }

  const name = email.split('@')[0];
  return res.json({
    success: true,
    user: {
      email: email.trim().toLowerCase(),
      name,
      role: 'developer',
    },
  });
});
