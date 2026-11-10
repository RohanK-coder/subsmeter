import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { authenticate, getAuth } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";

export const tenantRouter = Router();

tenantRouter.use(authenticate);

// The current user's own tenant. The tenant id comes only from the JWT.
tenantRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { tenantId } = getAuth(req);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError(404, "NOT_FOUND", "Tenant not found");
    res.json({ tenant: { id: tenant.id, name: tenant.name, status: tenant.status } });
  })
);

// Members of the current tenant, owners only.
tenantRouter.get(
  "/members",
  requireRole("OWNER"),
  asyncHandler(async (req, res) => {
    const { tenantId } = getAuth(req);
    const members = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ members });
  })
);