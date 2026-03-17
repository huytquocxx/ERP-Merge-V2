import { normalizeKey, compositeKey, mdgKey, performMerge } from '../public/logic.js';

describe('ERP Merge Logic', () => {
  test('normalizeKey should trim and uppercase strings', () => {
    expect(normalizeKey('  abc  ')).toBe('ABC');
    expect(normalizeKey('AbC')).toBe('ABC');
    expect(normalizeKey(null)).toBe('');
    expect(normalizeKey(undefined)).toBe('');
  });

  test('compositeKey should join fields with |', () => {
    const row = { id: '123', name: 'Test' };
    expect(compositeKey(row, ['id', 'name'])).toBe('123|TEST');
  });

  test('mdgKey should join non-empty fields with -', () => {
    const row = { id: '123', part: 'A', extra: '' };
    expect(mdgKey(row, ['id', 'part', 'extra'])).toBe('123-A');
  });

  test('performMerge should merge S4 and ECC data correctly (S4 priority)', () => {
    const s4Data = [
      { ID: '1', Val: 'S4-1' },
      { ID: '2', Val: 'S4-2' }
    ];
    const eccData = [
      { ID: '1', Val: 'ECC-1' },
      { ID: '3', Val: 'ECC-3' }
    ];
    const keys = ['ID'];
    const result = performMerge(s4Data, eccData, keys, 's4');

    expect(result.summary.mdt).toBe(3); // 1, 2 from S4; 3 from ECC
    expect(result.summary.overlap).toBe(1); // ID 1
    
    // Check MDtable content (S4 priority)
    const row1 = result.mdtable.find(r => r.MDGKey === '1');
    expect(row1.Val).toBe('S4-1');

    const row3 = result.mdtable.find(r => r.MDGKey === '3');
    expect(row3.Val).toBe('ECC-3');
  });

  test('performMerge should merge S4 and ECC data correctly (ECC priority)', () => {
    const s4Data = [
      { ID: '1', Val: 'S4-1' }
    ];
    const eccData = [
      { ID: '1', Val: 'ECC-1' }
    ];
    const keys = ['ID'];
    const result = performMerge(s4Data, eccData, keys, 'ecc');

    const row1 = result.mdtable.find(r => r.MDGKey === '1');
    expect(row1.Val).toBe('ECC-1');
  });

  test('performMerge should handle large datasets efficiently (performance)', () => {
    const COUNT = 50000;
    const s4Data = Array.from({ length: COUNT }, (_, i) => ({ ID: String(i), Val: `S4-${i}` }));
    const eccData = Array.from({ length: COUNT }, (_, i) => ({ ID: String(i + COUNT / 2), Val: `ECC-${i}` }));
    const keys = ['ID'];

    const start = Date.now();
    const result = performMerge(s4Data, eccData, keys, 's4');
    const end = Date.now();

    const duration = end - start;
    console.log(`Merge duration for ${COUNT * 2} records: ${duration}ms`);
    
    expect(duration).toBeLessThan(2000); 
    expect(result.summary.mdt).toBe(COUNT * 1.5);
  });
});
