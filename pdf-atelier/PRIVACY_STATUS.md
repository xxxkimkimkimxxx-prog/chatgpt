# Browser-local migration status - 2026-09-22

This is a working migration checkpoint, not a security certification or public-release approval.

The active entrypoint is `src/LocalApp.jsx`. PDF rendering and text extraction use PDF.js in the browser. Page editing uses pdf-lib in the browser. OCR uses self-hosted Tesseract.js assets. DOCX and XLSX files are assembled in the browser. No active document operation calls `/api/*`.

The Render static server and Vercel function reject all document-processing API requests without reading request bodies. The production container copies only built static assets and `server.py`; it does not copy the legacy Python PDF engine.

Implemented: open, render, merge, rotate, delete, duplicate, reorder, blank pages, selected-page PDF extraction, rasterized Noto Sans JP text, highlight, PDF download, OCR text extraction (up to five selected pages), text-oriented DOCX/XLSX, page-image DOCX/XLSX, in-memory undo.

Deliberately disabled or incomplete: searchable Japanese OCR overlay, rotated-page annotation coordinates, existing-text replacement, verified redaction, encryption, forms, signatures and batch ZIP. Automatic persistence is disabled. Page-image Office output preserves appearance but its page body is not editable.

Verification: Vite production build passes. 65 Python tests, 2 API rejection tests, 4 static-host tests and 4 browser-local engine tests pass. The local engine tests cover rotate, duplicate, delete, reorder, merge, selected-page extraction, invalid page removal/order, DOCX/XLSX package structure, reopening generated Office files in python-docx/openpyxl, and active-source checks for document API calls.

Visual browser verification is blocked because the required `agent-browser` executable is unavailable in this environment. Docker/container execution is also unverified because Docker/Podman is unavailable. OCR worker execution, Japanese text raster placement and iPhone download behavior therefore remain unverified in a real browser. The public deployment has not been promoted or verified.

Do not use an older public deployment for confidential files. A new source commit does not retroactively make an open old tab safe.
