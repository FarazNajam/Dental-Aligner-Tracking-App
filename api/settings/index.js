const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  context.log("Function started");

  const conn = process.env.STORAGE_CONNECTION_STRING;
  const tableName = process.env.TABLE_NAME || "TraySettings";

  if (!conn) {
    context.res = { status: 500, body: "Missing STORAGE_CONNECTION_STRING" };
    return;
  }

  try {
    const client = TableClient.fromConnectionString(conn, tableName);
    await client.createTable(); // safe even if table exists
    context.res = {
      status: 200,
      body: "Function ran successfully and connected to Table Storage"
    };
  } catch (e) {
    context.res = {
      status: 500,
      body: "Error connecting to Table Storage: " + e.message
    };
  }
};
