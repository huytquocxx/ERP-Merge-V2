import handler from '../api/fetch.js';
import { jest } from '@jest/globals';

// Mocking the Vercel request/response
function createMockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('API Proxy /api/fetch', () => {
  test('should return 405 for non-GET methods', async () => {
    const req = { method: 'POST' };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 400 for missing url', async () => {
    const req = { method: 'GET', query: {} };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing url parameter' }));
  });

  test('should return 403 for disallowed hosts', async () => {
    const req = { method: 'GET', query: { url: 'https://evil.com/file.xlsx' } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('URL not allowed') }));
  });

  test('should allow Google Docs hosts', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      arrayBuffer: () => Promise.resolve(Buffer.from('mock content')),
    });

    const req = { method: 'GET', query: { url: 'https://docs.google.com/spreadsheets/d/1abc/edit' } };
    const res = createMockRes();
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('export?format=xlsx'), expect.anything());
  });
});
