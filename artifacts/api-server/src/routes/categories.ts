import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { GetCategoriesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(GetCategoriesResponse.parse(categories));
});

export default router;
