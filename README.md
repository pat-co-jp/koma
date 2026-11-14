# Koma

Offline Japanese manga reader for iPhone (Home Screen web app), with word-level English help.

- Open https://pat-co-jp.github.io/koma/ in Safari, then Share > Add to Home Screen.
- Reading packs (`.koma.json`) are produced on the Claude laptop by `koma_pipeline.py`
  from volumes dropped into iCloud Drive > 6. Automation > Koma > Inbox.
- Import a volume's `.cbz` and `.koma.json` together; everything is stored on the device.

Release: bump `VERSION` in `sw.js` and `APP_VERSION` in `index.html` together.
