# Koma

Offline Japanese manga reader for iPhone (Home Screen web app), with word-level English help.

- Open https://pat-co-jp.github.io/koma/ in Safari, then Share > Add to Home Screen.
- Reading packs (`.koma.json`) are produced on the Claude laptop by `koma_pipeline.py`
  from volumes dropped into iCloud Drive > 6. Automation > Koma > Inbox (`.cbz`, `.zip` or scanned `.pdf`).
- Import a volume's `.cbz` and `.koma.json` together, or download it from a repository.
  Everything is stored on the device and reads offline.

## Repositories

Library > Repository > add a link (and an optional access token). Koma reads the catalogue and
downloads volumes into the app. A repository is any HTTPS host serving these files:

```
<base>/index.json                     catalogue (format below)
<base>/<folder>/<Title>.cbz           volume archive (images, natural sort order)
<base>/<folder>/<Title>.koma.json     reading pack (optional)
<base>/<folder>/cover.jpg             cover thumbnail (optional)
```

`koma_pipeline.py` already writes exactly this layout into `Koma/Library`, including `index.json`
and covers, so serving that folder as `<base>` is enough.

### index.json

```json
{
  "format": "koma-repo",
  "version": 1,
  "name": "Patrick's Koma library",
  "updated": "2026-11-15T21:08:32+11:00",
  "volumes": [
    {
      "id": "f0e9e0a09125a678",
      "title": "Koma Test Vol 01",
      "cbz": "Koma Test Vol 01/Koma Test Vol 01.cbz",
      "pack": "Koma Test Vol 01/Koma Test Vol 01.koma.json",
      "cover": "Koma Test Vol 01/cover.jpg",
      "pages": 3,
      "bubbles": 6,
      "bytes": 329132,
      "added": "2026-11-15T07:42:47+11:00"
    }
  ]
}
```

- Paths are relative to `<base>` and URL-encoded by the app per segment (spaces and Japanese are fine).
- `id`: any stable string. The pipeline uses the first 16 hex characters of the archive's SHA-256.
- `pack`, `cover`, `pages`, `bubbles`, `bytes`, `added` are optional.

### Host requirements

| Requirement | Why |
|---|---|
| HTTPS with a certificate iOS trusts | The app is served over HTTPS; iOS blocks plain-HTTP requests from it |
| `Access-Control-Allow-Origin: https://pat-co-jp.github.io` | The app runs on that origin |
| If using a token: `Access-Control-Allow-Headers: Authorization`, answer `OPTIONS` preflight with 2xx and no auth | The token is sent as `Authorization: Bearer <token>`, which triggers a preflight |
| `Access-Control-Expose-Headers: Content-Length` (optional) | Download progress percentage |
| Keep it private | These are personal format-shifted copies: protect the host (token, private network or both), never make it public |

### Repository file (optional)

Instead of typing the link, import a JSON file through the Repository tab:

```json
{ "format": "koma-repo-config", "name": "My library", "url": "https://example.host/koma/", "token": "optional" }
```

## Releases

Bump `VERSION` in `sw.js` and `APP_VERSION` in `index.html` together, commit and push. The installed app shows "Update ready. Tap to reload."
