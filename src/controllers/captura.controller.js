import { ApiError, ErrorCodes } from '../utils/errors.js';
import { previewXml, commitCaptura } from '../services/captura.service.js';
import { parseSUA } from '../services/suaParser.service.js';
import { findCapturasList, findCapturaById } from '../repositories/captura.repo.js';
import { getAccessibleCapturaScope } from '../services/access.service.js';
import { getIdempotencyKey } from '../utils/idempotency.js';

export async function previewXmlHandler(req, res) {
  let tipoSUA = req.body?.tipoSUA;
  let xmlText = req.body?.xmlText;
  if (req.file && req.file.fieldname === 'xmlFile') {
    const fs = await import('fs/promises');
    xmlText = await fs.readFile(req.file.path, 'utf8').finally(() => fs.unlink(req.file.path).catch(() => {}));
    tipoSUA = tipoSUA || req.body?.tipoSUA;
  }
  if (!tipoSUA || !xmlText) {
    throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'tipoSUA and xmlText (or xmlFile) required');
  }
  const result = previewXml(tipoSUA, xmlText);
  res.json(result);
}

/**
 * Parsea un archivo .sua (texto por bloques de 295 caracteres).
 * GET: suaText en query (?suaText=...). POST: multipart 'suaFile' o body 'suaText'.
 */
export async function parseSuaHandler(req, res) {
  let suaContent = req.query?.suaText ?? req.body?.suaText;
  if (req.file && req.file.fieldname === 'suaFile') {
    const fs = await import('fs/promises');
    try {
      suaContent = await fs.readFile(req.file.path, 'latin1');
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }
  if (suaContent == null || (typeof suaContent === 'string' && !suaContent.trim())) {
    throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'suaText (query for GET, or body) or suaFile (multipart) required');
  }
  try {
    const result = parseSUA(suaContent);
    res.json(result);
  } catch (err) {
    throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, err.message || 'Invalid SUA content');
  }
}

const REQUIRED_FIELDS = ['paymentImage', 'suaFile', 'wordDoc', 'pdfDoc', 'xmlFile'];

export async function commitHandler(req, res) {
  const { empresaId, sucursalId } = req.tenant;
  const tipoSUA = req.body?.tipoSUA;
  let data = req.body?.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'data must be valid JSON');
    }
  }
  if (!tipoSUA) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'tipoSUA required');

  const files = {};
  for (const key of REQUIRED_FIELDS) {
    const field = req.files?.[key];
    const file = Array.isArray(field) ? field[0] : field;
    if (!file || !file.path) {
      throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, `Missing required file: ${key}`);
    }
    files[key] = file;
  }
  const idempotencyKey = getIdempotencyKey(req);
  const captura = await commitCaptura({
    empresaId,
    sucursalId,
    tipoSUA,
    data: data || {},
    files,
    createdBy: req.user.clerkUserId,
    idempotencyKey,
    requestId: req.id,
    req,
  });
  res.status(201).json(captura);
}

export async function recentHandler(req, res) {
  const scope = await getAccessibleCapturaScope(req.user);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const opts = {
    limit,
    offset,
    empresaId: req.query.empresaId || undefined,
    sucursalId: req.query.sucursalId || undefined,
    tipoSUA: req.query.tipoSUA || undefined,
    fromDate: req.query.fromDate || undefined,
    toDate: req.query.toDate || undefined,
    createdBy: req.query.createdBy || undefined,
    isAdmin: scope.isAdmin,
  };
  if (!scope.isAdmin && scope.allowedEmpresaIds) {
    opts.accessibleEmpresaIds = scope.allowedEmpresaIds;
    opts.accessibleSucursalIds = scope.allowedSucursalIds;
  }
  const { rows, total } = await findCapturasList(opts);
  res.json({ items: rows, total, limit, offset });
}

export async function getByIdHandler(req, res) {
  const { id } = req.params;
  const captura = await findCapturaById(id);
  if (!captura) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Captura not found');
  const scope = await getAccessibleCapturaScope(req.user);
  if (!scope.isAdmin) {
    if (!scope.allowedEmpresaIds?.includes(captura.empresaId) || !scope.allowedSucursalIds?.includes(captura.sucursalId)) {
      throw new ApiError(403, ErrorCodes.FORBIDDEN, 'No access to this captura');
    }
  }
  res.json(captura);
}
