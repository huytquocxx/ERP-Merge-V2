/**
 * /api/fetch.js
 * Vercel serverless proxy — fetches a remote Excel or Google Sheets file
 * server-side and streams it back to the browser, bypassing CORS restrictions.
 *
 * Usage: GET /api/fetch?url=<encoded_url>
 */

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Decode and validate URL
  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    new URL(targetUrl); // throws if invalid
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Only allow Google Sheets and Drive hosts — block arbitrary URLs
  const hostname = new URL(targetUrl).hostname;
  const allowed = [
    'docs.google.com',
    'drive.google.com',
    'sheets.googleapis.com',
  ];

  // Also allow googleusercontent.com — Drive download redirects land here
  const isAllowed =
    allowed.some(h => hostname === h || hostname.endsWith('.' + h)) ||
    hostname.endsWith('.googleusercontent.com');

  if (!isAllowed) {
    return res.status(403).json({
      error: 'URL not allowed. Only Google Sheets and Google Drive links are supported.'
    });
  }

  // Auto-convert Google Sheets / Drive links to a direct download URL
  let fetchUrl = targetUrl;
  const fileIdMatch = targetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (fileIdMatch) {
    const fileId = fileIdMatch[1];

    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      // Native Google Sheet — export as xlsx
      fetchUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx&id=${fileId}`;
    } else if (targetUrl.includes('drive.google.com')) {
      // File stored in Google Drive (e.g. uploaded .xlsx with rtpof=true)
      fetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    }
  }

  try {
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ERPMergeV2/1.0)',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Remote file returned HTTP ${response.status}. Check the file is publicly accessible.`,
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // Reject HTML responses (e.g. login pages, permission walls)
    if (contentType.includes('text/html')) {
      return res.status(403).json({
        error: 'Remote server returned an HTML page instead of a file. Make sure sharing is set to "Anyone with the link can view".',
      });
    }

    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    console.error('Proxy fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch the remote file. Please try again.' });
  }
}
