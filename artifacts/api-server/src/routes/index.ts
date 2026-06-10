import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import cardsRouter from "./cards";
import alertsRouter from "./alerts";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import virtualCardsRouter from "./virtual_cards";
import securityRouter from "./security";
import liveFeedRouter from "./live_feed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transactionsRouter);
router.use(cardsRouter);
router.use(alertsRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(virtualCardsRouter);
router.use(securityRouter);
router.use(liveFeedRouter);

export default router;
