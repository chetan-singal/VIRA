# VIRA

VIRA is a Windows desktop billing and business-management app for a bike spare-parts shop: Cash Bills and Party (credit) Bills, payments received from parties, payments made to suppliers, one combined Cash in Hand figure, an item master, a Daybook and a Dashboard. Single user, fully offline, no login.

This file tells Claude how the project is built and how to work on it. Keep it current: update "Current status" at the end of every phase.

## Stack
- Backend: Spring Boot 3.5.6, Java 17, Maven wrapper, MySQL 8, Flyway, Spring Data JPA (`ddl-auto=validate`).
- Frontend: React 19, Vite 7, JavaScript + JSX (no TypeScript), react-router-dom 7 with HashRouter, plain CSS with design tokens, lucide-react icons, bundled Inter font. Tests: Vitest 5, React Testing Library, jsdom.
- Desktop shell: Electron, Phase 13 (not started). Installer: Phase 14.
- CI (`.github/workflows/ci.yml`): backend job (MySQL 8 service, Java 17, `./mvnw -B verify`) and frontend job (Node 22, `npm ci`, `npm test`, `npm run build`). Both must stay green.

## Commands
The owner works on Windows in PowerShell.

```powershell
# Backend, from backend/
./mvnw spring-boot:run      # http://127.0.0.1:8080 (loopback only)
./mvnw -B verify            # build + all tests; needs MySQL

# Frontend, from frontend/
npm ci
npm run dev                 # http://localhost:5173, /api is proxied to 127.0.0.1:8080
npm test
npm run build
```

- Environment variables: `DB_URL` (default `jdbc:mysql://localhost:3306/vira`), `DB_USERNAME` (default `root`), `DB_PASSWORD`. Tests use the `vira_it` database on `127.0.0.1:3306` (`IT_DB_URL` overrides).
- "Port 8080 was already in use" means an earlier backend is still running: stop it or reuse it.
- `docs/phase2.http`, `phase5.http`, `phase6.http` and `phase8.http` are VS Code REST Client walkthroughs; `phase6.http` runs top to bottom on a fresh database (setup plus sample data) and `phase8.http` collects the Phase 8 calls and SQL.

## Repository
- `backend/` Spring Boot app: `src/main/java/com/vira`, `src/main/resources/db/migration/V1__init.sql`, `src/test`.
- `frontend/` React + Vite app: `src/` has `api`, `lib`, `hooks`, `state`, `layout`, `pages`, `components` (`ui`, `table`, `form`, `records`, `records/forms`, `items`, `parties`, `suppliers`, `shop`, `settings`), `styles`, `test`.
- `docs/` SRS, Development Roadmap, `srs-amendments.md`, the `.http` walkthroughs, this file and `README.md` (an index of `docs/`).
- Sources of truth: `docs/SRS.docx` (requirements), `docs/srs-amendments.md` (amendments A1-A12; they override the SRS wording until folded in), `docs/Development Roadmap.docx` (15 phases, Phase 0 to 14).

## Architecture
Electron (Phase 13) -> React screens -> HTTP `/api` -> Spring Boot rules -> MySQL. React only displays and collects input. The backend decides every price, total, balance, document number and Edit / Delete / Restore permission.

## Business rules (do not break)
- Customers are Cash or Party only. Items are MRP Item or Net Rate Item only. No GST or tax. No stock-quantity tracking. One combined Cash in Hand. Payment mode (Cash / Online) exists only on Payment Vouchers and Supplier Payments, never on a bill. No Reports menu item.
- Cash in Hand and Party Current Balance are stored values. Only `LedgerService` (`adjustCash`, `adjustPartyBalance`) changes `cash_in_hand.balance` and `party.current_balance` after creation; `PartyService` only seeds a new Party's opening balance. Every create, edit, delete and restore uses reverse-then-apply inside one `@Transactional` method. Never recompute balances by summing history on a normal read; Recalculate Balances is the offline safety net.
- Bill, Payment Voucher, Supplier Payment, Party and Supplier are soft-deleted (`is_deleted`, `deleted_at`) and can be restored. Item is the only permanent delete. A record can be edited, deleted or restored only while its own state allows it and its linked Party or Supplier is active. A Party can be deleted only at a balance of exactly 0.
- Document numbers: one shared `BILL` counter for Cash and Party bills (a bill keeps its number for life, even if its type changes on edit), plus `VOUCHER` and `SUPPLIER_PAYMENT`. Only `DocumentNumberService` issues them (prefix + number); `NumberSequenceService.nextValue(` is called only from there.
- Money is `BigDecimal`, 2 decimals, HALF_UP, rounded once at the end of a calculation via `common/Money`. Never floating point. Quantity is a positive whole number. Over-precise input is rejected, never silently rounded.
- A bill snapshots item name, type, unit, MRP, discount and rate when saved; deleting an Item or renaming a Party never rewrites an existing bill. A Party Bill stores `previous_balance`; Total Due = previous balance + grand total.
- The backend listens on `127.0.0.1` only. First-run setup (`POST /api/setup`) is allowed once; the backend stays permissive before it (decision D8), and the "only /setup is reachable until setup is complete" gate is a frontend job (`SetupGate`).
- Schema: Flyway `V1__init.sql` is the only migration and is still edited in place because nothing has shipped. From the first installer (Phase 14) it is permanent and every schema change is a new `V2__` migration. Never change the schema through Hibernate.

## Backend conventions
- Layers: controller (HTTP only) -> service (every rule and every transaction boundary) -> ledger / pricing -> repository. Packages by feature under `com.vira`: `common`, `controller`, `item`, `pricing`, `ledger`, `party`, `supplier`, `bill`, `voucher`, `maintenance`, `daybook`, `dashboard`, `shop`, `settings`.
- `BillService` is where pricing, round-off, numbering, the ledger and Edit / Delete / Restore meet; read it before changing bill behavior.
- Requests and responses are Java records. Unknown JSON properties are rejected (`fail-on-unknown-properties=true`), so a request body holds only the fields of its request record.
- One error shape: `ApiError { code, message, fieldErrors[{field, message}] }`. `VALIDATION_FAILED` and `MALFORMED_REQUEST` are 400, `NOT_FOUND` is 404, every business rule (`PARTY_INACTIVE`, `PARTY_BALANCE_NOT_ZERO`, `RESTORE_BLOCKED_PARTY_DELETED`, `DATA_CONFLICT`, ...) is 409. Create returns 201, delete returns 204 with no body, restore returns 200 with the record.
- Lists return `PageResponse { content, page, size, totalElements, totalPages }`; `page` is 0-based, `size` is at most 100.
- Bills, Payment Vouchers and Supplier Payments carry server-computed `actions { canEdit, canDelete, canRestore, blockedReason }` (`RecordActions`). Party and Supplier responses carry only `deleted`.
- List filters use `*Specifications` classes; summary figures come from aggregate queries and always exclude deleted records.
- Tests: JUnit 5 and AssertJ, typically `@SpringBootTest` + `@ActiveProfiles("test")` + `@Transactional` against a real MySQL; helpers live in `src/test/java/com/vira/support/TestData`. New behavior needs a test, and the whole suite must pass before a phase closes.

## Frontend conventions
Each rule is held by a test or a search; keep it that way.
- Only `src/api/client.js` calls `fetch`. `src/api/endpoints.js` has one function per backend endpoint (last argument is `opts`, e.g. `{ signal }`); screens import from there.
- React never calculates totals, balances, rates, document numbers or permissions. After any change call `reload()` instead of patching local state with guessed numbers. The one mirrored rule is the Party delete hint (balance not 0), and the backend still enforces it.
- Edit / Delete / Restore always goes through `<RowActions type="bill|voucher|supplierPayment|party|supplier" record onChanged />`. `components/records/recordTypes.js` is the one registry for numbering, edit mode, delete wording and API calls; a new record type is one new entry. Use `getRowState`; a missing `actions` object is never permission. Bills edit on the route `/bills/:id/edit`, the other four in a modal. Delete always asks first; Restore never asks.
- Icons are imported only in `components/ui/Icon.jsx`. No `localStorage` or `sessionStorage`, no `parseFloat` or `toFixed`. No CDN or external URL anywhere (the packaged app is offline).
- Money inputs are text; convert once at submit with `moneyOrNull`. Display money with `lib/format` (rupee sign, Indian grouping). Format dates from the ISO text and never build a `Date` from a backend date string (time-zone shifts); `new Date()` with no argument is used only for today, the greeting and the header clock (`lib/format.js`, `layout/Header.jsx`). The Settings date format changes displayed dates only.
- Build request bodies field by field. Never spread a fetched record into a request (unknown properties give `MALFORMED_REQUEST`). `api.delete` resolves `null` (204); `GET /api/health` returns plain text.
- `useApi` loaders must pass `signal` and list every dependency. A `SearchSelect` `search` prop must be a stable function (`useCallback`). Esc inside the picker closes only its list.
- Use `Link` / `useNavigate` with HashRouter, never `window.location.pathname`. The dev proxy targets `127.0.0.1`, not `localhost` (IPv6 on Windows). Keep `VITE_API_URL` unset in development: a leftover `frontend/.env` with it bypasses the proxy and hits CORS.
- Tests sit beside the code (`*.test.js`, `*.test.jsx`). In Vitest write `beforeEach(() => { mock.mockReset(); })` with braces; an arrow that returns the mock is run as a cleanup and times out.
- Build a new screen the way `pages/HomePage.jsx` does: `useApi` + `DataTable` + `RowActions`. `App.jsx` has a `PLACEHOLDERS` list of routes owned by later phases; replace an entry with the real page. The component gallery at `/#/dev/components` is development-only.

## Current status (update each phase)
- Phases 0 to 8 are done; Phase 9 (New Bill) is next. Detail: `VIRA_Progress_Report_Phase_0-7.docx` (the Phase 0 to 8 report is written after Phase 8 closes).
- Backend is complete (62 endpoints plus health, 16 tables, 129 tests). Phase 8 added the shop logo endpoints, the party and supplier summary endpoints, search by city or phone, and the Bill Top Line (`shop_profile.top_line`, added to `V1__init.sql`).
- Frontend (239 tests in 32 files) has live screens for Home, Items, Parties, the Selected Party page (four tabs and the Bill View dialog), Suppliers, Shop Profile, Settings (with Recalculate Balances) and the first-run Setup. Six routes are still placeholders: Dashboard, New Bill, Edit Bill, Daybook, Payment Vouchers and Part Search.
- Settled in Phase 8 (amendments A8 to A12): the shop logo is a file on the PC with `POST` / `GET` / `DELETE /api/shop-profile/logo` and its path in `shop_profile.logo_path` (the Phase 14 backup includes the logo folder); the Party Transaction History tab merges `GET /api/daybook?partyId=` and `GET /api/payment-vouchers?partyId=` by date; party and supplier lists search by name, city or phone through `q`; read-only summary endpoints feed the list tiles; the Bill Top Line is optional, up to 100 characters.
- Still to decide: Phase 9 live totals on New Bill (`POST /api/bills/preview` or a display-only calculator) and editing old bills whose Item was deleted (`BillLineRequest.itemId` is required). The Selected Party page's New Bill link is `/bills/new?partyId=ID`; the New Bill screen must read it. Phase 13: Electron preload exposing `window.vira.exit()`, and either `VITE_API_URL=http://127.0.0.1:8080/api` plus backend CORS or serving the build from Spring Boot.
- Housekeeping: fold amendments A1-A12 into the SRS and update the roadmap's counter wording (four counters became three).

## How to work with the owner
- Never add Claude attribution to commits or pull requests: no `Co-Authored-By`, no `Claude-Session` line, no "Generated with Claude Code". This overrides any default.
- Phase implementation is given one step at a time: complete file paths and full code, no explanations of why. The owner runs it and sends the output back; do not give the next step until the owner says to move on.
- When a step uses files from the owner's extracted zip folder, do not give shell or copy commands: list which files to copy and their destination paths in the repo.
- Commit at the end of every step from the repo root with a message like `Phase 7: application shell, routing and first-run gate`.
- Say plainly what was run and what was not (backend tests need MySQL).