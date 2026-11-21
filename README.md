# Koma

Offline Japanese manga reader for iPhone (Home Screen web app), with word-level English help.

- Open https://pat-co-jp.github.io/koma/ in Safari, then Share > Add to Home Screen.
- Reading packs (`.koma.json`) are produced on the Claude laptop by `koma_pipeline.py`
  from volumes dropped into iCloud Drive > 6. Automation > Koma > Inbox (`.cbz`, `.zip` or scanned `.pdf`),
  or pulled automatically from your own library server (see "Library server" below).
- Import a volume's `.cbz` and `.koma.json` together, or download it from a repository.
  Everything is stored on the device and reads offline.

## Read raw now, readings later (1.2.0)

A volume appears in the repository catalogue as soon as the pipeline ingests it, before OCR and
readings are done. In Library > Repository each card shows its state:

| Card shows | Meaning | Button |
|---|---|---|
| `Processing on PC · NN%` | Ingested; mokuro / Claude still working | **Read raw** downloads the pages now |
| `読 N` + "Readings ready" | Reading pack built | **Get** (or **On phone**) |
| `Failed` + reason | Gave up after 3 attempts | Delete the volume's `status.json` on the PC to retry |

A raw volume shows "readings pending" in On this phone. When the PC finishes, the app attaches the
pack to the copy already on the phone: no re-download, and your page and last-read time are kept.
This happens on app start, on Refresh, and every minute while anything is processing and the app is
open. If you're reading that volume at the time, the word boxes appear in place. A rebuilt pack
(new `packUpdated`) is re-attached the same way.

The service worker never caches repository requests: catalogue, covers, volumes and packs always
come live from the host.

## Repositories

Library > Repository > add a link (and an optional access token). Koma reads the catalogue and
downloads volumes into the app. A repository is any host serving these files:

```
<base>/index.json                     catalogue (format below)
<base>/<folder>/<Title>.cbz           volume archive (images, natural sort order)
<base>/<folder>/<Title>.koma.json     reading pack (once ready)
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
  "updated": "2026-11-15T21:49:02+11:00",
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
      "added": "2026-11-15T07:42:47+11:00",
      "status": "ready",
      "progress": { "done": 3, "total": 3 },
      "packUpdated": "2026-11-15T07:42:47+11:00"
    },
    {
      "id": "9b1c02d4e5f60718",
      "title": "Koma Test Vol 02",
      "cbz": "Koma Test Vol 02/Koma Test Vol 02.cbz",
      "cover": "Koma Test Vol 02/cover.jpg",
      "pages": 3,
      "bytes": 329102,
      "added": "2026-11-15T21:47:40+11:00",
      "status": "processing",
      "progress": { "done": 1, "total": 3 }
    }
  ]
}
```

- Paths are relative to `<base>` and URL-encoded by the app per segment (spaces and Japanese are fine).
- `id`: any stable string. The pipeline uses the first 16 hex characters of the archive's SHA-256.
- `status`: `processing`, `ready` or `failed`. Without it, a volume with `pack` counts as ready
  (catalogues from 1.1.x keep working).
- `progress` (`done`/`total` Claude batches), `detail` (failure reason) and `packUpdated`
  (changes whenever the pack is rebuilt) drive the status line and re-attach.
- `pack` is listed only once the volume is ready. `cover`, `pages`, `bubbles`, `bytes`, `added` are optional.

### Compatibility notes

These aren't Koma rules; iOS and the browser enforce them, and a host that misses them won't load.

| Need | Why |
|---|---|
| HTTPS with a certificate iOS trusts | The app is served over HTTPS, and iOS blocks plain-HTTP requests from it |
| `Access-Control-Allow-Origin: https://pat-co-jp.github.io` | The app runs on that origin; without it the browser blocks the response |
| With a token: `Access-Control-Allow-Headers: Authorization`, and a 2xx answer to `OPTIONS` without auth | The token is sent as `Authorization: Bearer <token>`, which triggers a preflight |
| `Access-Control-Expose-Headers: Content-Length` (optional) | Download progress percentage |
| `Cache-Control: no-store` on `index.json` (recommended) | So status changes show up straight away |

### Repository file (optional)

Instead of typing the link, import a JSON file through the Repository tab:

```json
{ "format": "koma-repo-config", "name": "My library", "url": "https://example.host/koma/", "token": "optional" }
```

## Online Library (1.2.1)

Repository › **Online library** browses a Suwayomi server through the repository host, so Safari
isn't needed. The host (`koma_repo_server.py` 1.2.1) exposes a small JSON API next to the catalogue;
the app only talks to the repository link, never to Suwayomi directly.

| Endpoint | Returns |
|---|---|
| `GET api/status` | `{server: "koma-repo", version, suwayomi: {ok, version} or {ok: false, message}}` |
| `GET api/sources` | Installed sources (`id, name, lang, latest, nsfw, icon`), Japanese first |
| `GET api/library?page=N` | Series in Suwayomi's library, 60 per page |
| `GET api/browse?source=ID&type=POPULAR\|LATEST\|SEARCH&q=…&page=N` | `{items: [{id, title, thumb, inLibrary}], hasNext}` |
| `GET api/manga/ID[?refresh=1]` | Series details and chapters (newest first), with `sent` / `job` per chapter |
| `GET api/thumb/ID`, `GET api/icon/NAME` | Cover and source icon images |
| `GET api/jobs` | Download jobs: `queued`, `downloading` (`done`/`total`), `sent`, `failed` (`error`) |
| `POST api/download` `{chapterId, force}` | Queues a chapter: the host builds a `.cbz` (+ `ComicInfo.xml`) into `Koma/Inbox` and starts the pipeline |
| `POST api/remove` `{ids: [volume ids]}` | (1.2.37) Removes volumes from the catalogue: their folders move from `Koma/Library` to `Koma/Removed` (recoverable) and leave `index.json`; a volume still processing is skipped while the pipeline runs. Answers `{removed, skipped: [{id, reason}]}` |

- Errors are JSON `{error, message}`: `suwayomi_unreachable` (503), `source_error` (502, the source's
  own message), `bad_request` (400), `forbidden_origin` (403). A host without the API (404 on
  `api/status`) shows "no Online Library yet".
- The app shows the connection state: offline, laptop unreachable (Meshnet), Suwayomi not
  responding, or a source error, each with Try again.
- `POST` is only accepted from the app's origin; other websites opened on the phone can't start downloads.
- A chapter already sent shows **In Koma**; tapping asks "Send again?" first. Same pages make the same
  archive, so a re-send of a chapter still in the Library is caught as a duplicate by the pipeline.
- Everything is network-only: the service worker never caches API calls, so the app shell and
  on-phone volumes are unaffected when the laptop is away.

## Library server (pipeline side)

`koma_pipeline.py --watch-server` (the scheduled task passes it) checks your own comic server's
OPDS 1.2 feed each run and copies newly added `.cbz` / `.pdf` volumes into `Koma/Inbox`, where they
are ingested immediately (no sync wait) and show up as "Read raw" on the phone.

Configure it in `C:\Users\patri\koma\.env` (copy `.env.example`). Nothing is hardcoded; with
`KOMA_SOURCE_URL` empty the step does nothing.

| Key | Meaning |
|---|---|
| `KOMA_SOURCE_URL` | OPDS root, e.g. Komga `http://localhost:25600/opds/v1.2/catalog`, Kavita `http://localhost:5000/api/opds/<api-key>`, Suwayomi `http://localhost:4567/api/opds/v1.2` (typical paths; check your server's settings for the exact one) |
| `KOMA_SOURCE_USER` / `KOMA_SOURCE_PASSWORD` | HTTP Basic auth (optional) |
| `KOMA_SOURCE_TOKEN` | Bearer token instead of Basic (optional) |
| `KOMA_SOURCE_MAX_PER_RUN` | Volumes pulled per run (default 5) |
| `KOMA_SOURCE_MAX_FEEDS` | Feed pages crawled per run (default 200) |
| `KOMA_SOURCE_BACKFILL` | `1` = also pull everything already on the server on the first run |
| `KOMA_SOURCE_TIMEOUT` | Seconds per request (default 120) |

- First run records what's already on the server as a baseline and pulls only what's added after
  (unless `BACKFILL=1`). Changing the URL resets the baseline. State: `koma\work\source_state.json`.
- Only links on the same host as `KOMA_SOURCE_URL` are followed.
- Errors (unreachable, 401/403) appear in the pipeline status note and the health check; the rest of
  the run carries on.

## Releases

Bump `VERSION` in `sw.js` and `APP_VERSION` in `index.html` together, commit and push. The installed app shows "Update ready. Tap to reload."
