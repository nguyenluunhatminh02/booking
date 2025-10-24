// common/interfaces/user.interface.ts

/**
 * Authenticated user interface
 */
export interface AuthUser {
  id: string;
  sessionId?: number;
  hash?: string;
  email?: string;
  role?: string;
}

/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role?: string;
  sessionId?: number;
  iat?: number;
  exp?: number;
}

/**
 * Request with user interface
 */
export interface RequestWithUser extends Request {
  user: AuthUser;
}
