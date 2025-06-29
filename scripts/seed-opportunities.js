const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
const seedPath = path.join(__dirname, "..", "db", "seed.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
const seedSql = fs.readFileSync(seedPath, "utf8");

const buildConfig = () => {
  const sslDisabled = process.env.PGSSLMODE === "disable";
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: sslDisabled ? false : { rejectUnauthorized: false },
    };
  }
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGPASSWORD) {
    throw new Error("DATABASE_URL or PGHOST/PGUSER/PGPASSWORD is required.");
  }
  return {
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE || "postgres",
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
  };
};

const run = async () => {
  const client = new Client(buildConfig());

  await client.connect();

  await client.query(schemaSql);
  await client.query(seedSql);

  await client.end();
  console.log("Seeded opportunity radar schema + data.");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
