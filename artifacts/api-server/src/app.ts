// @ts-nocheck
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pinoHttpImport from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { getCookieSecret } from "./lib/auth-cookie.js";

const pinoHttp = pinoHttpImport as unknown as (options: {
  logger: typeof logger;
  serializers: {
    req(req: any): { id: unknown; method: unknown; url: string | undefined };
    res(res: any): { statusCode: unknown };
  };
}) => ReturnType<typeof express.json>;

const app = express();

app.set("trust proxy", 1);
app.set("etag", false);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser(getCookieSecret()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use("/api", router);

app.use((err: any, req: any, res: any, _next: any) => {
  req.log?.error?.(
    {
      err,
      code: err?.code ?? null,
      detail: err?.detail ?? null,
      hint: err?.hint ?? null,
    },
    "Unhandled API error",
  );

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: "Internal server error",
    detail: err?.message ?? String(err),
    code: err?.code ?? null,
    hint: err?.hint ?? null,
  });
});

export default app;
