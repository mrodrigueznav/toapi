import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { xmlPreviewLimiter } from '../middleware/rateLimit.js';
import * as capturaController from '../controllers/captura.controller.js';

const router = Router();

const storage = multer.diskStorage({
  destination: tmpdir(),
  filename: (req, file, cb) =>
    cb(null, `tohuanti-${randomUUID()}-${(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({ storage, limits: {} });

function optionalMulterSua(req, res, next) {
  if (req.is('multipart/form-data')) return upload.single('suaFile')(req, res, next);
  next();
}

router.get(
  '/preview/parse-sua',
  requireAuth,
  xmlPreviewLimiter,
  asyncHandler(capturaController.parseSuaHandler)
);

router.post(
  '/preview/parse-sua',
  requireAuth,
  xmlPreviewLimiter,
  optionalMulterSua,
  asyncHandler(capturaController.parseSuaHandler)
);

export default router;
