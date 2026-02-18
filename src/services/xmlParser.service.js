/**
 * SUA XML parsing and normalization using fast-xml-parser.
 */
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, removeNsp: true });

function getValue(obj, path, defaultValue = '') {
  if (obj == null) return defaultValue;
  const parts = path.split('.');
  let current = obj;
  for (const p of parts) {
    current = current?.[p];
    if (current === undefined) return defaultValue;
  }
  return typeof current === 'string' ? current.trim() : (current != null ? String(current) : defaultValue);
}

/**
 * Parse SUA XML and return normalized fields + full data.
 * Tolerant of missing nodes.
 */
export function parseSUAXml(xmlText) {
  if (!xmlText || typeof xmlText !== 'string') {
    return { periodo: '', registroPatronal: '', rfc: '', razonSocial: '', total: '', lineaCaptura: '', fechaPago: '', data: {} };
  }
  let parsed;
  try {
    parsed = parser.parse(xmlText);
  } catch (err) {
    throw new Error('Invalid XML');
  }
  const data = parsed?.root ?? parsed?.sua ?? parsed?.comprobante ?? parsed ?? {};
  const periodo = getValue(data, 'periodo') || getValue(data, 'Periodo') || getValue(data, 'periodoPago');
  const registroPatronal = getValue(data, 'registroPatronal') || getValue(data, 'RegistroPatronal');
  const rfc = getValue(data, 'rfc') || getValue(data, 'RFC');
  const razonSocial = getValue(data, 'razonSocial') || getValue(data, 'RazonSocial') || getValue(data, 'razónSocial');
  const total = getValue(data, 'total') || getValue(data, 'Total');
  const lineaCaptura = getValue(data, 'lineaCaptura') || getValue(data, 'LineaCaptura');
  const fechaPago = getValue(data, 'fechaPago') || getValue(data, 'FechaPago') || getValue(data, 'fecha');

  return {
    periodo,
    registroPatronal,
    rfc,
    razonSocial,
    total,
    lineaCaptura,
    fechaPago,
    data: flattenObject(data),
  };
}

function flattenObject(obj, prefix = '') {
  const out = {};
  if (obj == null || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, flattenObject(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

export default { parseSUAXml };
