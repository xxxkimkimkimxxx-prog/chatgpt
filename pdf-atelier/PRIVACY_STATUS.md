# Protective shutdown — 2026-09-21

Verification: production web build passed; full suite passed (64 Python + 2 API + 4 Sites tests); additional real-HTTP adapter coverage added and all 6 privacy tests passed. Direct calls to Render/Vercel adapters reject bodies before reading, and Render serves the script-free notice with CSP. Browser visual verification blocked by ERR_BLOCKED_BY_CLIENT on the local preview. Public deployment and container execution remain unverified.

This is NOT a finished offline editor or a security certification.

The user explicitly rejects external processing of confidential documents. Previous versions sent PDFs, edits and some OCR inputs/results to Python server endpoints. Browser-local OCR recognition alone did not make the complete workflow local.

Current release entrypoint is a script-free static notice. No file picker, drop handler, draft/signature retrieval, document parser or OCR worker is loaded. CSP disables scripts, network APIs, workers and forms. Render, Vercel and development document endpoints reject requests; application code does not read their bodies. Hosting infrastructure could still receive traffic sent by an old client or direct caller: rejecting a request does not undo transmission.

The Render image includes only the notice, CSS and static server. It does not include the PDF engine. Legacy source is retained for migration but is not an active frontend entrypoint. Existing saved drafts are untouched, not erased.

Deployment status is separate from source status. Old public deployments and already-open old tabs are NOT automatically made safe by this commit. Do not use them with confidential files. No historical-upload deletion, provider log purge, or breach determination has been performed.

Before editing can resume: implement browser-only rendering/editing/export with no server fallback; self-host all required resources; remove automatic persistence; test network requests with synthetic document markers, all error paths and mobile downloads; document unavailable features; verify the exact deployed build. Browser/device compromise and downloaded-file cloud backups remain outside an app's guarantees.
