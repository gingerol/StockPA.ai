import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/app';
import { nanoid } from 'nanoid';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Initialize Google OAuth strategy
export const initializeGoogleAuth = () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "http://localhost:8001/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { googleId: profile.id }
    });

    if (user) {
      // Update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
      return done(null, user);
    }

    // Create new user
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

    user = await prisma.user.create({
      data: {
        googleId: profile.id,
        email: profile.emails?.[0]?.value || '',
        name: profile.displayName || '',
        avatar: profile.photos?.[0]?.value || '',
        referralCode: nanoid(8).toUpperCase(),
        status: 'ACTIVE',
        trialStartDate: now,
        trialEndDate: trialEndDate,
        totalTrialDays: 7,
        hasUsedTrial: true,
        lastLogin: now,
        createdAt: now,
      }
    });

    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        eventName: 'user_registered',
        eventData: {
          provider: 'google',
          trialStartDate: now.toISOString(),
          trialEndDate: trialEndDate.toISOString(),
          referralCode: user.referralCode
        }
      }
    });

    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

// Generate JWT tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

export const googleCallback = (req: Request, res: Response) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err) {
      console.error('Google OAuth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?error=auth_failed`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?error=auth_cancelled`);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Redirect to frontend OAuth callback with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/oauth/callback?token=${accessToken}&refresh=${refreshToken}`;
    res.redirect(redirectUrl);
  })(req, res);
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 24 * 60 * 60 // 24 hours in seconds
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  // In a production app, you might want to blacklist the token
  // For now, we'll just send a success response
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};