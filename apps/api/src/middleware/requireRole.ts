import type { RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { AppError } from "../lib/errors";
import { getAuth } from "./authenticate";

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    const { role } = getAuth(req);
    if (!roles.includes(role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
    }
    next();
  };