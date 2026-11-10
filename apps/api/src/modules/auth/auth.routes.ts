import { Router } from "express";
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from "../../lib/cookies";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../lib/asyncHandler";
import { validate } from "../../middleware/validate";
import { loginSchema, signupSchema } from "./auth.schemas";
import * as authService from "./auth.service";

export const authRouter = Router();

authRouter.post(
  "/signup",
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken, ...body } = await authService.signup(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json(body);
  })
);

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken, ...body } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json(body);
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    try {
      const { refreshToken, ...body } = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
      setRefreshCookie(res, refreshToken);
      res.json(body);
    } catch (err) {
      if (err instanceof AppError) clearRefreshCookie(res);
      throw err;
    }
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    clearRefreshCookie(res);
    res.status(204).end();
  })
);