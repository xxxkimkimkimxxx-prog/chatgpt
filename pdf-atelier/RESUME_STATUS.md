# Noto / OCR / Office implementation checkpoint

## 2026-09-22 privacy migration update

Active frontend is now `src/LocalApp.jsx` with browser-local processing in `src/localEngine.js` and `src/localCore.js`. Do not reactivate legacy `src/App.jsx` or any Python document API. Basic page operations, rasterized Japanese text, OCR text extraction and text-oriented Office exports are implemented. Full suite passes: 65 Python + 2 API + 4 Sites + 4 local engine tests; production Web build passes. Browser verification is blocked because `agent-browser` is unavailable, and public deployment is not updated/verified. See `PRIVACY_STATUS.md` and `TEST_REPORT.md` for authoritative current status; historical notes below are superseded where they conflict.

2026-09-20. NOT RELEASE READY. Existing public deployment was not changed.

Implemented in working source:
- Noto Sans JP / Serif JP regular and bold, preview and PDF embedding.
- Self-hosted Tesseract.js assets, browser recognition and transparent PDF text overlay.
- Higher-resolution OCR image endpoint and rotation-aware overlay coordinates.
- Word page-image and editable text modes; Excel reference-image/editable-grid and table modes.
- Supplementary Unicode ToUnicode repair and full Noto font license.

Verification evidence:
- Existing Python suite: 51 passed.
- New tests/test_office_ocr.py: 8 passed (all four fonts with Japanese/supplementary character extraction, rotation-aware OCR and pixel equality, invalid input, Office selection/images and formula safety).
- Earlier web build passed, but must rebuild after latest edits.
- Browser check BLOCKED: agent-browser 0.20.0 daemon reported `Failed to bind socket: Operation not permitted (os error 1)`. Do not work around permission restriction. Newer version also failed startup.
- No browser OCR execution, browser downloads, real Word/Excel rendering, or deployment verification completed for this increment.

Remaining before release:
1. Run browser checks in an authorized environment. Do not deploy this checkpoint as verified.
2. Replace heuristic conversion score (not measured fidelity) with factual diagnostics; update old help text.
3. Validate Word anchored page-image sections in Word/LibreOffice, including page counts and margins. Editable Word is approximate flow, not coordinate-exact.
4. Test actual browser OCR language/core assets, cancellation/errors, repeated OCR, existing-text duplication, and large PDFs.
5. Verify Office Japanese font mapping and rotated text layout; strengthen malformed OCR schema validation and resource limits.
6. Noto shared space glyph extracts as NBSP; new font test normalizes this. Do not claim exact whitespace roundtrip.
7. Re-run full npm test and build, browser/mobile visual checks; deployment must be tested before promotion.
8. Refresh AGENTS.md / README / TEST_REPORT (historical public authorization wording is stale).

Existing production: https://pdf-atelier-one.vercel.app/
