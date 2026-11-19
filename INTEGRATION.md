# Frontend ↔ API integration

The frontend is now **stateful** and talks to the `stock-api` backend. Every page
that used mock data now reads/writes live data, and a **login page** has been added.

## Configure the API URL

`.env` (already created):

```
VITE_API_URL=http://localhost:3000
```

Change this if your backend runs elsewhere.

## Run

**Backend** (in the stock-api folder):

```bash
npm install
# create the MySQL database + import schema.sql, set your .env (DB creds, GEMINI key optional)
npm run seed      # seeds default admin / admin
npm run dev       # http://localhost:3000
```

**Frontend** (this folder):

```bash
npm install
npm run dev       # http://localhost:5173
```

Open the app, you'll land on **/login**. Sign in with **admin / admin**.

## What was wired

- **Auth**: `context/AuthContext` (persists to localStorage), `Login` page, `ProtectedRoute`.
  The logged-in user is used as `user_id` on new sales/purchases and shown in the sidebar.
- **API layer**: `lib/http.ts` (fetch + `{success,data}` envelope unwrap + errors),
  `lib/api.ts` (typed modules per resource), `types/api.ts`, `hooks/useApi.ts`.
- **Products**: live list + stats, search, status/sort filters, create, delete, favorite toggle.
- **Clients / Fournisseurs**: shared `PartenairePage` — list + stats, create, delete,
  and a credit ledger dialog (`VersementDialog`) to add crédits / versements.
- **Users**: live list + stats, create (role `vendeur+` maps to `vendeur_plus`), delete, credit ledger.
- **POS**: real products (+favorites), real client list, barcode lookup, and **Valider** posts a
  sale to `POST /api/ventes` then refreshes stock.
- **Achats**: real products + fournisseurs, build lines, **Enregistrer l'achat** posts to `POST /api/achats`.
- **Sales / Purchases history**: live lists with date + numéro filters, detail dialog, delete (reverses stock).
- **Statistics**: all charts/KPIs come from `GET /api/stats` with the Jour/Semaine/Mois/Année selector.

## Desktop app (Electron)

The frontend also runs as a desktop app in a single **frameless, fullscreen** window
with only a **close** button (no minimize / maximize / resize).

Dev (hot reload):

```bash
npm install
npm run electron:dev
```

Package a distributable (output in `release/`):

```bash
npm run electron:build      # Windows .exe (NSIS) / Linux AppImage / macOS .dmg
```

- `electron/main.cjs` — window created with `frame:false, fullscreen:true, resizable:false, maximizable:false, minimizable:false`.
- `electron/preload.cjs` — exposes a safe `window.electronAPI.quit()`.
- `src/components/WindowControls.tsx` — the floating close button (rendered only inside Electron; invisible in the browser).
- Routing uses `HashRouter` under Electron and `vite.config.ts` sets `base:"./"` so the app loads from `file://`.

## Notes

- The category dropdown in the product form is left inert because the API exposes no
  category-list endpoint. Add one server-side to enable it.
- The bill-scan flow (Gemini) was left out of the purchase page; `POST /api/bills/*` can be wired later.
