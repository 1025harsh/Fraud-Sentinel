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
import fraudCasesRouter from "./fraud_cases";
import notificationsRouter from "./notifications_route";
import auditRouter from "./audit_route";

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
router.use(fraudCasesRouter);
router.use(notificationsRouter);
router.use(auditRouter);

export default router;
