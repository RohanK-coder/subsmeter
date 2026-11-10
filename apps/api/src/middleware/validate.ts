import type { RequestHandler } from "express";
import type { ZodType } from "zod";

// Parses req.body with the schema. A ZodError is turned into a 400 by the error handler.
export const validate =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };