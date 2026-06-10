import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import cardsRouter from "./cards";
import alertsRouter from "./alerts";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transactionsRouter);
router.use(cardsRouter);
router.use(alertsRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
