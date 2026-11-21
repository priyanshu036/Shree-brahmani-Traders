/* ==========================================================================
   SHREE BRAHMANI TRADERS — Data Store
   Offline-first LocalStorage cache + optional Google Sheets sync
   ========================================================================== */
(function (global) {
  "use strict";

  const SBT = (global.SBT = global.SBT || {});
  const U = SBT.utils;
  const CFG = SBT.config;

  const DB_KEY = CFG.storagePrefix + "db";
  const QUEUE_KEY = CFG.storagePrefix + "sync_queue";

  function tr(key) {
    return SBT.i18n && typeof SBT.i18n.t === "function" ? SBT.i18n.t(key) : key;
  }

  /* ==========================================================================
     GOOGLE SHEETS API CLIENT
     ========================================================================== */
  const sheets = (SBT.sheets = {
    online: false,
    lastSync: null,
    lastError: null,
    _busy: false,

    get enabled() {
      return !!(CFG.apiUrl && CFG.apiUrl.indexOf("http") === 0);
    },

    /* Low-level POST to the Apps Script Web App.
       Uses text/plain to avoid CORS preflight. */
    async call(action, payload) {
      if (!this.enabled) throw new Error(tr("err.apiNotConfigured"));

      const body = JSON.stringify({
        action: action,
        payload: payload || {},
        token: CFG.apiUrl ? "" : ""
      });

      const res = await fetch(CFG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: body,
        redirect: "follow"
      });

      if (!res.ok) throw new Error("Network error: HTTP " + res.status);

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error(tr("err.invalidResponse"));
      }

      if (json && json.ok === false) {
        throw new Error(json.error || tr("err.requestFailed"));
      }
      return json;
    },

    /* Pull every sheet into the local store.
       Safety rule: an EMPTY remote sheet must never wipe local data. On a
       fresh deployment the sheet has no rows yet, so we keep the local
       (seeded) data and push it up instead. */
    async pull() {
      if (!this.enabled) return false;
      this._busy = true;
      try {
        const res = await this.call("getAll", {});
        const data = res.data || {};

        /* Is the remote sheet completely empty? */
        const remoteHasData = CFG.entities.some(function (entity) {
          return Array.isArray(data[entity]) && data[entity].length > 0;
        });

        if (!remoteHasData) {
          /* Fresh sheet — seed it from local data instead of wiping local. */
          this.online = true;
          this.lastError = null;
          this.lastSync = new Date().toISOString();
          this._busy = false;
          await this.pushAll();
          return true;
        }

        /* The deployed Apps Script may still use an older schema without the
           purchaseId column. Remember local links so a pull cannot silently
           drop them before the sheet is migrated. */
        const localLinks = {};
        ["sales", "expenses"].forEach(function (entity) {
          localLinks[entity] = {};
          (SBT.store.db[entity] || []).forEach(function (r) {
            if (r && r.id && r.purchaseId) localLinks[entity][String(r.id)] = String(r.purchaseId);
          });
        });

        CFG.entities.forEach(function (entity) {
          if (!Array.isArray(data[entity])) return;
          /* Never replace a populated local list with an empty remote one. */
          if (data[entity].length === 0 && SBT.store.db[entity].length > 0) return;
          SBT.store.db[entity] = data[entity];
        });

        ["sales", "expenses"].forEach(function (entity) {
          (SBT.store.db[entity] || []).forEach(function (r) {
            if (!r || !r.id) return;
            if (r.purchaseId) return;
            const kept = localLinks[entity][String(r.id)];
            if (kept) r.purchaseId = kept;
          });
        });

        if (data.settings && typeof data.settings === "object" &&
            Object.keys(data.settings).length > 0) {
          SBT.store.db.settings = Object.assign({}, CFG.defaultSettings, data.settings);
        }

        SBT.store.normalize(SBT.store.db);
        SBT.store.persistLocal();
        this.online = true;
        this.lastError = null;
        this.lastSync = new Date().toISOString();
        return true;
      } catch (err) {
        this.online = false;
        this.lastError = err.message;
        return false;
      } finally {
        this._busy = false;
      }
    },

    /* Push a single record change */
    async push(action, entity, record) {
      if (!this.enabled) return false;
      try {
        await this.call(action, { entity: entity, record: record });
        this.online = true;
        this.lastError = null;
        this.lastSync = new Date().toISOString();
        return true;
      } catch (err) {
        this.online = false;
        this.lastError = err.message;
        SBT.store.enqueue({ action: action, entity: entity, record: record });
        return false;
      }
    },

    /* Push the whole local database (used by Settings → Sync Now) */
    async pushAll() {
      if (!this.enabled) return false;
      this._busy = true;
      try {
        await this.call("saveAll", { data: SBT.store.db });
        this.online = true;
        this.lastError = null;
        this.lastSync = new Date().toISOString();
        SBT.store.clearQueue();
        return true;
      } catch (err) {
        this.online = false;
        this.lastError = err.message;
        return false;
      } finally {
        this._busy = false;
      }
    },

    /* Retry queued writes */
    async flushQueue() {
      if (!this.enabled) return false;
      const queue = SBT.store.getQueue();
      if (!queue.length) return true;
      try {
        await this.call("batch", { operations: queue });
        SBT.store.clearQueue();
        this.online = true;
        this.lastError = null;
        this.lastSync = new Date().toISOString();
        return true;
      } catch (err) {
        this.online = false;
        this.lastError = err.message;
        return false;
      }
    }
  });

  /* ==========================================================================
     STORE
     ========================================================================== */
  const store = (SBT.store = {
    db: null,
    settings: null,
    ready: false,
    _listeners: [],

    /* ---------- Init ---------- */
    init() {
      this.db = this.loadLocal();
      this.settings = this.db.settings;
      this.ready = true;
      this.emit("ready", this.db);
      return this.db;
    },

    loadLocal() {
      let raw = null;
      try {
        raw = localStorage.getItem(DB_KEY);
      } catch (e) {
        raw = null;
      }

      let db = null;
      if (raw) {
        try {
          db = JSON.parse(raw);
        } catch (e) {
          db = null;
        }
      }

      if (!db || typeof db !== "object") {
        db = this.seed();
      }

      /* Ensure every entity array exists */
      CFG.entities.forEach(function (entity) {
        if (!Array.isArray(db[entity])) db[entity] = [];
      });

      /* Backfill the link key on legacy purchase rows. Every purchase, sale
         and expense carries the same purchaseId so the three can be tied
         together. Older purchases only have their own id. */
      this.normalize(db);

      db.settings = Object.assign({}, CFG.defaultSettings, db.settings || {});
      db.meta = Object.assign({ createdAt: new Date().toISOString() }, db.meta || {});

      return db;
    },

    /* Legacy rows may predate the purchaseId link key. Every purchase must
       carry one so sales and expenses can point at it. Google Sheets returns
       numbers for numeric-looking ids, so the key is always stored as a
       string to keep comparisons reliable. */
    normalize(db) {
      (db.purchases || []).forEach(function (p) {
        p.purchaseId = String(p.purchaseId || p.id);
      });
      ["sales", "expenses"].forEach(function (entity) {
        (db[entity] || []).forEach(function (r) {
          if (r.purchaseId === undefined || r.purchaseId === null || r.purchaseId === "") {
            r.purchaseId = "";
          } else {
            r.purchaseId = String(r.purchaseId);
          }
        });
      });
      return db;
    },

    seed() {
      const now = new Date().toISOString();
      const products = CFG.defaultProducts.map(function (p, i) {
        return {
          id: "prod_" + (i + 1),
          name: p.name,
          unit: p.unit,
          purchaseRate: p.purchaseRate,
          sellingRate: p.sellingRate,
          minStock: p.minStock,
          hsn: p.hsn,
          gst: p.gst,
          openingStock: 0,
          active: true,
          createdAt: now,
          updatedAt: now
        };
      });

      return {
        products: products,
        suppliers: [],
        customers: [],
        purchases: [],
        sales: [],
        expenses: [],
        payments: [],
        adjustments: [],
        settings: Object.assign({}, CFG.defaultSettings),
        meta: { createdAt: now, seeded: true }
      };
    },

    persistLocal() {
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(this.db));
        return true;
      } catch (e) {
        console.error("LocalStorage write failed:", e);
        return false;
      }
    },

    /* ---------- Events ---------- */
    on(event, handler) {
      this._listeners.push({ event: event, handler: handler });
    },

    emit(event, payload) {
      this._listeners.forEach(function (l) {
        if (l.event === event) {
          try { l.handler(payload); } catch (e) { console.error(e); }
        }
      });
    },

    /* ---------- Sync queue ---------- */
    getQueue() {
      try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      } catch (e) {
        return [];
      }
    },

    enqueue(op) {
      const queue = this.getQueue();
      queue.push(op);
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-200)));
      } catch (e) { /* ignore */ }
    },

    clearQueue() {
      try { localStorage.removeItem(QUEUE_KEY); } catch (e) { /* ignore */ }
    },

    /* ---------- Generic CRUD ---------- */
    list(entity) {
      return (this.db[entity] || []).slice();
    },

    get(entity, id) {
      return (this.db[entity] || []).find(function (r) { return r.id === id; }) || null;
    },

    insert(entity, record) {
      const now = new Date().toISOString();
      const row = Object.assign({}, record, {
        id: record.id || U.uid(entity.slice(0, 4)),
        createdAt: record.createdAt || now,
        updatedAt: now
      });
      /* A purchase's own id is its link key unless one was supplied. */
      if (entity === "purchases") row.purchaseId = String(row.purchaseId || row.id);
      if ((entity === "sales" || entity === "expenses") && row.purchaseId) {
        row.purchaseId = String(row.purchaseId);
      }
      this.db[entity].unshift(row);
      this.persistLocal();
      this.emit("change", { entity: entity, action: "insert", record: row });
      sheets.push("insert", entity, row);
      return row;
    },

    update(entity, id, patch) {
      const idx = this.db[entity].findIndex(function (r) { return r.id === id; });
      if (idx === -1) return null;
      const row = Object.assign({}, this.db[entity][idx], patch, {
        updatedAt: new Date().toISOString()
      });
      if (entity === "purchases") row.purchaseId = String(row.purchaseId || row.id);
      if ((entity === "sales" || entity === "expenses") && row.purchaseId) {
        row.purchaseId = String(row.purchaseId);
      }
      this.db[entity][idx] = row;
      this.persistLocal();
      this.emit("change", { entity: entity, action: "update", record: row });
      sheets.push("update", entity, row);
      return row;
    },

    remove(entity, id) {
      const idx = this.db[entity].findIndex(function (r) { return r.id === id; });
      if (idx === -1) return false;
      const row = this.db[entity][idx];
      this.db[entity].splice(idx, 1);
      this.persistLocal();
      this.emit("change", { entity: entity, action: "remove", record: row });
      sheets.push("delete", entity, { id: id });
      return true;
    },

    /* ---------- Settings ---------- */
    saveSettings(patch) {
      this.db.settings = Object.assign({}, this.db.settings, patch);
      this.settings = this.db.settings;
      this.persistLocal();
      this.emit("settings", this.db.settings);
      sheets.push("saveSettings", "settings", this.db.settings);
      return this.db.settings;
    },

    nextInvoiceNumber() {
      const s = this.db.settings;
      const year = new Date().getFullYear();
      const seq = String(s.invoiceCounter || 1).padStart(4, "0");
      const num = (s.invoicePrefix || "SBT") + "/" + year + "/" + seq;
      this.saveSettings({ invoiceCounter: U.num(s.invoiceCounter, 1) + 1 });
      return num;
    },

    /* ---------- Reset ---------- */
    resetAll() {
      this.db = this.seed();
      this.settings = this.db.settings;
      this.persistLocal();
      this.clearQueue();
      this.emit("reset", this.db);
      sheets.pushAll();
    },

    clearTransactions() {
      ["purchases", "sales", "expenses", "payments", "adjustments"].forEach(function (e) {
        SBT.store.db[e] = [];
      });
      this.persistLocal();
      this.emit("reset", this.db);
      sheets.pushAll();
    },

    /* ---------- Import / Export ---------- */
    exportJSON() {
      return JSON.stringify(this.db, null, 2);
    },

    importJSON(json) {
      const data = typeof json === "string" ? JSON.parse(json) : json;
      if (!data || typeof data !== "object") throw new Error(tr("err.invalidBackup"));
      CFG.entities.forEach(function (entity) {
        if (Array.isArray(data[entity])) SBT.store.db[entity] = data[entity];
      });
      if (data.settings) {
        SBT.store.db.settings = Object.assign({}, CFG.defaultSettings, data.settings);
        SBT.store.settings = SBT.store.db.settings;
      }
      this.normalize(this.db);
      this.persistLocal();
      this.emit("reset", this.db);
      sheets.pushAll();
      return true;
    }
  });

  /* ==========================================================================
     BUSINESS CALCULATIONS
     ========================================================================== */
  const calc = (SBT.calc = {
    /* ---------- Purchase ---------- */
    purchaseBase(row) {
      return U.num(row.quantity) * U.num(row.purchaseRate);
    },

    purchaseExpenses(row) {
      return U.num(row.transportCharges) + U.num(row.loadingCharges) + U.num(row.otherExpenses);
    },

    purchaseTotal(row) {
      return U.round(this.purchaseBase(row) + this.purchaseExpenses(row));
    },

    purchasePaid(row) {
      if (row.paymentStatus === "Paid") return this.purchaseTotal(row);
      return U.num(row.paidAmount);
    },

    purchaseDue(row) {
      return U.round(Math.max(0, this.purchaseTotal(row) - this.purchasePaid(row)));
    },

    /* ---------- Sales ---------- */
    salesBase(row) {
      return U.num(row.quantity) * U.num(row.sellingRate);
    },

    salesGross(row) {
      return U.round(this.salesBase(row) - U.num(row.discount));
    },

    salesGst(row) {
      if (!row.gstApplicable) return 0;
      return U.round(this.salesGross(row) * U.num(row.gstRate) / 100);
    },

    salesFinal(row) {
      return U.round(this.salesGross(row) + this.salesGst(row) + U.num(row.transportCharges));
    },

    /* Revenue earned from the sale, EXCLUDING GST.
       GST collected is a pass-through liability, not income, so it must never
       be counted as profit. Transportation charged to the customer IS income. */
    salesNetRevenue(row) {
      return U.round(this.salesGross(row) + U.num(row.transportCharges));
    },

    salesPaid(row) {
      if (row.paymentStatus === "Paid") return this.salesFinal(row);
      return U.num(row.paidAmount);
    },

    salesDue(row) {
      return U.round(Math.max(0, this.salesFinal(row) - this.salesPaid(row)));
    },

    /* ---------- Cost basis (weighted average purchase rate) ---------- */
    avgPurchaseRate(productName) {
      const purchases = store.db.purchases.filter(function (p) {
        return p.materialName === productName;
      });
      if (!purchases.length) {
        const product = store.db.products.find(function (p) { return p.name === productName; });
        return product ? U.num(product.purchaseRate) : 0;
      }
      const totalQty = U.sum(purchases, function (p) { return U.num(p.quantity); });
      const totalCost = U.sum(purchases, function (p) { return calc.purchaseTotal(p); });
      return totalQty > 0 ? totalCost / totalQty : 0;
    },

    /* ---------- Profit per sale ---------- */
    /* Cost of the goods sold. Transportation is NOT included here: the
       transport charged to the customer is already part of salesNetRevenue,
       so adding it again would double-count it. */
    saleCost(row) {
      const rate = this.avgPurchaseRate(row.materialName);
      return U.round(U.num(row.quantity) * rate);
    },

    /* Gross profit = revenue (ex-GST) minus material cost. */
    saleGrossProfit(row) {
      return U.round(this.salesNetRevenue(row) - this.saleCost(row));
    },

    /* Net profit per sale. Operating expenses are deducted at the aggregate
       level in totals(), not per row. */
    saleNetProfit(row) {
      return U.round(this.salesNetRevenue(row) - this.saleCost(row));
    },

    saleMargin(row) {
      const revenue = this.salesNetRevenue(row);
      if (revenue <= 0) return 0;
      return U.round((this.saleNetProfit(row) / revenue) * 100, 2);
    },

    /* ---------- Stock ---------- */
    stockByProduct() {
      const map = {};

      store.db.products.forEach(function (p) {
        map[p.name] = {
          name: p.name,
          unit: p.unit,
          minStock: U.num(p.minStock),
          purchased: 0,
          sold: 0,
          adjusted: 0,
          opening: U.num(p.openingStock),
          stock: U.num(p.openingStock),
          purchaseValue: 0,
          salesValue: 0
        };
      });

      store.db.purchases.forEach(function (row) {
        const key = row.materialName;
        if (!map[key]) {
          map[key] = {
            name: key, unit: row.unit || "—", minStock: 0,
            purchased: 0, sold: 0, adjusted: 0, opening: 0,
            stock: 0, purchaseValue: 0, salesValue: 0
          };
        }
        map[key].purchased += U.num(row.quantity);
        map[key].purchaseValue += calc.purchaseTotal(row);
      });

      store.db.sales.forEach(function (row) {
        const key = row.materialName;
        if (!map[key]) {
          map[key] = {
            name: key, unit: row.unit || "—", minStock: 0,
            purchased: 0, sold: 0, adjusted: 0, opening: 0,
            stock: 0, purchaseValue: 0, salesValue: 0
          };
        }
        map[key].sold += U.num(row.quantity);
        map[key].salesValue += calc.salesFinal(row);
      });

      store.db.adjustments.forEach(function (row) {
        const key = row.materialName;
        if (!map[key]) return;
        map[key].adjusted += U.num(row.quantity);
      });

      Object.keys(map).forEach(function (key) {
        const item = map[key];
        item.stock = U.round(item.opening + item.purchased - item.sold + item.adjusted, 3);
        item.status = item.stock <= 0 ? "out" : (item.minStock > 0 && item.stock <= item.minStock ? "low" : "ok");
      });

      return map;
    },

    stockList() {
      const map = this.stockByProduct();
      return Object.keys(map).map(function (k) { return map[k]; });
    },

    stockOf(productName) {
      const map = this.stockByProduct();
      return map[productName] ? map[productName].stock : 0;
    },

    lowStockItems() {
      return this.stockList().filter(function (i) { return i.status === "low" || i.status === "out"; });
    },

    /* ---------- Supplier balances ---------- */
    supplierSummary() {
      const map = {};

      function ensure(name, mobile) {
        const key = (name || "").trim();
        if (!key) return null;
        if (!map[key]) {
          map[key] = {
            name: key,
            mobile: mobile || "",
            totalPurchase: 0,
            totalPaid: 0,
            balance: 0,
            entries: 0
          };
        }
        if (mobile && !map[key].mobile) map[key].mobile = mobile;
        return map[key];
      }

      store.db.suppliers.forEach(function (s) { ensure(s.name, s.mobile); });

      store.db.purchases.forEach(function (row) {
        const item = ensure(row.supplierName, row.supplierMobile);
        if (!item) return;
        item.totalPurchase += calc.purchaseTotal(row);
        item.totalPaid += calc.purchasePaid(row);
        item.entries += 1;
      });

      store.db.payments.forEach(function (row) {
        if (row.partyType !== "Supplier") return;
        const item = ensure(row.partyName, row.mobile);
        if (!item) return;
        item.totalPaid += U.num(row.amount);
      });

      Object.keys(map).forEach(function (k) {
        const item = map[k];
        item.totalPurchase = U.round(item.totalPurchase);
        item.totalPaid = U.round(item.totalPaid);
        item.balance = U.round(Math.max(0, item.totalPurchase - item.totalPaid));
      });

      return map;
    },

    supplierList() {
      const map = this.supplierSummary();
      return Object.keys(map).map(function (k) { return map[k]; });
    },

    /* ---------- Customer balances ---------- */
    customerSummary() {
      const map = {};

      function ensure(name, mobile) {
        const key = (name || "").trim();
        if (!key) return null;
        if (!map[key]) {
          map[key] = {
            name: key,
            mobile: mobile || "",
            totalSales: 0,
            totalPaid: 0,
            pending: 0,
            entries: 0
          };
        }
        if (mobile && !map[key].mobile) map[key].mobile = mobile;
        return map[key];
      }

      store.db.customers.forEach(function (c) { ensure(c.name, c.mobile); });

      store.db.sales.forEach(function (row) {
        const item = ensure(row.customerName, row.customerMobile);
        if (!item) return;
        item.totalSales += calc.salesFinal(row);
        item.totalPaid += calc.salesPaid(row);
        item.entries += 1;
      });

      store.db.payments.forEach(function (row) {
        if (row.partyType !== "Customer") return;
        const item = ensure(row.partyName, row.mobile);
        if (!item) return;
        item.totalPaid += U.num(row.amount);
      });

      Object.keys(map).forEach(function (k) {
        const item = map[k];
        item.totalSales = U.round(item.totalSales);
        item.totalPaid = U.round(item.totalPaid);
        item.pending = U.round(Math.max(0, item.totalSales - item.totalPaid));
      });

      return map;
    },

    customerList() {
      const map = this.customerSummary();
      return Object.keys(map).map(function (k) { return map[k]; });
    },

    /* ---------- Aggregate KPIs ---------- */
    totals(filter) {
      const f = filter || {};
      const inRange = function (row) {
        return U.inRange(row.date, f.from, f.to);
      };

      const purchases = store.db.purchases.filter(inRange);
      const sales = store.db.sales.filter(inRange);
      const expenses = store.db.expenses.filter(inRange);

      const totalSales = U.sum(sales, function (r) { return calc.salesFinal(r); });
      const totalPurchase = U.sum(purchases, function (r) { return calc.purchaseTotal(r); });
      const totalExpenses = U.sum(expenses, function (r) { return U.num(r.amount); });

      const grossProfit = U.sum(sales, function (r) { return calc.saleGrossProfit(r); });
      const netProfit = U.sum(sales, function (r) { return calc.saleNetProfit(r); }) - totalExpenses;

      const salesReceived = U.sum(sales, function (r) { return calc.salesPaid(r); });
      const purchasePaid = U.sum(purchases, function (r) { return calc.purchasePaid(r); });

      const customerPending = U.sum(sales, function (r) { return calc.salesDue(r); });
      const supplierOutstanding = U.sum(purchases, function (r) { return calc.purchaseDue(r); });

      const stockValue = U.sum(this.stockList(), function (i) {
        return i.stock * calc.avgPurchaseRate(i.name);
      });

      return {
        totalSales: U.round(totalSales),
        totalPurchase: U.round(totalPurchase),
        totalExpenses: U.round(totalExpenses),
        grossProfit: U.round(grossProfit),
        netProfit: U.round(netProfit),
        salesReceived: U.round(salesReceived),
        purchasePaid: U.round(purchasePaid),
        customerPending: U.round(customerPending),
        supplierOutstanding: U.round(supplierOutstanding),
        stockValue: U.round(stockValue),
        salesCount: sales.length,
        purchaseCount: purchases.length,
        expenseCount: expenses.length,
        margin: totalSales > 0 ? U.round((netProfit / totalSales) * 100, 2) : 0
      };
    },

    /* ---------- Monthly series ---------- */
    monthlySeries(months) {
      const count = months || 6;
      const now = new Date();
      const buckets = [];

      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        buckets.push({
          key: key,
          label: U.monthLabel(key),
          sales: 0,
          purchase: 0,
          expense: 0,
          profit: 0
        });
      }

      const index = {};
      buckets.forEach(function (b) { index[b.key] = b; });

      store.db.sales.forEach(function (row) {
        const b = index[U.monthKey(row.date)];
        if (!b) return;
        b.sales += calc.salesFinal(row);
        b.profit += calc.saleNetProfit(row);
      });

      store.db.purchases.forEach(function (row) {
        const b = index[U.monthKey(row.date)];
        if (!b) return;
        b.purchase += calc.purchaseTotal(row);
      });

      store.db.expenses.forEach(function (row) {
        const b = index[U.monthKey(row.date)];
        if (!b) return;
        b.expense += U.num(row.amount);
        b.profit -= U.num(row.amount);
      });

      buckets.forEach(function (b) {
        b.sales = U.round(b.sales);
        b.purchase = U.round(b.purchase);
        b.expense = U.round(b.expense);
        b.profit = U.round(b.profit);
      });

      return buckets;
    },

    /* ---------- Product-wise sales ---------- */
    productSales(filter) {
      const f = filter || {};
      const map = {};

      store.db.sales.forEach(function (row) {
        if (!U.inRange(row.date, f.from, f.to)) return;
        const key = row.materialName || "Unknown";
        if (!map[key]) map[key] = { name: key, qty: 0, amount: 0, profit: 0, unit: row.unit || "" };
        map[key].qty += U.num(row.quantity);
        map[key].amount += calc.salesFinal(row);
        map[key].profit += calc.saleNetProfit(row);
      });

      return Object.keys(map).map(function (k) {
        const item = map[k];
        item.amount = U.round(item.amount);
        item.profit = U.round(item.profit);
        item.qty = U.round(item.qty, 3);
        return item;
      }).sort(function (a, b) { return b.amount - a.amount; });
    },

    /* ---------- Daily series (for a range) ---------- */
    dailySeries(from, to) {
      const start = U.parseDate(from) || U.addDays(new Date(), -29);
      const end = U.parseDate(to) || new Date();
      const days = Math.max(1, Math.min(120, U.daysBetween(start, end) + 1));
      const buckets = [];

      for (let i = 0; i < days; i++) {
        const d = U.addDays(start, i);
        buckets.push({
          key: U.toISODate(d),
          label: String(d.getDate()) + "/" + String(d.getMonth() + 1),
          sales: 0,
          purchase: 0,
          profit: 0
        });
      }

      const index = {};
      buckets.forEach(function (b) { index[b.key] = b; });

      store.db.sales.forEach(function (row) {
        const b = index[U.toISODate(U.parseDate(row.date) || new Date())];
        if (!b) return;
        b.sales += calc.salesFinal(row);
        b.profit += calc.saleNetProfit(row);
      });

      store.db.purchases.forEach(function (row) {
        const b = index[U.toISODate(U.parseDate(row.date) || new Date())];
        if (!b) return;
        b.purchase += calc.purchaseTotal(row);
      });

      buckets.forEach(function (b) {
        b.sales = U.round(b.sales);
        b.purchase = U.round(b.purchase);
        b.profit = U.round(b.profit);
      });

      return buckets;
    },

    /* ---------- Ledger helpers ---------- */
    supplierLedger(name) {
      const rows = [];

      store.db.purchases.forEach(function (row) {
        if (row.supplierName !== name) return;
        rows.push({
          date: row.date,
          type: "Purchase",
          ref: row.id,
          description: row.materialName + " · " + U.qty(row.quantity) + " " + (row.unit || ""),
          debit: 0,
          credit: calc.purchaseTotal(row),
          paid: calc.purchasePaid(row)
        });
      });

      store.db.payments.forEach(function (row) {
        if (row.partyType !== "Supplier" || row.partyName !== name) return;
        rows.push({
          date: row.date,
          type: "Payment",
          ref: row.id,
          description: row.mode + (row.reference ? " · " + row.reference : ""),
          debit: U.num(row.amount),
          credit: 0,
          paid: U.num(row.amount)
        });
      });

      rows.sort(function (a, b) {
        return (U.parseDate(a.date) || 0) - (U.parseDate(b.date) || 0);
      });

      let balance = 0;
      rows.forEach(function (r) {
        balance += r.credit - r.debit;
        r.balance = U.round(balance);
      });

      return rows;
    },

    customerLedger(name) {
      const rows = [];

      store.db.sales.forEach(function (row) {
        if (row.customerName !== name) return;
        rows.push({
          date: row.date,
          type: "Sale",
          ref: row.invoiceNo || row.id,
          description: row.materialName + " · " + U.qty(row.quantity) + " " + (row.unit || ""),
          debit: calc.salesFinal(row),
          credit: 0,
          paid: calc.salesPaid(row)
        });
      });

      store.db.payments.forEach(function (row) {
        if (row.partyType !== "Customer" || row.partyName !== name) return;
        rows.push({
          date: row.date,
          type: "Receipt",
          ref: row.id,
          description: row.mode + (row.reference ? " · " + row.reference : ""),
          debit: 0,
          credit: U.num(row.amount),
          paid: U.num(row.amount)
        });
      });

      rows.sort(function (a, b) {
        return (U.parseDate(a.date) || 0) - (U.parseDate(b.date) || 0);
      });

      let balance = 0;
      rows.forEach(function (r) {
        balance += r.debit - r.credit;
        r.balance = U.round(balance);
      });

      return rows;
    },

    /* ---------- Stock history ---------- */
    stockHistory(productName) {
      const rows = [];

      store.db.purchases.forEach(function (row) {
        if (productName && row.materialName !== productName) return;
        rows.push({
          date: row.date,
          type: "Purchase",
          product: row.materialName,
          qty: U.num(row.quantity),
          unit: row.unit,
          party: row.supplierName,
          ref: row.id
        });
      });

      store.db.sales.forEach(function (row) {
        if (productName && row.materialName !== productName) return;
        rows.push({
          date: row.date,
          type: "Sale",
          product: row.materialName,
          qty: -U.num(row.quantity),
          unit: row.unit,
          party: row.customerName,
          ref: row.invoiceNo || row.id
        });
      });

      store.db.adjustments.forEach(function (row) {
        if (productName && row.materialName !== productName) return;
        rows.push({
          date: row.date,
          type: "Adjustment",
          product: row.materialName,
          qty: U.num(row.quantity),
          unit: row.unit,
          party: row.reason || "—",
          ref: row.id
        });
      });

      rows.sort(function (a, b) {
        return (U.parseDate(b.date) || 0) - (U.parseDate(a.date) || 0);
      });

      return rows;
    }
  });

  /* Auto-init on load */
  store.init();
})(window);
