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

app.use("/api", router);

export default app;
