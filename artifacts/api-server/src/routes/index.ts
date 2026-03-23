import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import buildingsRouter from "./buildings";
import categoriesRouter from "./categories";
import eventsRouter from "./events";
import clubsRouter from "./clubs";
import usersRouter from "./users";
import searchRouter from "./search";

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
