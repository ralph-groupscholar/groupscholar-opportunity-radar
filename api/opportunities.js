const { query, readJson } = require("./_db");

const mapRow = (row) => ({
  id: row.id,
  name: row.name,
  deadline: row.deadline,
  region: row.region,
  type: row.type,
  stage: row.stage,
  owner: row.owner,
  funding: row.funding ? Number(row.funding) : 0,
  fit: row.fit ? Number(row.fit) : 0,
  focus: row.focus || "",
  link: row.link || "",
  custom: row.custom,
});

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
};

module.exports = async (req, res) => {
  const clientId = req.query.clientId || req.headers["x-client-id"];

  if (req.method === "GET") {
    if (!clientId) {
      res.status(400).json({ error: "clientId required" });
      return;
    }

    try {
      const { rows } = await query(
        `
        select
          id,
          name,
          deadline,
          region,
          type,
          stage,
          owner,
          funding,
          fit,
          focus,
          link,
          false as custom
        from opportunity_radar.opportunities
        union all
        select
          id,
          name,
          deadline,
          region,
          type,
          stage,
          owner,
          funding,
          fit,
          focus,
          link,
          true as custom
        from opportunity_radar.custom_opportunities
        where client_id = $1
        order by deadline asc
        `,
        [clientId]
      );

      const payload = rows.map((row) => ({
        ...mapRow(row),
        deadline: normalizeDate(row.deadline),
      }));

      res.status(200).json(payload);
    } catch (error) {
      res.status(500).json({ error: "Failed to load opportunities" });
    }
    return;
  }

  const body = await readJson(req);
  const resolvedClientId = body.clientId || clientId;

  if (!resolvedClientId) {
    res.status(400).json({ error: "clientId required" });
    return;
  }

  if (req.method === "POST") {
    const entry = {
      id: body.id,
      name: body.name,
      deadline: body.deadline,
      region: body.region,
      type: body.type,
      stage: body.stage,
      owner: body.owner,
      funding: Number(body.funding) || 0,
      fit: Number(body.fit) || 3,
      focus: body.focus || "",
      link: body.link || "",
    };

    if (!entry.id || !entry.name || !entry.deadline) {
      res.status(400).json({ error: "id, name, and deadline are required" });
      return;
    }

    try {
      await query(
        `
        insert into opportunity_radar.custom_opportunities
          (id, client_id, name, deadline, region, type, stage, owner, funding, fit, focus, link)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        on conflict (id) do update set
          name = excluded.name,
          deadline = excluded.deadline,
          region = excluded.region,
          type = excluded.type,
          stage = excluded.stage,
          owner = excluded.owner,
          funding = excluded.funding,
          fit = excluded.fit,
          focus = excluded.focus,
          link = excluded.link
        `,
        [
          entry.id,
          resolvedClientId,
          entry.name,
          entry.deadline,
          entry.region,
          entry.type,
          entry.stage,
          entry.owner,
          entry.funding,
          entry.fit,
          entry.focus,
          entry.link,
        ]
      );

      res.status(201).json({ ...entry, custom: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save opportunity" });
    }
    return;
  }

  if (req.method === "DELETE") {
    const id = req.query.id || body.id;
    if (!id) {
      res.status(400).json({ error: "id required" });
      return;
    }
    try {
      await query(
        `delete from opportunity_radar.custom_opportunities where id = $1 and client_id = $2`,
        [id, resolvedClientId]
      );
      await query(
        `delete from opportunity_radar.watchlist where opportunity_id = $1 and client_id = $2`,
        [id, resolvedClientId]
      );
      res.status(200).json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete opportunity" });
    }
    return;
  }

  res.status(405).setHeader("Allow", "GET, POST, DELETE").end();
};
