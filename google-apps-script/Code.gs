/**
 * ============================================================================
 * SHREE BRAHMANI TRADERS — Google Apps Script Backend
 * ============================================================================
 *
 * This script turns a Google Spreadsheet into the database for the
 * Shree Brahmani Traders web app. No other database is used.
 *
 * ---------------------------------------------------------------------------
 * SETUP (one time, ~3 minutes)
 * ---------------------------------------------------------------------------
 * 1. Create a new Google Sheet (name it e.g. "SBT Database").
 * 2. In the Sheet menu: Extensions → Apps Script.
 * 3. Delete the default code and paste this entire file.
 * 4. Click Save (💾), then Deploy → New deployment.
 * 5. Click the gear icon → select type "Web app".
 * 6. Set:
 *      Description : SBT API
 *      Execute as  : Me
 *      Who has access : Anyone
 * 7. Click Deploy → Authorize access → choose your account → Allow.
 * 8. Copy the "Web app URL" (ends with /exec).
 * 9. Open the web app → Settings page → paste the URL → Save → Test Connection.
 *
 * ---------------------------------------------------------------------------
 * SHEETS CREATED AUTOMATICALLY
 * ---------------------------------------------------------------------------
 * products, suppliers, customers, purchases, sales, expenses, payments,
 * adjustments, settings
 *
 * ---------------------------------------------------------------------------
 * API ACTIONS (POST body: { action, payload })
 * ---------------------------------------------------------------------------
 * ping        → health check
 * getAll      → { ok, data: { products:[], ..., settings:{} } }
 * insert      → payload { entity, record }
 * update      → payload { entity, record }   (record.id required)
 * delete      → payload { entity, record:{ id } }
 * saveAll     → payload { data: { entity: [...] } }  (full replace)
 * batch       → payload { operations: [{action, entity, record}] }
 * saveSettings→ payload { record: {...} }
 * ============================================================================
 */

/* ---------------------------------------------------------------------------
   CONFIG
   --------------------------------------------------------------------------- */
var ENTITIES = [
  "products",
  "suppliers",
  "customers",
  "purchases",
  "sales",
  "expenses",
  "payments",
  "adjustments"
];

var SETTINGS_SHEET = "settings";

/* Column order per entity. "id" is always first. */
var SCHEMAS = {
  products: [
    "id", "name", "unit", "purchaseRate", "sellingRate", "minStock",
    "hsn", "gst", "openingStock", "active", "createdAt", "updatedAt"
  ],
  suppliers: [
    "id", "name", "mobile", "gstin", "address", "notes", "createdAt", "updatedAt"
  ],
  customers: [
    "id", "name", "mobile", "gstin", "address", "notes", "createdAt", "updatedAt"
  ],
  purchases: [
    "id", "date", "supplierName", "supplierMobile", "materialName", "quantity",
    "unit", "purchaseRate", "transportCharges", "loadingCharges", "otherExpenses",
    "paymentStatus", "paidAmount", "notes", "createdAt", "updatedAt"
  ],
  sales: [
    "id", "date", "invoiceNo", "customerName", "customerMobile", "materialName",
    "quantity", "unit", "sellingRate", "discount", "transportCharges",
    "gstApplicable", "gstRate", "paymentStatus", "paidAmount", "totalAmount",
    "notes", "createdAt", "updatedAt"
  ],
  expenses: [
    "id", "date", "category", "description", "amount", "paymentMode",
    "paidTo", "reference", "notes", "createdAt", "updatedAt"
  ],
  payments: [
    "id", "date", "partyType", "partyName", "mobile", "amount", "mode",
    "reference", "notes", "direction", "createdAt", "updatedAt"
  ],
  adjustments: [
    "id", "date", "materialName", "quantity", "unit", "reason", "notes",
    "createdAt", "updatedAt"
  ],
  settings: [
    "key", "value"
  ]
};

/* ---------------------------------------------------------------------------
   ENTRY POINTS
   --------------------------------------------------------------------------- */

/**
 * GET — health check / browser sanity test.
 */
function doGet(e) {
  return jsonOut({
    ok: true,
    service: "Shree Brahmani Traders API",
    version: "1.0.0",
    time: new Date().toISOString(),
    message: "API is live. Send POST requests with { action, payload }."
  });
}

/**
 * POST — main API entry point.
 */
function doPost(e) {
  try {
    var body = parseBody(e);
    var action = String(body.action || "").trim();
    var payload = body.payload || {};

    switch (action) {
      case "ping":
        return jsonOut({ ok: true, message: "pong", time: new Date().toISOString() });

      case "getAll":
        return jsonOut({ ok: true, data: getAllData() });

      case "insert":
        return jsonOut(handleInsert(payload));

      case "update":
        return jsonOut(handleUpdate(payload));

      case "delete":
        return jsonOut(handleDelete(payload));

      case "saveAll":
        return jsonOut(handleSaveAll(payload));

      case "batch":
        return jsonOut(handleBatch(payload));

      case "saveSettings":
        return jsonOut(handleSaveSettings(payload));

      default:
        return jsonOut({
          ok: false,
          error: "Unknown action: '" + action + "'. " +
            "Valid actions: ping, getAll, insert, update, delete, saveAll, batch, saveSettings."
        });
    }
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* ---------------------------------------------------------------------------
   REQUEST PARSING
   --------------------------------------------------------------------------- */
function parseBody(e) {
  if (!e) return {};

  /* Standard form post */
  if (e.postData && e.postData.contents) {
    var raw = e.postData.contents;
    try {
      return JSON.parse(raw);
    } catch (err) {
      /* Fall through to parameter parsing */
    }
  }

  /* Fallback: parameters (works when sent as form-encoded) */
  if (e.parameter && e.parameter.action) {
    var payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(e.parameter.payload); } catch (err2) { payload = {}; }
    }
    return { action: e.parameter.action, payload: payload };
  }

  return {};
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------------
   SPREADSHEET HELPERS
   --------------------------------------------------------------------------- */
function getSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      "No spreadsheet bound. Open this script from Extensions → Apps Script " +
      "inside your Google Sheet, or set SPREADSHEET_ID manually."
    );
  }
  return ss;
}

/**
 * Get (or create) a sheet with the correct header row.
 */
function getSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  var headers = SCHEMAS[name] || ["id"];
  var firstRow = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
    : [];

  var needsHeader = !firstRow.length || !firstRow[0] ||
    String(firstRow[0]).trim() === "";

  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#1b4b73")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Read a sheet into an array of plain objects.
 */
function readSheet(name) {
  var sheet = getSheet(name);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var obj = {};
    var hasValue = false;

    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      var v = row[c];
      if (v instanceof Date) {
        v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[headers[c]] = v;
      if (v !== "" && v !== null && v !== undefined) hasValue = true;
    }

    if (hasValue) rows.push(obj);
  }

  return rows;
}

/**
 * Overwrite a sheet with the given rows.
 */
function writeSheet(name, rows) {
  var sheet = getSheet(name);
  var headers = SCHEMAS[name] || ["id"];

  /* Clear existing content but keep the sheet */
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }

  /* Ensure header row matches schema */
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (!rows || !rows.length) return 0;

  var values = rows.map(function (row) {
    return headers.map(function (h) {
      var v = row[h];
      if (v === null || v === undefined) return "";
      if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
      if (typeof v === "object") return JSON.stringify(v);
      return v;
    });
  });

  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  return values.length;
}

/**
 * Append a single row.
 */
function appendRow(name, record) {
  var sheet = getSheet(name);
  var headers = SCHEMAS[name] || ["id"];
  var row = headers.map(function (h) {
    var v = record[h];
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  });
  sheet.appendRow(row);
  return record;
}

/**
 * Find the 1-based sheet row index for a record id. Returns -1 if not found.
 */
function findRowIndex(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(id).trim()) {
      return i + 2; /* +2 because data starts at row 2 */
    }
  }
  return -1;
}

/* ---------------------------------------------------------------------------
   ACTION HANDLERS
   --------------------------------------------------------------------------- */

function getAllData() {
  var data = {};

  ENTITIES.forEach(function (entity) {
    data[entity] = readSheet(entity);
  });

  /* Settings stored as key/value pairs */
  var settingsRows = readSheet(SETTINGS_SHEET);
  var settings = {};
  settingsRows.forEach(function (row) {
    if (!row.key) return;
    var raw = row.value;
    if (raw === "TRUE") settings[row.key] = true;
    else if (raw === "FALSE") settings[row.key] = false;
    else if (raw !== "" && !isNaN(Number(raw)) && String(raw).trim() !== "") {
      settings[row.key] = Number(raw);
    } else {
      settings[row.key] = raw;
    }
  });
  data.settings = settings;

  return data;
}

function handleInsert(payload) {
  var entity = payload.entity;
  var record = payload.record;

  if (!entity || !record) {
    return { ok: false, error: "insert requires payload.entity and payload.record" };
  }
  if (ENTITIES.indexOf(entity) === -1) {
    return { ok: false, error: "Unknown entity: " + entity };
  }
  if (!record.id) {
    return { ok: false, error: "record.id is required" };
  }

  var sheet = getSheet(entity);
  var existing = findRowIndex(sheet, record.id);

  if (existing > 0) {
    /* Upsert: update the existing row instead of duplicating */
    return handleUpdate(payload);
  }

  appendRow(entity, record);
  return { ok: true, data: record, message: "Inserted into " + entity };
}

function handleUpdate(payload) {
  var entity = payload.entity;
  var record = payload.record;

  if (!entity || !record || !record.id) {
    return { ok: false, error: "update requires payload.entity and payload.record.id" };
  }
  if (ENTITIES.indexOf(entity) === -1) {
    return { ok: false, error: "Unknown entity: " + entity };
  }

  var sheet = getSheet(entity);
  var rowIndex = findRowIndex(sheet, record.id);

  if (rowIndex < 0) {
    /* Not present yet — insert it */
    appendRow(entity, record);
    return { ok: true, data: record, message: "Record not found, inserted instead" };
  }

  var headers = SCHEMAS[entity] || ["id"];
  var current = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var merged = {};

  headers.forEach(function (h, i) {
    merged[h] = current[i];
  });
  Object.keys(record).forEach(function (k) {
    merged[k] = record[k];
  });

  var values = headers.map(function (h) {
    var v = merged[h];
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  });

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
  return { ok: true, data: merged, message: "Updated in " + entity };
}

function handleDelete(payload) {
  var entity = payload.entity;
  var record = payload.record || {};

  if (!entity || !record.id) {
    return { ok: false, error: "delete requires payload.entity and payload.record.id" };
  }
  if (ENTITIES.indexOf(entity) === -1) {
    return { ok: false, error: "Unknown entity: " + entity };
  }

  var sheet = getSheet(entity);
  var rowIndex = findRowIndex(sheet, record.id);

  if (rowIndex < 0) {
    return { ok: true, message: "Record already absent from " + entity };
  }

  sheet.deleteRow(rowIndex);
  return { ok: true, message: "Deleted from " + entity };
}

function handleSaveAll(payload) {
  var data = payload.data || {};
  var summary = {};

  ENTITIES.forEach(function (entity) {
    if (Array.isArray(data[entity])) {
      summary[entity] = writeSheet(entity, data[entity]);
    }
  });

  if (data.settings && typeof data.settings === "object") {
    writeSettings(data.settings);
    summary.settings = Object.keys(data.settings).length;
  }

  return { ok: true, data: summary, message: "All data saved to Google Sheets" };
}

function handleBatch(payload) {
  var operations = payload.operations || [];
  var results = [];

  operations.forEach(function (op) {
    try {
      var res;
      switch (op.action) {
        case "insert": res = handleInsert(op); break;
        case "update": res = handleUpdate(op); break;
        case "delete": res = handleDelete(op); break;
        case "saveSettings": res = handleSaveSettings(op); break;
        default: res = { ok: false, error: "Unknown batch action: " + op.action };
      }
      results.push(res);
    } catch (err) {
      results.push({ ok: false, error: String(err) });
    }
  });

  var failed = results.filter(function (r) { return !r.ok; }).length;
  return {
    ok: failed === 0,
    data: results,
    message: operations.length + " operations processed, " + failed + " failed"
  };
}

function handleSaveSettings(payload) {
  var record = payload.record || payload.settings || {};
  writeSettings(record);
  return { ok: true, data: record, message: "Settings saved" };
}

function writeSettings(settings) {
  var sheet = getSheet(SETTINGS_SHEET);
  var keys = Object.keys(settings || {});

  /* Clear existing rows below header */
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
  }

  if (!keys.length) return;

  var values = keys.map(function (k) {
    var v = settings[k];
    if (v === null || v === undefined) v = "";
    else if (typeof v === "boolean") v = v ? "TRUE" : "FALSE";
    else if (typeof v === "object") v = JSON.stringify(v);
    return [k, v];
  });

  sheet.getRange(2, 1, values.length, 2).setValues(values);
}

/* ---------------------------------------------------------------------------
   UTILITIES
   --------------------------------------------------------------------------- */

/**
 * Run this once from the Apps Script editor to create all sheets
 * with proper headers before using the web app.
 */
function setupSheets() {
  ENTITIES.forEach(function (entity) {
    getSheet(entity);
  });
  getSheet(SETTINGS_SHEET);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "All sheets are ready: " + ENTITIES.join(", ") + ", " + SETTINGS_SHEET,
    "SBT Setup Complete",
    8
  );
}

/**
 * Optional: seed the products sheet with the default material list.
 * Run manually from the editor if you want the defaults in the Sheet.
 */
function seedDefaultProducts() {
  var defaults = [
    { name: "Bricks", unit: "Piece", purchaseRate: 7, sellingRate: 9, minStock: 5000, hsn: "6904", gst: 5 },
    { name: "Sand (Ret)", unit: "Brass", purchaseRate: 3200, sellingRate: 3900, minStock: 20, hsn: "2505", gst: 5 },
    { name: "Kapchi", unit: "Brass", purchaseRate: 2800, sellingRate: 3400, minStock: 20, hsn: "2517", gst: 5 },
    { name: "Grit", unit: "Brass", purchaseRate: 3000, sellingRate: 3650, minStock: 20, hsn: "2517", gst: 5 },
    { name: "Cement", unit: "Bag", purchaseRate: 340, sellingRate: 395, minStock: 100, hsn: "2523", gst: 28 }
  ];

  var now = new Date().toISOString();
  var rows = defaults.map(function (p, i) {
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

  writeSheet("products", rows);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    rows.length + " default products written to the products sheet.",
    "SBT Seed Complete",
    8
  );
}

/**
 * Optional: clear every data sheet (keeps headers).
 */
function clearAllData() {
  ENTITIES.forEach(function (entity) {
    writeSheet(entity, []);
  });
  writeSettings({});
  SpreadsheetApp.getActiveSpreadsheet().toast("All data cleared.", "SBT Reset", 8);
}
