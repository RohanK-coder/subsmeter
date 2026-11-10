import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { meRouter } from "./modules/me/me.routes";
import { tenantRouter } from "./modules/tenants/tenant.routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger }));

  // NOTE: the Stripe webhook route (Stage 6) must be registered BEFORE express.json(),
  // because it needs the raw request body.
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "up", timestamp: new Date().toISOString() });
    } catch {
      res
        .status(503)
        .json({ status: "degraded", database: "down", timestamp: new Date().toISOString() });
    }
  });

  app.use("/auth", authRouter);
  app.use("/me", meRouter);
  app.use("/tenant", tenantRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}