import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as meController from '../controllers/me.controller.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(meController.me));

export default router;
