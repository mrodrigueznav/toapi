import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { xmlPreviewLimiter } from '../middleware/rateLimit.js';
import * as capturaController from '../controllers/captura.controller.js';

const router = Router();

const storage = multer.diskStorage({
  destination: tmpdir(),
  filename: (req, file, cb) => cb(null, `tohuanti-${randomUUID()}-${(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({
  storage,
  limits: {},
});

function optionalMulterXml(req, res, next) {
  if (req.is('multipart/form-data')) return upload.single('xmlFile')(req, res, next);
  next();
}

router.post(
  '/capturas/preview-xml',
  requireAuth,
  tenantContext,
  xmlPreviewLimiter,
  optionalMulterXml,
  asyncHandler(capturaController.previewXmlHandler)
);

router.post(
  '/capturas/commit',
  requireAuth,
  tenantContext,
  upload.fields([
    { name: 'paymentImage', maxCount: 1 },
    { name: 'imagenPago', maxCount: 1 },
    { name: 'suaFile', maxCount: 1 },
    { name: 'pdfDoc', maxCount: 1 },
    { name: 'archivoPdf', maxCount: 1 },
  ]),
  asyncHandler(capturaController.commitHandler)
);

router.get('/capturas/recent', requireAuth, asyncHandler(capturaController.recentHandler));
router.get('/capturas/:id', requireAuth, asyncHandler(capturaController.getByIdHandler));

export default router;
