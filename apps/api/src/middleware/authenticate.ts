import type { Request, RequestHandler } from "express";
import { AppError } from "../lib/errors";
import { verifyAccessToken, type AuthContext } from "../lib/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHENTICATED", "Missing access token");
  }

  try {
    req.auth = verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Invalid or expired access token");
  }

  next();
};

/** All tenant scoping must use the values returned here, never req.body. */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  }
  return req.auth;
}