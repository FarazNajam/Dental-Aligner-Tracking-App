const { TableClient } = require("@azure/data-tables");

function getUserIdFromClientPrincipal(req) {
  const encoded = req.headers["x-ms-client-principal"];
  if (!encoded) return null;

  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    const principal = JSON.parse(json);
    return principal.userId || null;
  } catch {
    return null;
  }
}

module.exports = async function (context, req) {
  const conn = process.env.STORAGE_CONNECTION_STRING;
  const tableName = process.env.TABLE_NAME || "TraySettings";

  if (!conn) {
    context.res = { status: 500, body: "Missing STORAGE_CONNECTION_STRING" };
    return;
  }

  const userId = getUserIdFromClientPrincipal(req);
  if (!userId) {
    context.res = { status: 401, body: "Not authenticated" };
    return;
  }

  const client = TableClient.fromConnectionString(conn, tableName);
  await client.createTable();

  const partitionKey = userId;
  const rowKey = "settings";

  if (req.method === "GET") {
    try {
      const entity = await client.getEntity(partitionKey, rowKey);
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          startDateIso: entity.startDateIso,
          trayDays: entity.trayDays
        }
      };
    } catch (e) {
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          startDateIso: null,
          trayDays: 10
        }
      };
    }
    return;
  }

  if (req.method === "POST") {
    const { startDateIso, trayDays } = req.body || {};

    if (!startDateIso) {
      context.res = { status: 400, body: "Missing startDateIso in request body" };
      return;
    }

    const entity = {
      partitionKey,
      rowKey,
      startDateIso,
      trayDays: Number(trayDays || 10)
    };

    try {
      await client.upsertEntity(entity, "Merge");
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: { startDateIso: entity.startDateIso, trayDays: entity.trayDays }
      };
    } catch (e) {
      context.res = {
        status: 500,
        body: "Error saving entity: " + e.message
      };
    }
    return;
  }

  context.res = { status: 405, body: "Method not allowed" };
};
