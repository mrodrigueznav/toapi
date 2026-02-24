/**
 * suaParser.service.js (SUA-only, self-contained)
 *
 * ✅ No depende de otros archivos.
 * ✅ Parsea .SUA (records 295 concatenados).
 * ✅ Retorna respuesta separada por formulario:
 *    - imss
 *    - rcv
 *    - infonavit
 * ✅ Cada campo retorna { value, source } y usa "" cuando aplica.
 *
 * IMPORTANTE:
 * - Lee el archivo .SUA como latin1 para no romper posiciones:
 *   fs.readFileSync(path, 'latin1') o Buffer->toString('latin1')
 */

const RECORD_LEN = 295;

// ---------------------
// Helpers básicos
// ---------------------
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
  // Ajusta este mapeo si tu negocio lo requiere
  if (t === 'W300') return 'PAGO OPORTUNO';
  return t;
}
function deriveAnioMes(periodoYYYYMM) {
  const p = String(periodoYYYYMM || '');
  const m = p.match(/^(\d{4})-(\d{2})$/);
  if (!m) return { anio: '', mes: '' };
  return { anio: m[1], mes: m[2] };
}
function deriveBimestre(mesStr) {
  const m = Number(mesStr);
  if (!Number.isFinite(m) || m < 1 || m > 12) return '';
  return String(Math.ceil(m / 2)).padStart(2, '0'); // 01..06
}

// ---------------------
// Parsing Record 05 (IMSS agregado)
// ---------------------
/**
 * Espera (en tu layout validado previamente) 10 campos de 9 dígitos:
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

  // bloque numérico usualmente a partir de pos 38 y alineado a la derecha
  const body = r05.slice(38).replace(/\s+$/g, '');
  const firstNonZero = body.search(/[1-9]/);
  const start = firstNonZero >= 0 ? firstNonZero : 0;
  const seq = body.slice(start);

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

// ---------------------
// Parsing Record 06 (totales + tipoPago + fechaAplicacion)
// ---------------------
/**
 * Layout usado:
 * - tipoPago: slice(68,72) (ej "W300")
 * - fechaAplicacion: YYYYMMDD en slice(58,66) -> YYYY-MM-DD
 * - Totales: secuencia de 12 dígitos desde pos 72, escala /100
 *   usamos primeros 4:
 *   1 totalIMSS
 *   2 totalAFORE
 *   3 totalVIV
 *   4 totalACV
 * totalINFONAVIT = VIV + ACV
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

// ---------------------
// Base parse SUA (02/05/06 + conteos)
// ---------------------
function parseSUAInternal(suaTextOrBuffer) {
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
    };
  }

  const content = Buffer.isBuffer(suaTextOrBuffer)
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

  const registroPatronal = r02 ? sliceTrim(r02, 2, 13) : '';
  const rfc = r02 ? sliceTrim(r02, 14, 26) : '';
  const periodoRaw = r02 ? sliceTrim(r02, 26, 32) : '';
  const folioSUA = r02 ? sliceTrim(r02, 32, 38) : '';

  const periodo = toPeriodoYYYYMM(periodoRaw);
  const razonSocial = r02 ? sliceTrim(r02, 38, 78) : '';

  const imss = parseRecord05IMSS(r05);
  const r06Parsed = parseRecord06(r06);

  const totalINFONAVIT = +(r06Parsed.totalVIV + r06Parsed.totalACV).toFixed(2);
  const totalAPagar = +(r06Parsed.totalIMSS + r06Parsed.totalAFORE + totalINFONAVIT).toFixed(2);

  const trabajadoresCount = recordsCountByType['03'] || 0;

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
  };
}

// ---------------------
// Public API: response separada por formulario
// ---------------------
export function parseSUA(suaTextOrBuffer) {
  const sua = parseSUAInternal(suaTextOrBuffer);

  const source02 = 'SUA (record 02)';
  const source05 = 'SUA (record 05)';
  const source06 = 'SUA (record 06)';

  const empresa = field(sua.razonSocial, source02);
  const folioSUA = field(sua.folioSUA, source02);
  const periodo = field(sua.periodo, source02);

  const tipoPagoLabel = normalizeTipoPago(sua.tipoPago);
  const tipoPago = field(tipoPagoLabel || '', tipoPagoLabel ? source06 : '');

  const fechaPago = field(sua.fechaAplicacion || '', sua.fechaAplicacion ? source06 : '');

  const { anio, mes } = deriveAnioMes(sua.periodo);
  const anioPago = field(anio, anio ? 'DERIVABLE (periodo SUA)' : '');
  const mesPago = field(mes, mes ? 'DERIVABLE (periodo SUA)' : '');
  const bimestrePago = field(deriveBimestre(mes), mes ? 'DERIVABLE (mes de pago)' : '');

  const noTrabajadores = field(sua.trabajadoresCount, 'SUA (conteo records 03)');

  const totalIMSS = nfield(sua.totalIMSS, source06);
  const totalAFORE = nfield(sua.totalAFORE, source06);
  const totalINFONAVIT = nfield(sua.totalINFONAVIT, source06);
  const totalAPagar = nfield(sua.totalAPagar, source06);

  // ---------------- IMSS ----------------
  const imss = {
    datosEmpresa: {
      empresa,
      sucursal: field('', ''),
      tipoPago,
      folioSUA,
      diaExpRiesgo: field('', ''),
    },
    datosPago: {
      fechaPago,
      banco: field('', ''),
      noTrabajadores,
      diasCotizados: field('', ''),
      primaRiesgPag: field('', ''),
      primaRiesgCOP: field('', ''),
      smgPago: field('', ''),
      anioPago,
      mesPago,
    },
    conceptosPago: {
      cuotaFija: nfield(sua.imss?.cuotaFija, source05),

      // Tu UI IMSS pide Pat/Obr; con este layout (agregado) no se puede separar.
      exec3SalMinPat: field('', ''),
      exec3SalMinObr: field('', ''),
      presDinPat: field('', ''),
      presDinObr: field('', ''),
      gastosMedPat: field('', ''),
      gastosMedObr: field('', ''),

      riesgosTrabajo: nfield(sua.imss?.riesgosTrabajo, source05),
      invalidezVidaObr: nfield(sua.imss?.invalidezVida, source05),
      guarderias: nfield(sua.imss?.guarderiasPrestSoc, source05),

      baseTotal: nfield(sua.imss?.subtotalIMSS, source05),
    },
    actRec: {
      actualizacion: nfield(sua.imss?.actualizacionIMSS, source05),
      recargos: nfield(sua.imss?.recargosIMSS, source05),
      importeTotal: totalIMSS,
    },
  };

  // ---------------- RCV ----------------
  const rcv = {
    datosEmpresa: {
      empresa,
      sucursal: field('', ''),
      tipoPago,
      folioSUA,
    },
    datosPago: {
      fechaPago,
      banco: field('', ''),
      noTrabajadores,
      anioPago,
      bimestrePago,
    },
    conceptosPago: {
      retiro: field('', ''),
      cesantiaVejezPat: field('', ''),
      cesantiaVejezObr: field('', ''),
    },
    actRec: {
      actualizacion: field('', ''),
      recargos: field('', ''),
      importeTotal: totalAFORE, // total RCV agregado (AFORE) disponible
    },
  };

  // -------------- INFONAVIT --------------
  const infonavit = {
    datosEmpresa: {
      empresa,
      sucursal: field('', ''),
      tipoPago,
      folioSUA,
    },
    datosPago: {
      fechaPago,
      banco: field('', ''),
      noTrabajadores,
      anioPago,
      bimestrePago,
      noTrabAcred: field('', ''),
    },
    conceptosPago: {
      aportSinCred: field('', ''),
      aportConCred: field('', ''),
      amortizacion: field('', ''),
      subTotal: totalINFONAVIT, // total INFONAVIT agregado disponible
    },
    actRec: {
      actualizacion: field('', ''),
      recargos: field('', ''),
      importeTotal: totalINFONAVIT,
    },
  };

  return {
    meta: {
      sources: { sua: true },
      sua: {
        periodo: periodo.value,
        folioSUA: folioSUA.value,
        recordsCountByType: sua.recordsCountByType || {},
      },
      notes: [
        'SUA-only: banco .',
        'SUA-only: RCV no se puede desglosar Retiro/Cesantía Pat/Obr con el layout actual; solo total AFORE.',
        'SUA-only: INFONAVIT no se puede desglosar con/sin crédito/amortización/#acreditados; solo total INFONAVIT.',
        'SUA-only: IMSS Pat/Obr no se puede separar con el record 05 agregado; solo conceptos agregados disponibles.',
      ],
    },

    // Separado por formulario
    imss,
    rcv,
    infonavit,

    // Útil para header/global
    global: {
      empresa,
      folioSUA,
      periodo,
      tipoPago,
      fechaPago,
      totalIMSS,
      totalAFORE,
      totalINFONAVIT,
      totalAPagar,
    },
  };
}

export default { parseSUA };