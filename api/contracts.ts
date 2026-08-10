import { neon } from '@neondatabase/serverless';

type DraftPayload = Record<string, unknown>;

const getSql = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  return neon(databaseUrl);
};

const readBody = (body: unknown): DraftPayload => {
  if (typeof body === 'string') {
    return JSON.parse(body) as DraftPayload;
  }

  return (body ?? {}) as DraftPayload;
};

const ensureTable = async (sql: ReturnType<typeof neon>) => {
  await sql`
    CREATE TABLE IF NOT EXISTS contract_drafts (
      id          TEXT PRIMARY KEY,
      payload     JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
};

export default async function handler(req: any, res: any) {
  try {
    const sql = getSql();
    await ensureTable(sql);

    if (req.method === 'GET') {
      const id = typeof req.query?.id === 'string' ? req.query.id : '';

      if (!id) {
        res.status(400).json({ message: 'id is required' });
        return;
      }

      const rows = await sql`SELECT payload, created_at FROM contract_drafts WHERE id = ${id} LIMIT 1`;

      if (rows.length === 0) {
        res.status(404).json({ message: 'draft not found' });
        return;
      }

      res.status(200).json({
        id,
        ...rows[0].payload,
        createdAt: rows[0].created_at,
      });
      return;
    }

    if (req.method === 'POST') {
      const payload = readBody(req.body);
      const id = crypto.randomUUID();

      await sql`
        INSERT INTO contract_drafts (id, payload)
        VALUES (${id}, ${JSON.stringify(payload)}::jsonb)
      `;

      res.status(201).json({ id });
      return;
    }

    if (req.method === 'PATCH') {
      const id = typeof req.query?.id === 'string' ? req.query.id : '';

      if (!id) {
        res.status(400).json({ message: 'id is required' });
        return;
      }

      const payload = readBody(req.body);
      const rows = await sql`
        UPDATE contract_drafts
        SET payload = payload || ${JSON.stringify(payload)}::jsonb,
            updated_at = now()
        WHERE id = ${id}
        RETURNING payload, created_at
      `;

      if (rows.length === 0) {
        res.status(404).json({ message: 'draft not found' });
        return;
      }

      res.status(200).json({
        id,
        ...rows[0].payload,
        createdAt: rows[0].created_at,
      });
      return;
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    res.status(405).json({ message: 'method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unexpected error';
    res.status(500).json({ message });
  }
}
