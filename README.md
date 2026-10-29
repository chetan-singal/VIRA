# VIRA

VIRA is a desktop billing and business management application for bike spare-parts businesses.

## Stack
- React + Vite (frontend: Phase 7 foundation in place; the screens arrive in Phases 8–11)
- Java 17 + Spring Boot 3.5 (backend)
- MySQL 8 + Flyway migrations
- Electron (desktop shell, to be added after the web application is stable)

## Modules
Home, Dashboard, New Bill, Daybook, Parties, Items, Suppliers, Payment Vouchers, Part Search, Shop Profile, Settings, Exit.

## Business rules
- Customers: Cash and Party only.
- Items: MRP Item and Net Rate Item only.
- No GST/tax module.
- No stock quantity tracking.
- One combined Cash in Hand figure.
- Payment modes (Payment Vouchers and Supplier Payments only): Cash and Online.
- Cash in Hand and Party Current Balance are stored values, changed only through `LedgerService` using reverse-then-apply on every create, edit, delete and restore.
- Bill, Payment Voucher, Supplier Payment, Party and Supplier are soft-deleted and can be restored. Item is the only permanent delete.
- Backend listens on 127.0.0.1 only.

## Project status
| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Project setup | Done |
| 1 | Database schema | Done |
| 2 | Items and pricing | Done |
| 3 | Ledger core | Done |
| 4 | Parties, Bills, Suppliers: create | Done |
| 5 | Edit, Delete, Restore, Recalculate Balances | Done |
| 6 | Remaining read APIs: Daybook, Dashboard, Part Search, Shop Profile, Settings, first-run setup | Done |
| 7 | Frontend foundation: shell, API client, shared Edit / Delete / Restore control | Done |
| 8-14 | Master screens, New Bill, lists, Dashboard and printing, Electron, installer | Not started |

## Backend API (implemented)
| Resource | Endpoints |
| --- | --- |
| Setup / Shop Profile | `GET /api/setup/status`, `POST /api/setup`, `GET/PUT /api/shop-profile` |
| Settings | `GET/PUT /api/settings` |
| Items | `GET/POST /api/items`, `GET/PUT/DELETE /api/items/{id}`, `GET/DELETE /api/items/{id}/rate-overrides` |
| Categories / Bikes | `GET/POST /api/part-categories`, `GET/POST /api/bikes` |
| Pricing | `GET /api/pricing/quote`, `POST /api/pricing/permanent-changes` |
| Part Search | `GET /api/part-search` |
| Parties | `GET/POST /api/parties` (`q`, `deleted`), `GET/PUT/DELETE /api/parties/{id}`, `POST /api/parties/{id}/restore`, `GET /api/parties/{id}/item-rates`, `GET /api/parties/{id}/balance-summary` |
| Suppliers | `GET/POST /api/suppliers` (`q`, `deleted`), `GET/PUT/DELETE /api/suppliers/{id}`, `POST /api/suppliers/{id}/restore` |
| Bills | `POST /api/bills`, `GET/PUT/DELETE /api/bills/{id}`, `POST /api/bills/{id}/restore` |
| Payment Vouchers | `GET/POST /api/payment-vouchers`, `GET/PUT/DELETE /api/payment-vouchers/{id}`, `POST /api/payment-vouchers/{id}/restore` |
| Supplier Payments | `GET/POST /api/supplier-payments`, `GET/PUT/DELETE /api/supplier-payments/{id}`, `POST /api/supplier-payments/{id}/restore` |
| Daybook / Dashboard | `GET /api/daybook`, `GET /api/dashboard` |
| Maintenance | `GET /api/maintenance/recalculate-balances`, `POST /api/maintenance/recalculate-balances/cash`, `POST /api/maintenance/recalculate-balances/parties/{partyId}` |

## Running locally
Backend (from `backend/`):

```powershell
./mvnw spring-boot:run
./mvnw -B verify
```

Environment variables: `DB_URL` (default `jdbc:mysql://localhost:3306/vira`), `DB_USERNAME` (default `root`), `DB_PASSWORD`. Tests use the `vira_it` database on `127.0.0.1:3306`.

Frontend (from `frontend/`):

```powershell
npm ci
npm run dev      # http://localhost:5173; /api is proxied to the backend on 127.0.0.1:8080
npm test
npm run build
```

## Docs
Requirements and roadmap live in `docs/`.