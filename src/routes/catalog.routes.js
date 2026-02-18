import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as catalogController from '../controllers/catalog.controller.js';

const router = Router();
const uuidParam = z.object({ empresaId: z.string().uuid() });

router.get('/catalog/empresas', requireAuth, asyncHandler(catalogController.getEmpresas));
router.get(
  '/catalog/empresas/:empresaId/sucursales',
  requireAuth,
  validate({ params: uuidParam }),
  asyncHandler(catalogController.getSucursales)
);

export default router;
