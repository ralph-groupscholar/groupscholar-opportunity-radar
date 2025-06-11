const { query, readJson } = require("./_db");

module.exports = async (req, res) => {
  const clientId = req.query.clientId || req.headers["x-client-id"];

  if (req.method === "GET") {
    if (!clientId) {
      res.status(400).json({ error: "clientId required" });
      return;
    }

    try {
      const { rows } = await query(
        `select opportunity_id from opportunity_radar.watchlist where client_id = $1`,
        [clientId]
      );
      res.status(200).json(rows.map((row) => row.opportunity_id));
    } catch (error) {
      res.status(500).json({ error: "Failed to load watchlist" });
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
    const opportunityId = body.opportunityId;
    const active = Boolean(body.active);

    if (!opportunityId) {
      res.status(400).json({ error: "opportunityId required" });
      return;
    }

    try {
      if (active) {
        await query(
          `insert into opportunity_radar.watchlist (client_id, opportunity_id)
           values ($1, $2)
           on conflict (client_id, opportunity_id) do nothing`,
          [resolvedClientId, opportunityId]
        );
      } else {
        await query(
          `delete from opportunity_radar.watchlist where client_id = $1 and opportunity_id = $2`,
          [resolvedClientId, opportunityId]
        );
      }

      res.status(200).json({ ok: true, active });
    } catch (error) {
      res.status(500).json({ error: "Failed to update watchlist" });
    }
    return;
  }

  res.status(405).setHeader("Allow", "GET, POST").end();
};
