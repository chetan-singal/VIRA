# VIRA

VIRA is a desktop billing and business management application for bike spare-parts businesses.

## Stack
- React + Vite (frontend, skeleton only so far)
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
| 5 | Edit, Delete, Restore, Recalculate Balances | Steps 0-5 done, Step 6 (close-out) pending |
| 6-14 | Remaining read APIs, frontend, Electron, installer | Not started |

## Backend API (implemented)
| Resource | Endpoints |
| --- | --- |
| Items | `GET/POST /api/items`, `GET/PUT/DELETE /api/items/{id}`, `GET/DELETE /api/items/{id}/rate-overrides` |
| Categories / Bikes | `GET/POST /api/part-categories`, `GET/POST /api/bikes` |
| Pricing | `GET /api/pricing/quote`, `POST /api/pricing/permanent-changes` |
| Parties | `GET/POST /api/parties`, `GET /api/parties/{id}`, `DELETE /api/parties/{id}`, `POST /api/parties/{id}/restore` |
| Suppliers | `GET/POST /api/suppliers`, `GET /api/suppliers/{id}`, `DELETE /api/suppliers/{id}`, `POST /api/suppliers/{id}/restore` |
| Bills | `POST /api/bills`, `PUT/DELETE /api/bills/{id}`, `POST /api/bills/{id}/restore` |
| Payment Vouchers | `POST /api/payment-vouchers`, `PUT/DELETE /api/payment-vouchers/{id}`, `POST /api/payment-vouchers/{id}/restore` |
| Supplier Payments | `POST /api/supplier-payments`, `PUT/DELETE /api/supplier-payments/{id}`, `POST /api/supplier-payments/{id}/restore` |
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
npm run dev
```

## Docs
Requirements and roadmap live in `docs/`.