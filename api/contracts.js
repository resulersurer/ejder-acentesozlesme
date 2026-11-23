const { neon } = require('@neondatabase/serverless');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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

  return {
    transporter: nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: String(port) === '465',
      auth: { user, pass },
    }),
    from,
  };
};

const toBase64Buffer = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return Buffer.from(match[2], 'base64');
};

const getLogoBuffer = () => {
  const logoPath = path.join(__dirname, '..', 'src', 'assets', 'ejder-logo.png');
  return fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
};

const generateContractPdf = (payload) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const logoBuffer = getLogoBuffer();
    if (logoBuffer) {
      doc.image(logoBuffer, { width: 150, height: 54, fit: [150, 54] });
      doc.moveDown(0.8);
    }

    const contractText = payload?.contractText || payload?.contractTemplate || '';
    const lines = String(contractText).split('\n');
    const signatureImage = payload?.signatureImage || payload?.senderSignatureImage;

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        doc.moveDown();
        return;
      }

      if (
        trimmed.startsWith('EJDER TURİZM') ||
        trimmed.startsWith('ÖZEL') ||
        trimmed.startsWith('KISALTILMIŞ') ||
        trimmed === 'SÖZLEŞME ÖZETİ' ||
        trimmed === 'EJDER TURİZM' ||
        trimmed === 'KURUMSAL MÜŞTERİ / GRUP ORGANİZATÖRÜ' ||
        trimmed === 'KİŞİ SAYISI VE FİYAT BİLGİLERİ' ||
        trimmed === 'FİYAT VE ÖDEME PLANI' ||
        trimmed === 'EKLER' ||
        trimmed === 'İMZA SAYFASI' ||
        trimmed.startsWith('MADDE')
      ) {
        doc.moveDown(0.5);
        doc.fontSize(13).font('Helvetica-Bold').text(trimmed);
        doc.moveDown(0.5);
        return;
      }

      doc.fontSize(10).font('Helvetica').text(trimmed);
    });

    if (signatureImage) {
      const imageBuffer = toBase64Buffer(signatureImage);
      if (imageBuffer) {
        doc.moveDown(1);
        doc.image(imageBuffer, { width: 180 });
      }
    }

    doc.end();
  });
};

const sendContractNotification = async (payload, id, req) => {
  const { transporter, from } = getMailTransporter() || {};

  if (!transporter || !from) {
    console.info('[api/contracts] SMTP is not configured, skipping email notification');
    return;
  }

  const recipient = payload?.email || payload?.customerContactInfo;

  if (!recipient) {
    console.info('[api/contracts] recipient email is missing, skipping email notification');
    return;
  }

  const appUrl = process.env.APP_URL || (req?.headers?.origin ? req.headers.origin : `https://${process.env.VERCEL_URL}`);
  const contractLink = `${appUrl}/sign/${id}`;

  const subject = 'Yeni sözleşme kaydedildi';
  const text = [
    'Merhaba,',
    '',
    'Ejder Turizm tarafından yeni bir sözleşme kaydedilmiştir.',
    '',
    `Sözleşme No: ${payload?.contractNo || '-'}`,
    `Müşteri / Organizatör: ${payload?.customerTitle || payload?.agencyName || '-'}`,
    `Yetkili: ${payload?.customerRepresentative || payload?.agencyContact || '-'}`,
    '',
    `Sözleşmeyi görüntülemek ve imzalamak için linke tıklayın: ${contractLink}`,
    '',
    'Detaylar için lütfen sistem yöneticisiyle iletişime geçin.',
    '',
    'Teşekkürler,',
    'Ejder Turizm',
  ].join('\n');

  await transporter.sendMail({
    from,
    to: [recipient, 'bilgi@ejderturizm.com.tr'],
    subject,
    text,
  });
};

const sendSignedContractNotification = async (payload) => {
  const { transporter, from } = getMailTransporter() || {};

  if (!transporter || !from) {
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

  const attachments = [];
  try {
    const pdfBuffer = await generateContractPdf(payload);
    attachments.push({
      filename: `sozlesme-${payload?.contractNo || payload?.id || 'dosya'}.pdf`,
      content: pdfBuffer,
    });
  } catch (error) {
    console.error('[api/contracts] pdf generation failed', {
      message: error instanceof Error ? error.message : error,
    });
  }

  await transporter.sendMail({
    from,
    to: ['satis@ejderturizm.com.tr', 'vipoperation@ejderturizm.com.tr'],
    subject,
    text,
    attachments,
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

      sendContractNotification(payload, id, req).catch((error) => {
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
