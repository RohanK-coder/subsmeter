import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { listActivePlans } from "./plans.service";

export const plansRouter = Router();

// Public: the pricing catalog needs no login.
plansRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ plans: await listActivePlans() });
  })
);