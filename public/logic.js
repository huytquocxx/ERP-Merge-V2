/**
 * Core merge logic for ERP-Merge-V2
 */

export function normalizeKey(v) { 
  return String(v == null ? '' : v).trim().toUpperCase(); 
}

export function compositeKey(row, fields) {
  return fields.map(function(f) { return normalizeKey(row[f]); }).join('|');
}

export function mdgKey(row, fields) {
  return fields.map(function(f) { return normalizeKey(row[f]); }).filter(Boolean).join('-');
}

export function performMerge(s4Raw, eccRaw, keys, priority) {
  const prefix = 'ERP';

  const s4 = s4Raw.map(function(r) { 
    const key = compositeKey(r, keys);
    return Object.assign({}, r, { _key: key, MDGKey: mdgKey(r, keys), _src: 'S4' }); 
  });
  
  const ecc = eccRaw.map(function(r) { 
    const key = compositeKey(r, keys);
    return Object.assign({}, r, { _key: key, MDGKey: mdgKey(r, keys), _src: 'ECC' }); 
  });

  const s4keys = new Set(s4.map(function(r) { return r._key; }));
  const ecckeys = new Set(ecc.map(function(r) { return r._key; }));

  const overlap = Array.from(s4keys).filter(function(k) { return ecckeys.has(k); });
  const s4only = Array.from(s4keys).filter(function(k) { return !ecckeys.has(k); });
  const ecconly = Array.from(ecckeys).filter(function(k) { return !s4keys.has(k); });

  const primary = priority === 's4' ? s4 : ecc;
  const secondary = priority === 's4' ? ecc : s4;
  const primaryKeys = priority === 's4' ? s4keys : ecckeys;

  let raw = primary.slice();
  secondary.filter(function(r) { return !primaryKeys.has(r._key); }).forEach(function(r) { raw.push(r); });
  
  const seen = new Set();
  raw = raw.filter(function(r) { 
    if (seen.has(r._key)) return false; 
    seen.add(r._key); 
    return true; 
  });

  const s4cols = s4Raw.length ? Object.keys(s4Raw[0]) : [];
  const ecccols = eccRaw.length ? Object.keys(eccRaw[0]) : [];
  const allcols = Array.from(new Set([].concat(s4cols, ecccols))).sort();

  const mdmapping = [].concat(s4, ecc).map(function(r) {
    const rec = { MDGKey: r.MDGKey, ERPSystem: r._src };
    allcols.forEach(function(c) { rec[prefix + c] = r[c] == null ? '' : r[c]; });
    return rec;
  });

  const cleanCols = allcols.filter(function(c) { return c !== '_key' && c !== '_src' && c !== 'MDGKey'; });
  const mdtable = raw.map(function(r) {
    const o = { MDGKey: r.MDGKey };
    cleanCols.forEach(function(c) { o[c] = r[c] == null ? '' : r[c]; });
    return o;
  });

  return {
    mdtable: mdtable,
    mdmapping: mdmapping,
    summary: {
      s4: s4.length,
      ecc: ecc.length,
      mdt: mdtable.length,
      mdm: mdmapping.length,
      overlap: overlap.length,
      s4only: s4only.length,
      ecconly: ecconly.length,
      overlapList: overlap.sort(),
      s4onlyList: s4only.sort(),
      ecconlyList: ecconly.sort(),
      priority: priority
    }
  };
}
