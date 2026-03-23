import { Router, type IRouter } from "express";
import { db, buildingsTable } from "@workspace/db";
import { GetBuildingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/buildings", async (_req, res): Promise<void> => {
  const buildings = await db.select().from(buildingsTable).orderBy(buildingsTable.name);
  res.json(GetBuildingsResponse.parse(buildings));
});

export default router;
