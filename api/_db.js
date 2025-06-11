const { Pool } = require("pg");

let pool;

const getPool = () => {
  if (!pool) {
    const sslDisabled = process.env.PGSSLMODE === "disable";
    const poolConfig = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: sslDisabled ? false : { rejectUnauthorized: false },
        }
      : {
          host: process.env.PGHOST,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
          database: process.env.PGDATABASE || "postgres",
          ssl: sslDisabled ? false : { rejectUnauthorized: false },
        };
    pool = new Pool(poolConfig);
  }
  return pool;
};

const query = (text, params) => getPool().query(text, params);

const readJson = async (req) => {
  if (req.body) {
    return req.body;
  }
  let data = "";
  for await (const chunk of req) {
    data += chunk;
  }
  if (!data) {
    return {};
  }
  try {
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
};

module.exports = { query, readJson };
