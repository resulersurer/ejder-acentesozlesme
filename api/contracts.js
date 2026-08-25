const { neon } = require('@neondatabase/serverless');
const nodemailer = require('nodemailer');

const getSql = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing');
  }

  return neon(databaseUrl);
};

const getMailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure: String(port) === '465',
    auth: { user, pass },
  });
};

const sendSignedContractNotification = async (payload) => {
  const transporter = getMailTransporter();

  if (!transporter) {
    console.info('[api/contracts] SMTP is not configured, skipping signed contract email');
    return;
  }

  const subject = 'Sözleşme imzalandı';
  const text = [
    'Merhaba,',
    '',
    'Bir sözleşme müşteri tarafından onaylanıp imzalandı.',
    '',
    `Sözleşme No: ${payload?.contractNo || '-'}`,
    `Müşteri / Organizatör: ${payload?.customerTitle || payload?.agencyName || '-'}`,
    `Yetkili: ${payload?.customerRepresentative || payload?.agencyContact || '-'}`,
    `İmzalayan: ${payload?.signerName || '-'}`,
    `İmza Tarihi: ${payload?.signDate || '-'}`,
    '',
    'Teşekkürler,',
    'Ejder Turizm',
  ].join('\n');

  await transporter.sendMail({
    from,
    to: ['satis@ejderturizm.com.tr', 'vipoperation@ejderturizm.com.tr'],
    subject,
    text,
  });
};

const readBody = (body) => {
  if (typeof body === 'string') {
    return JSON.parse(body);
  }

  return body ?? {};
};

const ensureTable = async (sql) => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS contract_drafts (
        id          TEXT PRIMARY KEY,
        payload     JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (!message.includes('pg_type_typname_nsp_index')) {
      throw error;
    }
  }
};

const requireDashboardAccess = (req, res) => {
  const expectedPin = process.env.ADMIN_DASHBOARD_PIN || process.env.ADMIN_DELETE_PIN;
  const requestPin = req.headers['x-admin-dashboard-pin'];

  if (!expectedPin) {
    res.status(503).json({ message: 'ADMIN_DASHBOARD_PIN is not configured' });
    return false;
  }

  if (requestPin !== expectedPin) {
    res.status(401).json({ message: 'dashboard pin is invalid' });
    return false;
  }

  return true;
};

const handler = async (req, res) => {
  try {
    const sql = getSql();
    await ensureTable(sql);

    if (req.method === 'GET') {
      const id = typeof req.query?.id === 'string' ? req.query.id : '';

      if (!id || req.query?.admin === '1') {
        if (!requireDashboardAccess(req, res)) {
          return;
        }
      }

      if (!id) {
        const rows = await sql`
          SELECT id, payload, created_at, updated_at
          FROM contract_drafts
          ORDER BY updated_at DESC
          LIMIT 100
        `;

        res.status(200).json(
          rows.map((row) => ({
            id: row.id,
            ...row.payload,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );
        return;
      }

      const rows = await sql`
        SELECT payload, created_at, updated_at
        FROM contract_drafts
        WHERE id = ${id}
        LIMIT 1
      `;

      if (rows.length === 0) {
        res.status(404).json({ message: 'draft not found' });
        return;
      }

      res.status(200).json({
        id,
        ...rows[0].payload,
        createdAt: rows[0].created_at,
        updatedAt: rows[0].updated_at,
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

      sendContractNotification(payload).catch((error) => {
        console.error('[api/contracts] email notification failed', {
          id,
          message: error instanceof Error ? error.message : error,
        });
      });

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
        RETURNING payload, created_at, updated_at
      `;

      if (payload?.status === 'signed') {
        sendSignedContractNotification(payload).catch((error) => {
          console.error('[api/contracts] signed contract email notification failed', {
            id,
            message: error instanceof Error ? error.message : error,
          });
        });
      }

      if (rows.length === 0) {
        res.status(404).json({ message: 'draft not found' });
        return;
      }

      res.status(200).json({
        id,
        ...rows[0].payload,
        createdAt: rows[0].created_at,
        updatedAt: rows[0].updated_at,
      });
      return;
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query?.id === 'string' ? req.query.id : '';
      const adminDeletePin = process.env.ADMIN_DELETE_PIN;
      const requestPin = req.headers['x-admin-delete-pin'];

      if (!id) {
        res.status(400).json({ message: 'id is required' });
        return;
      }

      if (!adminDeletePin) {
        res.status(403).json({ message: 'ADMIN_DELETE_PIN is not configured' });
        return;
      }

      if (requestPin !== adminDeletePin) {
        res.status(403).json({ message: 'delete pin is invalid' });
        return;
      }

      const rows = await sql`
        DELETE FROM contract_drafts
        WHERE id = ${id}
        RETURNING id
      `;

      if (rows.length === 0) {
        res.status(404).json({ message: 'draft not found' });
        return;
      }

      res.status(204).end();
      return;
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
    res.status(405).json({ message: 'method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unexpected error';
    console.error('[api/contracts] request failed', {
      method: req.method,
      url: req.url,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ message });
  }
};

module.exports = handler;
