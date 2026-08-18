import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.js";
import contentRouter from "./content.js";
import usersRouter from "./users.js";
import systemRouter from "./system.js";
import referralsRouter from "./referrals.js";
import organizationsRouter from "./organizations.js";

const router = Router();

// Apply requireAdmin to all admin routes once
router.use((request, response, next) => {
  const user = requireAdmin(request, response);
  if (!user) return;
  response.locals.user = user;
  next();
});

router.use(contentRouter);
router.use(usersRouter);
router.use(systemRouter);
router.use(referralsRouter);
router.use(organizationsRouter);

export default router;
