import type { Request, Response } from 'express'
import { loginSchema, signupSchema } from '../schema/auth-schema'
import { prisma } from '@repo/db'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function SignUp(req: Request, res: Response) {
  const result = signupSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json({
      error: result.error.issues,
    })
  }

  try {
    const { username, password } = result.data
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username: username,
        password: hashedPassword,
      },
    })
    if (user) {
      return res.status(201).json({
        message: 'signup successful',
        userId: user.id,
      })
    }
  } catch (error) {
    console.log('Signup error', error)
    return res.status(500).json({
      message: 'internal server error',
    })
  }
}

export async function SignIn(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({
      error: result.error.issues,
    })
  }

  try {
    const { username, password } = result.data

    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
    })

    if (!user) {
      return res.status(401).json({
        message: 'invalid credentials',
      })
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password)
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: 'invalid password',
      })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '12hr',
    })

    return res.status(200).json({
      token,
    })
  } catch (error) {
    console.log('Signin error', error)
    return res.status(500).json({
      message: 'internal server error',
    })
  }
}
