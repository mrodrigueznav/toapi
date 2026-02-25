/**
 * SUA-only parser: IMSS + RCV + INFONAVIT
 * - Record length 295
 * - Uses record 06 as anchor to align record 05 numeric block
 * - Returns output separated by form: { imss, rcv, infonavit }
 */

const RECORD_LEN = 295;

function trim(v) { return (v ?? '').toString().trim(); }
function sliceTrim(s, a, b) { return trim(s.slice(a, b)); }

function toLatin1String(input) {
  if (!input) return '';
  return Buffer.isBuffer(input) ? input.toString('latin1') : input.toString();
}

function splitFixed(content, len) {
  const out = [];
  for (let i = 0; i < content.length; i += len) out.push(content.slice(i, i + len));
  return out;
}

function field(value, source) {
  const v = value == null || String(value).trim() === '' ? '' : value;
  const s = source == null || String(source).trim() === '' ? '' : source;
  return { value: v, source: s };
}
function nfield(num, source) {
  if (num == null || Number.isNaN(Number(num))) return field('', '');
  return field(Number(num), source);
}
function normalizeTipoPago(tipoPago) {
  const t = String(tipoPago || '').trim().toUpperCase();
  if (!t) return '';
  if (t === 'W300') return 'PAGO OPORTUNO';
  return t;
}
function toPeriodoYYYYMM(periodoRaw) {
  if (!/^\d{6}$/.test(periodoRaw)) return '';
  return `${periodoRaw.slice(0, 4)}-${periodoRaw.slice(4, 6)}`;
}
function deriveAnioMes(periodoYYYYMM) {
  const m = String(periodoYYYYMM || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return { anio: '', mes: '' };
  return { anio: m[1], mes: m[2] };
}
function deriveBimestre(mesStr) {
  const m = Number(mesStr);
  if (!Number.isFinite(m) || m < 1 || m > 12) return '';
  return String(Math.ceil(m / 2)).padStart(2, '0');
}

function parseRecord06(r06) {
  const out = {
    tipoPago: '',
    fechaAplicacion: '',
    totalsRaw: [], // 12-digit blocks (raw int)
  };
  if (!r06) return out;

  out.tipoPago = sliceTrim(r06, 68, 72);

  const yyyymmdd = r06.slice(58, 66);
  if (/^\d{8}$/.test(yyyymmdd)) {
    out.fechaAplicacion = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }

  const nums = [];
  for (let i = 72; i + 12 <= r06.length; i += 12) {
    const part = r06.slice(i, i + 12);
    if (!/^\d{12}$/.test(part)) break;
    nums.push(parseInt(part, 10));
  }
  out.totalsRaw = nums;
  return out;
}

/**
 * Extract 9-digit chunks from record05 body (r05.slice(38).trimRight()) using an offset 0..8.
 * We choose the offset that makes some chunk == totalIMSS_raw (from record06 first 12-digit block).
 */
function extractAlignedChunksRecord05(r05Body, totalIMSS_raw) {
  for (let offset = 0; offset < 9; offset++) {
    const seq = r05Body.slice(offset);
    const chunks = [];
    for (let i = 0; i + 9 <= seq.length; i += 9) {
      const part = seq.slice(i, i + 9);
      if (!/^\d{9}$/.test(part)) break;
      chunks.push(part);
    }
    const idx = chunks.indexOf(String(totalIMSS_raw).padStart(9, '0'));
    if (idx !== -1) {
      return { offset, chunks, idxSubtotal: idx };
    }
  }
  return { offset: null, chunks: [], idxSubtotal: -1 };
}

/**
 * Main SUA parse
 */
export function parseSUAForAllForms(suaTextOrBuffer) {
  const content = toLatin1String(suaTextOrBuffer);
  if (!content || content.length % RECORD_LEN !== 0) {
    throw new Error(`Invalid SUA length=${content.length} (must be multiple of ${RECORD_LEN})`);
  }

  const records = splitFixed(content, RECORD_LEN);
  const byType = {};
  const counts = {};
  for (const r of records) {
    const t = r.slice(0, 2);
    counts[t] = (counts[t] || 0) + 1;
    (byType[t] ||= []).push(r);
  }

  const r02 = (byType['02'] || [])[0] || '';
  const r05 = (byType['05'] || [])[0] || '';
  const r06 = (byType['06'] || [])[0] || '';

  // Record 02 (header)
  const registroPatronal = r02 ? sliceTrim(r02, 2, 13) : '';
  const rfc = r02 ? sliceTrim(r02, 14, 26) : '';
  const periodoRaw = r02 ? sliceTrim(r02, 26, 32) : '';
  const folioSUA = r02 ? sliceTrim(r02, 32, 38) : '';
  const razonSocial = r02 ? sliceTrim(r02, 38, 88) : '';
  const periodo = toPeriodoYYYYMM(periodoRaw);

  // Record 06 totals
  const r06p = parseRecord06(r06);
  const totalIMSS_raw = r06p.totalsRaw[0] ?? 0;   // cents
  const totalAFORE_raw = r06p.totalsRaw[1] ?? 0;  // cents
  const totalVIV_raw = r06p.totalsRaw[2] ?? 0;    // cents
  const totalACV_raw = r06p.totalsRaw[3] ?? 0;    // cents

  const totalIMSS = totalIMSS_raw / 100;
  const totalAFORE = totalAFORE_raw / 100;
  const totalVIV = totalVIV_raw / 100;
  const totalACV = totalACV_raw / 100;
  const totalINFONAVIT = (totalVIV_raw + totalACV_raw) / 100;
  const totalAPagar = +(totalIMSS + totalAFORE + totalINFONAVIT).toFixed(2);

  // Record 05 aligned chunks
  const r05Body = r05 ? r05.slice(38).replace(/\s+$/g, '') : '';
  const aligned = extractAlignedChunksRecord05(r05Body, totalIMSS_raw);
  const chunks = aligned.chunks; // array of 9-digit strings
  const idxSubtotal = aligned.idxSubtotal;

  // helper read money from chunk as /10000 (conceptos IMSS) or /100 (cents)
  const money4 = (idx) => (chunks[idx] ? parseInt(chunks[idx], 10) / 10000 : null);
  const money2 = (idx) => (chunks[idx] ? parseInt(chunks[idx], 10) / 100 : null);

  // Derivados
  const { anio, mes } = deriveAnioMes(periodo);
  const bimestre = deriveBimestre(mes);
  const trabajadoresCount = counts['03'] || 0;

  const source02 = 'SUA (record 02)';
  const source05 = 'SUA (record 05)';
  const source06 = 'SUA (record 06)';

  const empresa = field(razonSocial, source02);
  const tipoPagoLabel = normalizeTipoPago(r06p.tipoPago);
  const tipoPago = field(tipoPagoLabel || '', tipoPagoLabel ? source06 : '');
  const fechaPago = field(r06p.fechaAplicacion || '', r06p.fechaAplicacion ? source06 : '');

  // -------------------------
  // IMSS (según layout detectado en TU archivo)
  // Layout observado:
  // idxSubtotal=9
  // idx 2..8: 7 conceptos /10000
  // idx 9: subtotal /100
  // idx 10..11: act/rec /100
  // -------------------------
  const imss = {
    datosEmpresa: {
      empresa,
      sucursal: field('', ''),
      tipoPago,
      folioSUA: field(folioSUA, source02),
      diaExpRiesgo: field('', ''),
    },
    datosPago: {
      fechaPago,
      banco: field('', ''),
      noTrabajadores: field(trabajadoresCount, 'SUA (conteo records 03)'),
      diasCotizados: field('', ''),
      primaRiesgPag: field('', ''),
      primaRiesgCOP: field('', ''),
      smgPago: field('', ''),
      anioPago: field(anio, anio ? 'DERIVABLE (periodo SUA)' : ''),
      mesPago: field(mes, mes ? 'DERIVABLE (periodo SUA)' : ''),
    },
    conceptosPago: {
      // Estos 7 sí existen en tu SUA con este layout
      cuotaFija: nfield(money4(2), source05),

      exec3SalMinPat: nfield(money4(3), source05),
      exec3SalMinObr: nfield(money4(4), source05),

      presDinPat: nfield(money4(5), source05),
      presDinObr: nfield(money4(6), source05),

      gastosMedPat: nfield(money4(7), source05),
      gastosMedObr: nfield(money4(8), source05),

      // En TU archivo no aparecen campos separados antes del subtotal:
      riesgosTrabajo: field('', ''),
      invalidezVidaObr: field('', ''),
      guarderias: field('', ''),

      baseTotal: nfield(money2(idxSubtotal), source05),
    },
    actRec: {
      actualizacion: nfield(money2(idxSubtotal + 1), source05),
      recargos: nfield(money2(idxSubtotal + 2), source05),
      importeTotal: nfield(totalIMSS, source06),
    },
  };

  // -------------------------
  // RCV (SUA-only, lo máximo posible)
  // En TU archivo encontramos 2 partes que suman totalAFORE:
  // chunks[12] + chunks[13] == totalAFORE_raw
  // -------------------------
  let retiro = null;
  let cesantiaTotal = null;
  if (chunks[12] && chunks[13]) {
    const a = parseInt(chunks[12], 10);
    const b = parseInt(chunks[13], 10);
    if ((a + b) === totalAFORE_raw) {
      retiro = a / 100;
      cesantiaTotal = b / 100;
    }
  }

  const rcv = {
    datosEmpresa: {
      empresa,
      sucursal: field('', ''),
      tipoPago,
      folioSUA: field(folioSUA, source02),
    },
    datosPago: {
      fechaPago,
      banco: field('', ''),
      noTrabajadores: field(trabajadoresCount, 'SUA (conteo records 03)'),
      anioPago: field(anio, anio ? 'DERIVABLE (periodo SUA)' : ''),
      bimestrePago: field(bimestre, bimestre ? 'DERIVABLE (mes de pago)' : ''),
    },
    conceptosPago: {
      retiro: retiro != null ? nfield(retiro, source05) : field('', ''),
      // Con SUA-only en TU layout solo hay “cesantía total”, no Pat/Obr separado:
      cesantiaVejezPat: field('', ''),
      cesantiaVejezObr: field('', ''),
      cesantiaVejezTotal: cesantiaTotal != null ? nfield(cesantiaTotal, source05) : field('', ''),
    },
    actRec: {
      actualizacion: field('', ''),
      recargos: field('', ''),
      importeTotal: nfield(totalAFORE, source06),
    },
  };

  // -------------------------
  // INFONAVIT (SUA-only)
  // record 06 trae VIV y ACV; no trae con/sin crédito en este layout.
  // -------------------------
  const infonavit = {
    datosEmpresa: {
      empresa,
      sucursal: field('', ''),
      tipoPago,
      folioSUA: field(folioSUA, source02),
    },
    datosPago: {
      fechaPago,
      banco: field('', ''),
      noTrabajadores: field(trabajadoresCount, 'SUA (conteo records 03)'),
      anioPago: field(anio, anio ? 'DERIVABLE (periodo SUA)' : ''),
      bimestrePago: field(bimestre, bimestre ? 'DERIVABLE (mes de pago)' : ''),
      noTrabAcred: field('', ''),
    },
    conceptosPago: {
      aportSinCred: field('', ''),
      aportConCred: field('', ''),
      amortizacion: nfield(totalACV, source06), // lo más cercano: ACV
      subTotal: nfield(totalINFONAVIT, source06),
      totalVIV: nfield(totalVIV, source06), // extra útil para debug/UI futura
    },
    actRec: {
      actualizacion: field('', ''),
      recargos: field('', ''),
      importeTotal: nfield(totalINFONAVIT, source06),
    },
  };

  return {
    meta: {
      recordsCountByType: counts,
      alignment: {
        record05Offset: aligned.offset,
        record05ChunksCount: chunks.length,
        record05IdxSubtotal: idxSubtotal,
      },
      header: {
        registroPatronal: field(registroPatronal, source02),
        rfc: field(rfc, source02),
        periodo: field(periodo, source02),
      },
      totals: {
        totalIMSS: nfield(totalIMSS, source06),
        totalAFORE: nfield(totalAFORE, source06),
        totalINFONAVIT: nfield(totalINFONAVIT, source06),
        totalAPagar: nfield(totalAPagar, 'DERIVABLE (totales SUA)'),
      },
      // Para que no vuelvas a “adivinar”: lista completa de chunks
      record05Debug: chunks.map((raw, idx) => ({
        idx,
        raw,
        asMoney4: parseInt(raw, 10) / 10000,
        asMoney2: parseInt(raw, 10) / 100,
      })),
    },
    imss,
    rcv,
    infonavit,
  };
}

export default { parseSUAForAllForms };