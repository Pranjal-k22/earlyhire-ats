import jwt, { SignOptions } from "jsonwebtoken";
import { CookieOptions } from "express";
import { env } from "../config/env.js";
import { UserRole } from "../models/user.model.js";

export const AUTH_COOKIE_NAME = "token";

export interface AuthJwtPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Signs a JWT with the user's ID and role using server secret.
 */
export const signToken = (payload: { id: string; role: UserRole }): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
};

/**
 * Verifies a JWT and returns the decoded payload. Throws on invalid or expired token.
 */
export const verifyToken = (token: string): AuthJwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AuthJwtPayload;
};

/**
 * Returns standardized, secure cookie options for the session JWT.
 */
export const getAuthCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
  };
};
