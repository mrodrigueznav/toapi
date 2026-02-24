/**
 * Captura two-phase flow: preview (no side effects) and commit (upload + DB).
 */
import { randomUUID } from 'crypto';
import env from '../config/env.js';
import { ApiError, ErrorCodes } from '../utils/errors.js';
import { parseSUAXml } from './xmlParser.service.js';
import { uploadFile, removeMany } from './storage.service.js';
import { createCaptura, findByIdempotencyKey } from '../repositories/captura.repo.js';
import { getTiposSUA } from '../repositories/captura.repo.js';
import { logAudit } from './audit.service.js';
import { formatYYYYMMDD } from '../utils/dates.js';
import { getStorageBucket } from '../config/supabase.js';

const BUCKET = () => getStorageBucket();
const REQUIRED_FILE_KEYS = ['paymentImage', 'suaFile', 'pdfDoc'];

export function getTiposSUAList() {
  return getTiposSUA();
}

/**
 * Phase 1: Preview. Parse XML only; no DB, no storage.
 */
export function previewXml(tipoSUA, xmlText) {
  if (!getTiposSUA().includes(tipoSUA)) {
    throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid tipoSUA');
  }
  const extracted = parseSUAXml(xmlText);
  return {
    extracted: {
      periodo: extracted.periodo,
      registroPatronal: extracted.registroPatronal,
      rfc: extracted.rfc,
      razonSocial: extracted.razonSocial,
      total: extracted.total,
      lineaCaptura: extracted.lineaCaptura,
      fechaPago: extracted.fechaPago,
      data: extracted.data,
    },
  };
}

/**
 * Build storage path: empresa/{empresaId}/sucursal/{sucursalId}/{yyyy-mm-dd}/{uuid}/{filename}
 */
function buildStoragePath(empresaId, sucursalId, dateStr, captureId, filename) {
  const safeName = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `empresa/${empresaId}/sucursal/${sucursalId}/${dateStr}/${captureId}/${safeName}`;
}

/**
 * Phase 2: Commit. Upload PDF, comprobante de pago y SUA; then create Captura. Rollback uploads on failure.
 */
export async function commitCaptura({
  empresaId,
  sucursalId,
  tipoSUA,
  data,
  files,
  createdBy,
  idempotencyKey,
  requestId,
  req,
}) {
  if (!getTiposSUA().includes(tipoSUA)) {
    throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid tipoSUA');
  }
  for (const key of REQUIRED_FILE_KEYS) {
    if (!files[key] || !files[key].path) {
      throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, `Missing required file: ${key}`);
    }
  }

  const existing = idempotencyKey
    ? await findByIdempotencyKey(createdBy, empresaId, sucursalId, idempotencyKey)
    : null;
  if (existing) return existing;

  const dateStr = formatYYYYMMDD(new Date());
  const captureId = randomUUID();
  const uploadedPaths = [];
  const fileRefs = {};

  try {
    for (const key of REQUIRED_FILE_KEYS) {
      const file = files[key];
      const path = buildStoragePath(empresaId, sucursalId, dateStr, captureId, file.originalname);
      await uploadFile({
        path,
        filePath: file.path,
        contentType: file.mimetype || 'application/octet-stream',
      });
      uploadedPaths.push(path);
      fileRefs[key] = {
        path,
        originalName: file.originalname || key,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size ?? 0,
      };
    }
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await removeMany({ paths: uploadedPaths }).catch(() => {});
    }
    throw new ApiError(502, ErrorCodes.STORAGE_UPLOAD_FAILED, 'Upload failed', err?.message);
  }

  const captura = await createCaptura({
    empresaId,
    sucursalId,
    tipoSUA,
    status: 'CONFIRMED',
    data: typeof data === 'object' ? data : {},
    fileRefs,
    createdBy,
    idempotencyKey: idempotencyKey || null,
  });

  await logAudit({
    actorClerkUserId: createdBy,
    action: 'CAPTURA_COMMIT',
    entityType: 'Captura',
    entityId: captura.id,
    empresaId,
    sucursalId,
    metadata: { tipoSUA, idempotencyKey: idempotencyKey || undefined },
    requestId,
    ip: req?.ip,
    userAgent: req?.get?.('user-agent'),
  });

  return captura;
}

const BATCH_TIPOS = ['IMSS', 'RCV', 'INFONAVIT'];

/**
 * Batch commit: upload 3 files once, create 3 capturas (IMSS, RCV, INFONAVIT) with payload.imss, payload.rcv, payload.infonavit.
 * Same fileRefs for all three. Idempotency per tipo: {key}-IMSS, {key}-RCV, {key}-INFONAVIT.
 */
export async function commitCapturaBatch({
  empresaId,
  sucursalId,
  payload,
  files,
  createdBy,
  idempotencyKey,
  requestId,
  req,
}) {
  for (const key of REQUIRED_FILE_KEYS) {
    if (!files[key] || !files[key].path) {
      throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, `Missing required file: ${key}`);
    }
  }
  const hasAll =
    payload &&
    typeof payload === 'object' &&
    BATCH_TIPOS.every((t) => payload[t.toLowerCase()] !== undefined);
  if (!hasAll) {
    throw new ApiError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Batch requires payload with imss, rcv and infonavit'
    );
  }

  const baseKey = idempotencyKey?.trim() || null;
  const results = [];
  const dateStr = formatYYYYMMDD(new Date());
  const batchId = randomUUID();
  const uploadedPaths = [];
  let fileRefs = null;

  try {
    for (const tipoSUA of BATCH_TIPOS) {
      const keyForTipo = baseKey ? `${baseKey}-${tipoSUA}` : null;
      const existing = keyForTipo
        ? await findByIdempotencyKey(createdBy, empresaId, sucursalId, keyForTipo)
        : null;
      if (existing) {
        results.push(existing);
        continue;
      }

      if (!fileRefs) {
        const captureId = batchId;
        fileRefs = {};
        for (const key of REQUIRED_FILE_KEYS) {
          const file = files[key];
          const path = buildStoragePath(empresaId, sucursalId, dateStr, captureId, file.originalname);
          await uploadFile({
            path,
            filePath: file.path,
            contentType: file.mimetype || 'application/octet-stream',
          });
          uploadedPaths.push(path);
          fileRefs[key] = {
            path,
            originalName: file.originalname || key,
            mimeType: file.mimetype || 'application/octet-stream',
            size: file.size ?? 0,
          };
        }
      }

      const dataKey = tipoSUA.toLowerCase();
      const data = typeof payload[dataKey] === 'object' ? payload[dataKey] : {};
      const captura = await createCaptura({
        empresaId,
        sucursalId,
        tipoSUA,
        status: 'CONFIRMED',
        data,
        fileRefs,
        createdBy,
        idempotencyKey: keyForTipo,
      });
      results.push(captura);
      await logAudit({
        actorClerkUserId: createdBy,
        action: 'CAPTURA_COMMIT',
        entityType: 'Captura',
        entityId: captura.id,
        empresaId,
        sucursalId,
        metadata: { tipoSUA, batch: true, idempotencyKey: keyForTipo || undefined },
        requestId,
        ip: req?.ip,
        userAgent: req?.get?.('user-agent'),
      });
    }
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await removeMany({ paths: uploadedPaths }).catch(() => {});
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, ErrorCodes.STORAGE_UPLOAD_FAILED, 'Batch upload failed', err?.message);
  }

  return results;
}

export default { previewXml, commitCaptura, commitCapturaBatch, getTiposSUAList };
