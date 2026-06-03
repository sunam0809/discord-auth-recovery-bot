import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import homeRouter from "./home.js";

const router: IRouter = Router();

router.use(homeRouter);
router.use(healthRouter);
router.use(authRouter);

export default router;
