import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();
const uuid = z.string().uuid();

router.use(requireAuth, requireAdmin, adminLimiter);

router.post(
  '/admin/empresas',
  validate({ body: z.object({ nombre: z.string().min(1) }) }),
  asyncHandler(adminController.createEmpresa)
);
router.put(
  '/admin/empresas/:id',
  validate({ params: z.object({ id: uuid }), body: z.object({ nombre: z.string().min(1) }) }),
  asyncHandler(adminController.updateEmpresa)
);
router.put(
  '/admin/empresas/:id/activate',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.activateEmpresa)
);
router.put(
  '/admin/empresas/:id/deactivate',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.deactivateEmpresa)
);

router.post(
  '/admin/empresas/:empresaId/sucursales',
  validate({
    params: z.object({ empresaId: uuid }),
    body: z.object({ nombre: z.string().min(1) }),
  }),
  asyncHandler(adminController.createSucursal)
);
router.put(
  '/admin/sucursales/:id',
  validate({
    params: z.object({ id: uuid }),
    body: z.object({ nombre: z.string().min(1) }),
  }),
  asyncHandler(adminController.updateSucursal)
);
router.put(
  '/admin/sucursales/:id/activate',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.activateSucursal)
);
router.put(
  '/admin/sucursales/:id/deactivate',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.deactivateSucursal)
);

router.post(
  '/admin/users',
  validate({
    body: z
      .object({
        username: z.string().min(1).optional(),
        password: z.string().min(8).optional(),
        email: z.string().email().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        clerkUserId: z.string().min(1).optional(),
        isAdmin: z.boolean().optional(),
      })
      .refine((data) => data.username ?? data.clerkUserId, {
        message: 'username or clerkUserId is required',
      }),
  }),
  asyncHandler(adminController.createUser)
);
router.get('/admin/users', asyncHandler(adminController.listUsers));
router.get(
  '/admin/users/:id',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.getUserById)
);
router.put(
  '/admin/users/:id/activate',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.activateUser)
);
router.put(
  '/admin/users/:id/deactivate',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.deactivateUser)
);
router.put(
  '/admin/users/:id/grant-admin',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.grantAdmin)
);
router.put(
  '/admin/users/:id/revoke-admin',
  validate({ params: z.object({ id: uuid }) }),
  asyncHandler(adminController.revokeAdmin)
);
router.post(
  '/admin/users/:id/empresas/:empresaId',
  validate({ params: z.object({ id: uuid, empresaId: uuid }) }),
  asyncHandler(adminController.addUserEmpresa)
);
router.delete(
  '/admin/users/:id/empresas/:empresaId',
  validate({ params: z.object({ id: uuid, empresaId: uuid }) }),
  asyncHandler(adminController.removeUserEmpresa)
);
router.post(
  '/admin/users/:id/sucursales/:sucursalId',
  validate({ params: z.object({ id: uuid, sucursalId: uuid }) }),
  asyncHandler(adminController.addUserSucursal)
);
router.delete(
  '/admin/users/:id/sucursales/:sucursalId',
  validate({ params: z.object({ id: uuid, sucursalId: uuid }) }),
  asyncHandler(adminController.removeUserSucursal)
);

router.get('/admin/audit', asyncHandler(adminController.listAudit));

export default router;
