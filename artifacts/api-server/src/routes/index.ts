// @ts-nocheck
import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import buildingsRouter from "./buildings.js";
import categoriesRouter from "./categories.js";
import eventsRouter from "./events.js";
import clubsRouter from "./clubs.js";
import usersRouter from "./users.js";
import searchRouter from "./search.js";
import adminRouter from "./admin.js";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(buildingsRouter);
router.use(categoriesRouter);
router.use(eventsRouter);
router.use(clubsRouter);
router.use(usersRouter);
router.use(searchRouter);
router.use(adminRouter);

export default router;
