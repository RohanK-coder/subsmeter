import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate, getAuth } from "../../middleware/authenticate";
import { getSubscription } from "./subscription.service";

export const subscriptionRouter = Router();

subscriptionRouter.use(authenticate);

// The tenant id comes only from the JWT, never from the client.
subscriptionRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { tenantId } = getAuth(req);
    res.json({ subscription: await getSubscription(tenantId) });
  })
);