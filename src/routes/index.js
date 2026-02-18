import { Router } from 'express';
import healthRoutes from './health.routes.js';
import meRoutes from './me.routes.js';
import catalogRoutes from './catalog.routes.js';
import previewRoutes from './preview.routes.js';
import capturasRoutes from './capturas.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(meRoutes);
router.use(catalogRoutes);
router.use(previewRoutes);
router.use(capturasRoutes);
router.use(adminRoutes);

export default router;
