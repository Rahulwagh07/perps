import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Token is missing in authorization header' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
    }
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({
      error: 'invalid token',
    })
  }
}
