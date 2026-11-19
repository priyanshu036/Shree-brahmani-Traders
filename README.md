# SHREE BRAHMANI TRADERS

**Construction Material Business Management System**

A complete, offline-first business management web app for a construction material
trading business — Bricks, Sand (Ret), Kapchi, Grit and Cement.

Built with **HTML5, CSS3 and Vanilla JavaScript only**. No React, no Angular, no
Vue, no Node.js, no PHP, no database server. All data is stored in **Google
Sheets** through a Google Apps Script Web App.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Login](#login)
3. [Features](#features)
4. [Project Structure](#project-structure)
5. [Google Sheets Setup](#google-sheets-setup-critical)
6. [Data Model](#data-model)
7. [How Data Flows](#how-data-flows)
8. [Invoices & Printing](#invoices--printing)
9. [Tech Stack](#tech-stack)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

There is **no build step** and **no server required**.

1. Open the project folder.
2. Double-click **`login.html`** (or right-click → Open with → your browser).
3. Sign in with the credentials below.

> The app works immediately using browser LocalStorage. To persist data to
> Google Sheets, complete the [Google Sheets Setup](#google-sheets-setup-critical)
> section — it takes about 3 minutes.

---

## Login

| Field    | Value   |
| -------- | ------- |
| Username | `admin` |
| Password | `admin` |

Sessions last 12 hours, or 30 days if **Remember me** is checked.

---

## Features

### Dashboard
- 8 KPI cards — total sales, purchases, expenses, gross profit, net profit,
  amount received, customer pending, supplier outstanding
- Sales vs Purchases grouped bar chart
- Profit trend line chart
- Product-wise sales doughnut chart
- Stock level horizontal bar chart
- Low-stock alert table
- Recent sales and purchases
- Top customers and top suppliers

### Transactions
| Module        | What it does |
| ------------- | ------------ |
| **Purchases** | Record material bought from suppliers. Tracks quantity, rate, transport, loading and other expenses. Auto-calculates base amount, total cost and amount due. |
| **Sales**     | Record material sold to customers. Auto-generates invoice numbers (`SBT/2025/0001`). Handles discount, transportation, GST and payment status. Validates available stock before saving. |
| **Expenses**  | Track operating costs across 10 categories (Transportation, Loading/Unloading, Fuel, Salary, Rent, Electricity, Office, Repair & Maintenance, GST/Tax, Miscellaneous). |
| **Payments**  | Record money received from customers and paid to suppliers, with mode (Cash, UPI, Bank Transfer, Cheque, Credit) and reference number. |

### Masters
| Module        | What it does |
| ------------- | ------------ |
| **Products**  | Material master with unit, purchase rate, selling rate, minimum stock level, HSN code and GST rate. Shows live margin and current stock. |
| **Suppliers** | Supplier master with GSTIN. Per-supplier ledger, outstanding balance and a "Make Payment" action. |
| **Customers** | Customer master with GSTIN. Per-customer ledger, pending amount and a "Receive Payment" action. |
| **Stock**     | Live stock per material (purchased − sold ± adjustments). Stock value, low-stock filter, full movement history and manual stock adjustments. |

### Analytics
| Module            | What it does |
| ----------------- | ------------ |
| **Profit & Loss** | Date-ranged P&L statement: Revenue → less COGS → Gross Profit → less Operating Expenses (with category breakdown) → Net Profit → Net Margin. Includes expense doughnut chart and product-wise profitability table. |
| **Reports**       | 8 report types — Purchases, Sales, Profit & Loss, Supplier Ledger, Customer Ledger, Stock, Payments, Expenses. Each exportable to CSV or Excel and printable. |

### System
| Module       | What it does |
| ------------ | ------------ |
| **Settings** | Business profile (name, owner, mobile, email, GSTIN, PAN, address, bank details, currency), invoice & tax defaults, Google Sheets connection, and data management (backup, restore, clear transactions, factory reset). |

### Invoices
- Professional A4 tax invoice generated from any sale
- Business header with logo, GSTIN and contact details
- Billed-to block, item table with HSN, amount in words (Indian numbering)
- Bank details, GST breakdown, amount paid and balance due
- Print-ready and PDF-ready (Ctrl+P → Save as PDF)

---

## Project Structure

```
Shree brahmani Traders/
│
├── login.html                  Login page (white + green theme)
├── dashboard.html              Overview
├── purchases.html              Purchase entries
├── sales.html                  Sales entries
├── expenses.html               Expense tracking
├── payments.html               Payments in / out
├── products.html               Material master
├── suppliers.html              Supplier master + ledgers
├── customers.html              Customer master + ledgers
├── stock.html                  Live stock + adjustments
├── profit-loss.html            P&L statement
├── reports.html                8 report types
├── settings.html               Configuration + Google Sheets
├── invoice.html                Printable tax invoice
│
├── assets/
│   ├── css/
│   │   ├── style.css           Design system (navy + orange theme)
│   │   └── invoice.css         Standalone invoice / print styles
│   └── js/
│       ├── config.js           App config, nav, entities, defaults
│       ├── utils.js            Formatters, dates, CSV/Excel export, helpers
│       ├── store.js            LocalStorage store + Google Sheets client + calc engine
│       ├── ui.js               Toasts, modals, tables, forms, date ranges
│       ├── charts.js           Custom canvas charts (no Chart.js)
│       ├── app.js              Shell, sidebar, auth guard, page bootstrap
│       └── pages/
│           ├── dashboard.js
│           ├── products.js
│           ├── purchases.js
│           ├── sales.js
│           ├── suppliers.js
│           ├── customers.js
│           ├── stock.js
│           ├── expenses.js
│           ├── payments.js
│           ├── profit-loss.js
│           ├── reports.js
│           ├── settings.js
│           └── invoice.js
│
└── google-apps-script/
    └── Code.gs                 Google Sheets backend (paste into Apps Script)
```

---

## Google Sheets Setup (critical)

This is the only database. Follow these steps once.

> **Already configured?** The Web App URL is pre-set in `assets/js/config.js`
> (`SBT.config.apiUrl`). If you are using the existing deployment, skip to
> [Step 7](#step-7--connect-the-app) — the app will connect automatically.
> To use your own spreadsheet, follow all steps below and replace the URL.

### Step 1 — Create the spreadsheet
1. Go to [sheets.new](https://sheets.new) and create a blank spreadsheet.
2. Name it something like **SBT Database**.

### Step 2 — Open the script editor
1. In the spreadsheet menu: **Extensions → Apps Script**.
2. Delete the default `function myFunction() {}` code.

### Step 3 — Paste the backend
1. Open `google-apps-script/Code.gs` from this project.
2. Copy the entire file and paste it into the Apps Script editor.
3. Click **Save** (💾) and name the project `SBT API`.

### Step 4 — Create the sheets (optional but recommended)
In the Apps Script editor, select `setupSheets` from the function dropdown and
click **Run**. Authorize when prompted. This creates all 9 sheets with styled
headers.

Optionally run `seedDefaultProducts` to pre-fill the 5 default materials.

### Step 5 — Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Click the gear icon and choose **Web app**.
3. Fill in:
   - **Description:** `SBT API`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**.
5. Click **Authorize access** → choose your Google account → **Allow**.

> "Anyone" access is required so the browser can reach the endpoint without a
> Google login. The URL is unguessable and only you know it.

### Step 6 — Copy the Web App URL
Copy the URL that ends in **`/exec`**. It looks like:

```
https://script.google.com/macros/s/AKfycb.../exec
```

### Step 7 — Connect the app
The app ships with the Web App URL already set in `assets/js/config.js`, so it
connects automatically. To point it at a different deployment:

1. Open the app → **Settings** page.
2. Scroll to **Google Sheets Connection**.
3. Paste the URL into the field.
4. Click **Save**.
5. Click **Test Connection** — you should see a green "Connected" badge.
6. Click **Push All** to send existing local data to the sheet, or **Pull All**
   to load data from the sheet.

> **Empty-sheet safety:** on first run the sheet has no rows. The app detects
> this and pushes your local data up instead of wiping it, so your default
> products and settings are never lost.

### Step 8 — Verify
Open your Google Sheet. You should see the tabs `products`, `suppliers`,
`customers`, `purchases`, `sales`, `expenses`, `payments`, `adjustments` and
`settings`, each with a navy header row.

From now on, every add / edit / delete in the app is written to Google Sheets.

---

## Data Model

Each entity is a sheet. Column order is fixed by `SCHEMAS` in `Code.gs`.

| Sheet         | Columns |
| ------------- | ------- |
| `products`    | id, name, unit, purchaseRate, sellingRate, minStock, hsn, gst, openingStock, active, createdAt, updatedAt |
| `suppliers`   | id, name, mobile, gstin, address, notes, createdAt, updatedAt |
| `customers`   | id, name, mobile, gstin, address, notes, createdAt, updatedAt |
| `purchases`   | id, date, supplierName, supplierMobile, materialName, quantity, unit, purchaseRate, transportCharges, loadingCharges, otherExpenses, paymentStatus, paidAmount, notes, createdAt, updatedAt |
| `sales`       | id, date, invoiceNo, customerName, customerMobile, materialName, quantity, unit, sellingRate, discount, transportCharges, gstApplicable, gstRate, paymentStatus, paidAmount, totalAmount, notes, createdAt, updatedAt |
| `expenses`    | id, date, category, description, amount, paymentMode, paidTo, reference, notes, createdAt, updatedAt |
| `payments`    | id, date, partyType, partyName, mobile, amount, mode, reference, notes, direction, createdAt, updatedAt |
| `adjustments` | id, date, materialName, quantity, unit, reason, notes, createdAt, updatedAt |
| `settings`    | key, value |

### API actions

All requests are `POST` with a JSON body `{ action, payload }`.

| Action         | Payload | Purpose |
| -------------- | ------- | ------- |
| `ping`         | — | Health check |
| `getAll`       | — | Return every entity plus settings |
| `insert`       | `{ entity, record }` | Add a record (upserts if the id exists) |
| `update`       | `{ entity, record }` | Merge-patch a record by `record.id` |
| `delete`       | `{ entity, record: { id } }` | Delete a record by id |
| `saveAll`      | `{ data: { entity: [...] } }` | Full replace of all sheets |
| `batch`        | `{ operations: [...] }` | Run several operations in one call |
| `saveSettings` | `{ record: {...} }` | Write the settings sheet |

---

## How Data Flows

The app is **offline-first**. It never blocks on the network.

```
User action
    │
    ▼
LocalStorage  ──►  UI updates instantly
    │
    ▼
Google Sheets sync (background)
    │
    ├── success → queue cleared
    └── failure → queued in sbt_v1_sync_queue, retried later
```

- **LocalStorage** (`sbt_v1_db`) is the working copy. Every read comes from here,
  so the app is instant and works with no internet.
- **Google Sheets** is the durable store. Writes are pushed in the background.
- **Sync queue** (`sbt_v1_sync_queue`) holds failed writes. Use **Settings →
  Flush Queue** to retry them manually.
- **Push All** uploads the entire local dataset. **Pull All** replaces local data
  with the sheet contents.

> Because LocalStorage is per-browser, use **Push All** on one machine and
> **Pull All** on another to move data between devices.

---

## Invoices & Printing

1. Go to **Sales** and click the invoice icon on any row.
2. The invoice opens in `invoice.html?id=<saleId>`.
3. Click **Print** (or press `Ctrl+P`).
4. Choose **Save as PDF** to download, or select a printer.

The print stylesheet sets A4 with 10 mm margins and hides all action buttons.

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Markup | HTML5 |
| Styling | CSS3 (custom design system, CSS variables, flexbox, grid) |
| Logic | Vanilla JavaScript (ES5/ES6, IIFE modules, no framework) |
| Icons | Bootstrap Icons 1.11.3 (CDN) |
| Grid utilities | Bootstrap 5.3.3 (CDN) |
| Charts | Custom canvas renderer (`assets/js/charts.js`) |
| Storage | Browser LocalStorage |
| Database | **Google Sheets** via Google Apps Script Web App |

**No** React, Angular, Vue, jQuery, Node.js, PHP, MySQL, MongoDB or any other
database or backend framework is used.

### Browser support

Chrome, Edge, Firefox and Safari (latest versions). Requires JavaScript and
LocalStorage. Internet is needed only for the CDN assets and Google Sheets sync.

---

## Troubleshooting

**"Test Connection" fails**
- Confirm the URL ends with `/exec`, not `/dev`.
- Re-check the deployment: **Execute as: Me**, **Who has access: Anyone**.
- After editing `Code.gs`, you must create a **new deployment** (or edit the
  existing one) for changes to take effect.

**Data is not appearing in the sheet**
- Open **Settings** and check the sync status badge.
- Click **Flush Queue** to retry failed writes.
- Click **Push All** to force a full upload.

**Login redirects back to the login page**
- Clear site data for the page and sign in again. The session key is
  `sbt_v1_session`.

**Charts are blank**
- Charts render on canvas after the page mounts. Resize the window to force a
  redraw. If they stay blank, check the browser console for errors.

**Stock numbers look wrong**
- Stock = purchases − sales ± adjustments. Verify entries in **Stock → History**
  for the material.

**I want to start over**
- **Settings → Data Management → Factory Reset** clears everything locally.
- To clear the sheet too, run `clearAllData()` from the Apps Script editor.

---

## License

Private project for Shree Brahmani Traders.
