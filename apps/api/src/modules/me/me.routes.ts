import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { authenticate, getAuth } from "../../middleware/authenticate";

export const meRouter = Router();

meRouter.use(authenticate);

meRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId, tenantId } = getAuth(req);

    // Scoped by BOTH user id and tenant id from the token.
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { tenant: true },
    });
    if (!user) throw new AppError(401, "UNAUTHENTICATED", "User no longer exists");

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, status: user.tenant.status },
    });
  })
);