import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import buildingsRouter from "./buildings.js";
import categoriesRouter from "./categories.js";
import eventsRouter from "./events.js";
import clubsRouter from "./clubs.js";
import usersRouter from "./users.js";
import searchRouter from "./search.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(buildingsRouter);
router.use(categoriesRouter);
router.use(eventsRouter);
router.use(clubsRouter);
router.use(usersRouter);
router.use(searchRouter);

export default router;
