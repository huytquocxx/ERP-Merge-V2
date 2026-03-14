# ERP Merge V2

Merges SAP S/4HANA and ECC country master data files into consolidated MDtable and MDmapping outputs.

## Stack

- **Frontend:** Single HTML file — IBM Plex fonts, SheetJS for Excel parsing and download
- **Backend:** One Vercel serverless function (`/api/fetch.js`) as a CORS proxy for Google Sheets URLs
- **Hosting:** Vercel (free tier)

## Project structure

```
erp-merge-v2/
├── api/
│   └── fetch.js        # Vercel serverless proxy — fetches Google Sheets server-side
├── public/
│   └── index.html      # Full app (UI + merge logic)
└── vercel.json         # Routing config
```

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create erp-merge-v2 --private --push --source=.
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your `erp-merge-v2` repo
4. Leave all settings as default — Vercel auto-detects the config
5. Click **Deploy**

Your app will be live at `https://erp-merge-v2.vercel.app` (or similar).

### 3. Share with your team

Send them the Vercel URL. No installation, no Python, no setup.

## How it works

| Step | What happens |
|------|-------------|
| 01 — Data input | Upload `.xlsx` files or paste Google Sheets URLs. Set priority source. |
| 02 — Preview | Inspect first 5 rows of each dataset before merging. |
| 03 — Run merge | Select key fields. Validation runs. Click to merge. |
| 04 — Results | Review MDtable and MDmapping. Download both as `.xlsx`. |

### Google Sheets URL fetching

Browser `fetch()` is blocked by Google's CORS policy. The `/api/fetch.js` serverless function fetches the file server-side and proxies it back — bypassing CORS cleanly. Only Google Sheets and Google Drive URLs are allowed through the proxy.

### Merge logic

Mirrors the original Python/pandas logic exactly:

1. `normalizeKey` — trims and uppercases each value
2. `compositeKey` — joins selected key fields with `|` separator
3. `mdgKey` — joins non-empty key parts with `-` for the MDGKey column
4. **MDtable** — priority source rows first, then secondary-only rows, deduplicated (first occurrence wins)
5. **MDmapping** — all rows from both sources with `ERP` prefix on every column

### Priority

S4 is the default priority (correct for most SAP migration projects where S4 data has been validated). Toggle to ECC on step 01 if your ECC records are more current.

