import { Router } from 'express';
import { health, metrics } from '../controllers/health.controller.js';

const router = Router();

router.get('/health', health);
router.get('/metrics', metrics);

export default router;
