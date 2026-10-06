# Verification

Verified on 2026-10-06 with Node.js 24.18.0, npm 12.0.1, and a Chromium browser through Orca.

## Build and static checks

- `npm test`: 11/11 passing. CSV/TSV quoted multiline roundtrips, empty edge cells, Markdown escaping/alignment, CJK/emoji padding, JSON union/duplicate/dangerous keys, normalization, and malformed inputs.
- `npm run lint`: passing with no warnings.
- `npm run typecheck`: passing.
- `npm run build`: passing. Production artifacts are in `dist/`; the JS bundle is about 88 KB gzipped.

## Browser checks

- Editorial image update: fresh unit tests (11/11), lint, TypeScript/build checks passed. Both desktop and 360 × 800 production pages passed all 27 existing UI scenarios plus 9 image checks: responsive local sources, alternative text, reserved dimensions, loading priority, successful decoding, no page overflow, dark image styling, workspace navigation, and local-only requests. Production console remained empty. Visual snapshots were reviewed for the introduction and guide.
- Controller harness: 23 conversion/edit/export scenarios plus 8 keyboard and clipboard scenarios passed.
- Production UI: 27 scenarios passed, including real React input events, double-click cell editing, undo/redo, row/column changes, output tabs, reverse conversion, modal focus trapping/restoration, copy failure feedback, CSV BOM/filename, inert HTML cell content, local-only resource requests, and theme switching.
- The same 27 UI scenarios passed at 360 × 800. Document width remained 360px; source editor height was 260px, with stacked panels and internal table scrolling.
- Large table: 11 scenarios passed with 1,001 total rows. Gutter DOM stayed bounded; all pages and the final row were reachable; edits used global row indices; export retained every row; new row selection, deletion, cross-page arrow navigation, and Tab/Shift+Tab wrapping worked.
- Offline after page load: `navigator.onLine === false`, while pasted TSV still converted into Markdown.
- Production browser console contained no errors.

Clipboard and file payload checks used browser API stubs to inspect generated content without overwriting the user's system clipboard or creating unwanted downloads. A live Excel desktop application and Safari/Firefox were not part of this verification.

The UI browser scripts and temporary controller harness are retained locally in ignored `artifacts/` for audit and replay; they are excluded from the production build.
