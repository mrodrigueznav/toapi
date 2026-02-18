/**
 * SUA (.SUA) parsing and normalization
 * - Fixed-length records (295 chars) concatenated (no newlines)
 * - Record type is first 2 chars: 02/03/04/05/06...
 *
 * Extracts:
 * - periodo (YYYY-MM), registroPatronal, rfc, razonSocial, folioSUA
 * - tipoPago + fechaAplicacion (best-effort from record 06)
 * - IMSS concepts (from record 05, validated against common “A10 resumen” layout)
 * - Totals IMSS/AFORE + INFONAVIT and TOTAL (from record 06)
 */

const RECORD_LEN = 295;

function str(input) {
  return (input ?? '').toString();
}

function trim(v) {
  return (v ?? '').toString().trim();
}

function sliceTrim(s, start, end) {
  return trim(s.slice(start, end));
}

function moneyFromInt(n, decimals) {
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
}

function toPeriodoYYYYMM(periodoRaw) {
  if (!/^\d{6}$/.test(periodoRaw)) return '';
  return `${periodoRaw.slice(0, 4)}-${periodoRaw.slice(4, 6)}`;
}

function splitFixedRecords(content, len = RECORD_LEN) {
  const out = [];
  for (let i = 0; i < content.length; i += len) {
    out.push(content.slice(i, i + len));
  }
  return out;
}

/**
 * Record 05 IMSS breakdown
 *
 * This parser expects, in order, 10 fields of 9 digits starting near the right side:
 * 1 cuotaFija                       /10000
 * 2 excedente                       /10000
 * 3 prestacionesDinero              /10000
 * 4 gastosMedicosPensionados        /10000
 * 5 riesgosTrabajo                  /10000
 * 6 invalidezVida                   /10000
 * 7 guarderiasPrestSoc              /10000
 * 8 subtotalIMSS                    /100
 * 9 actualizacionIMSS               /100
 * 10 recargosIMSS                   /100
 *
 * If it can’t confidently parse, returns zeros (tolerant).
 */
function parseRecord05IMSS(r05) {
  const zero = {
    cuotaFija: 0,
    excedente: 0,
    prestacionesDinero: 0,
    gastosMedicosPensionados: 0,
    riesgosTrabajo: 0,
    invalidezVida: 0,
    guarderiasPrestSoc: 0,
    subtotalIMSS: 0,
    actualizacionIMSS: 0,
    recargosIMSS: 0,
  };

  if (!r05) return zero;

  // In many SUA files, numeric block begins after pos 38, aligned to the right.
  const body = r05.slice(38).replace(/\s+$/g, '');
  const firstNonZero = body.search(/[1-9]/);
  const start = firstNonZero >= 0 ? firstNonZero : 0;
  const seq = body.slice(start);

  // Read 10 x 9-digit numeric fields
  const fields = [];
  for (let i = 0; i < 10; i++) {
    const part = seq.slice(i * 9, i * 9 + 9);
    if (!/^\d{9}$/.test(part)) return zero;
    fields.push(parseInt(part, 10));
  }

  const [
    cuotaFijaRaw,
    excedenteRaw,
    prestDinRaw,
    gmpRaw,
    rtRaw,
    ivRaw,
    guardRaw,
    subtotalRaw,
    actRaw,
    recRaw,
  ] = fields;

  return {
    cuotaFija: moneyFromInt(cuotaFijaRaw, 4),
    excedente: moneyFromInt(excedenteRaw, 4),
    prestacionesDinero: moneyFromInt(prestDinRaw, 4),
    gastosMedicosPensionados: moneyFromInt(gmpRaw, 4),
    riesgosTrabajo: moneyFromInt(rtRaw, 4),
    invalidezVida: moneyFromInt(ivRaw, 4),
    guarderiasPrestSoc: moneyFromInt(guardRaw, 4),
    subtotalIMSS: moneyFromInt(subtotalRaw, 2),
    actualizacionIMSS: moneyFromInt(actRaw, 2),
    recargosIMSS: moneyFromInt(recRaw, 2),
  };
}

/**
 * Record 06 parsing:
 * - tipoPago: slice(68,72) (example: "W300")
 * - fechaAplicacion: YYYYMMDD at slice(58,66) -> YYYY-MM-DD
 * - totals: sequence of 12-digit numbers from pos 72, scaled /100
 *   We use first 4:
 *     1 totalIMSS
 *     2 totalAFORE
 *     3 totalVIV
 *     4 totalACV
 *   totalINFONAVIT = totalVIV + totalACV
 */
function parseRecord06(r06) {
  const out = {
    tipoPago: '',
    fechaAplicacion: '',
    totalIMSS: 0,
    totalAFORE: 0,
    totalVIV: 0,
    totalACV: 0,
  };
  if (!r06) return out;

  out.tipoPago = sliceTrim(r06, 68, 72);

  const maybeYYYYMMDD = r06.slice(58, 66);
  if (/^\d{8}$/.test(maybeYYYYMMDD)) {
    const yyyy = maybeYYYYMMDD.slice(0, 4);
    const mm = maybeYYYYMMDD.slice(4, 6);
    const dd = maybeYYYYMMDD.slice(6, 8);
    out.fechaAplicacion = `${yyyy}-${mm}-${dd}`;
  }

  const nums = [];
  for (let i = 72; i + 12 <= r06.length; i += 12) {
    const part = r06.slice(i, i + 12);
    if (!/^\d{12}$/.test(part)) break;
    nums.push(parseInt(part, 10));
  }

  if (nums.length >= 1) out.totalIMSS = moneyFromInt(nums[0], 2);
  if (nums.length >= 2) out.totalAFORE = moneyFromInt(nums[1], 2);
  if (nums.length >= 3) out.totalVIV = moneyFromInt(nums[2], 2);
  if (nums.length >= 4) out.totalACV = moneyFromInt(nums[3], 2);

  return out;
}

/**
 * Parse SUA and return normalized fields + debug counts.
 * IMPORTANT:
 * - When reading file from disk use latin1:
 *   fs.readFileSync(path, 'latin1')
 */
export function parseSUA(suaTextOrBuffer) {
  if (!suaTextOrBuffer) {
    return {
      periodo: '',
      registroPatronal: '',
      rfc: '',
      razonSocial: '',
      folioSUA: '',
      tipoPago: '',
      fechaAplicacion: '',
      imss: {},
      totalIMSS: 0,
      totalAFORE: 0,
      totalINFONAVIT: 0,
      totalAPagar: 0,
      trabajadoresCount: 0,
      recordsCountByType: {},
      data: {},
    };
  }

  // Keep fixed positions: latin1 is critical if buffer is used
  const content =
    Buffer.isBuffer(suaTextOrBuffer)
      ? suaTextOrBuffer.toString('latin1')
      : str(suaTextOrBuffer);

  if (content.length < RECORD_LEN || content.length % RECORD_LEN !== 0) {
    throw new Error(`Invalid SUA: length=${content.length} must be multiple of ${RECORD_LEN}`);
  }

  const records = splitFixedRecords(content, RECORD_LEN);

  const recordsCountByType = {};
  const byType = {};
  for (const r of records) {
    const t = r.slice(0, 2);
    recordsCountByType[t] = (recordsCountByType[t] || 0) + 1;
    (byType[t] ||= []).push(r);
  }

  const r02 = (byType['02'] || [])[0] || '';
  const r05 = (byType['05'] || [])[0] || '';
  const r06 = (byType['06'] || [])[0] || '';

  // Record 02 (header): positions validated in sample
  const registroPatronal = r02 ? sliceTrim(r02, 2, 13) : '';
  const rfc = r02 ? sliceTrim(r02, 14, 26) : '';
  const periodoRaw = r02 ? sliceTrim(r02, 26, 32) : '';
  const folioSUA = r02 ? sliceTrim(r02, 32, 38) : '';

  const periodo = toPeriodoYYYYMM(periodoRaw);

  // razonSocial: best-effort window (adjust if needed)
  const razonSocial = r02 ? sliceTrim(r02, 38, 78) : '';

  const imss = parseRecord05IMSS(r05);
  const r06Parsed = parseRecord06(r06);

  const totalINFONAVIT = +(r06Parsed.totalVIV + r06Parsed.totalACV).toFixed(2);
  const totalAPagar = +(r06Parsed.totalIMSS + r06Parsed.totalAFORE + totalINFONAVIT).toFixed(2);

  const trabajadoresCount = recordsCountByType['03'] || 0;

  // data: include raw-ish useful pieces for debugging/auditing (NOT huge)
  const data = {
    periodoRaw,
    record02: r02 ? { raw: r02 } : undefined,
    record05: r05 ? { raw: r05 } : undefined,
    record06: r06 ? { raw: r06 } : undefined,
  };

  return {
    periodo,
    registroPatronal,
    rfc,
    razonSocial,
    folioSUA,

    tipoPago: r06Parsed.tipoPago || '',
    fechaAplicacion: r06Parsed.fechaAplicacion || '',

    imss,

    totalIMSS: +r06Parsed.totalIMSS.toFixed(2),
    totalAFORE: +r06Parsed.totalAFORE.toFixed(2),
    totalINFONAVIT,
    totalAPagar,

    trabajadoresCount,
    recordsCountByType,
    data,
  };
}

export default { parseSUA };
