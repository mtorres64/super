require('dotenv').config();
const express = require('express');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const API_KEY      = process.env.API_KEY       || 'wa-service-secret-key';
const PORT         = process.env.PORT          || 3001;
const AUTH_BASE    = path.join(__dirname, 'auth');
const BACKEND_URL  = process.env.BACKEND_URL   || 'http://localhost:8000';
const BACKEND_WA_KEY = process.env.BACKEND_WA_KEY || 'wa-incoming-secret';

// sessions: Map<empresa_id, SessionState>
const sessions = new Map();

function requireApiKey(req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function authDir(empresaId) {
  return path.join(AUTH_BASE, empresaId);
}

function getSession(empresaId) {
  if (!sessions.has(empresaId)) {
    sessions.set(empresaId, {
      sock: null,
      qr: null,
      status: 'disconnected',
      phone: null,
      reconnectTimer: null,
      lidToPhone: {},
      sentMessageIds: new Set(),
    });
  }
  return sessions.get(empresaId);
}

const silentLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {},
  warn: () => {}, error: () => {}, fatal: () => {},
  child: () => silentLogger,
};

async function connectWhatsApp(empresaId) {
  const session = getSession(empresaId);
  if (session.reconnectTimer) { clearTimeout(session.reconnectTimer); session.reconnectTimer = null; }

  const { state, saveCreds } = await useMultiFileAuthState(authDir(empresaId));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    connectTimeoutMs: 60000,
    logger: silentLogger,
  });
  session.sock = sock;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        session.qr = await QRCode.toDataURL(qr);
        session.status = 'qr_pending';
        console.log(`[WA:${empresaId}] QR generado`);
      } catch (e) {
        console.error(`[WA:${empresaId}] Error generando QR:`, e.message);
      }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`[WA:${empresaId}] Conexión cerrada. loggedOut=${loggedOut}, code=${code}`);
      session.qr = null;
      if (!loggedOut) {
        session.status = 'connecting';
        session.reconnectTimer = setTimeout(() => connectWhatsApp(empresaId), 5000);
      } else {
        session.status = 'disconnected';
        session.phone = null;
        sessions.delete(empresaId);
      }
    } else if (connection === 'open') {
      session.status = 'connected';
      session.qr = null;
      session.phone = sock.user?.id?.split(':')[0] || null;
      console.log(`[WA:${empresaId}] Conectado: +${session.phone}`);
      // Precarga LIDs de teléfonos conocidos de esta empresa
      setTimeout(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/whatsapp/known-phones?empresa_id=${empresaId}`, {
            headers: { 'x-wa-key': BACKEND_WA_KEY },
          });
          const { phones } = await res.json();
          for (const phone of (phones || [])) {
            const [info] = await sock.onWhatsApp(phone).catch(() => [null]);
            const lid = info?.jid?.endsWith('@lid') ? info.jid : info?.lid;
            if (lid) {
              session.lidToPhone[lid] = phone;
              console.log(`[WA:${empresaId}] LID resuelto: ${lid} → +${phone}`);
            }
          }
        } catch (e) {
          console.error(`[WA:${empresaId}] Error precargando LIDs:`, e.message);
        }
      }, 3000);
    } else if (connection === 'connecting') {
      session.status = 'connecting';
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('contacts.upsert', (contacts) => {
    for (const c of contacts) {
      if (c.lid && c.id && c.id.endsWith('@s.whatsapp.net')) {
        session.lidToPhone[c.lid] = c.id.replace('@s.whatsapp.net', '');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;
    const cutoff = Math.floor(Date.now() / 1000) - 120;

    for (const msg of messages) {
      const jid = msg.key.remoteJid || '';
      const isLid = jid.endsWith('@lid');
      const ts = Number(msg.messageTimestamp) || 0;

      if (ts && ts < cutoff) continue;
      if (msg.key.fromMe && (!isLid || session.sentMessageIds.has(msg.key.id))) continue;
      if (!msg.message) continue;
      if (jid.endsWith('@g.us') || jid.endsWith('@broadcast')) continue;

      let from;
      if (jid.endsWith('@s.whatsapp.net')) {
        from = jid.replace('@s.whatsapp.net', '');
      } else if (isLid) {
        from = session.lidToPhone[jid];
        if (!from) {
          const contacts = sock?.contacts || {};
          for (const [cId, cData] of Object.entries(contacts)) {
            if (cId.endsWith('@s.whatsapp.net') && cData.lid === jid) {
              from = cId.replace('@s.whatsapp.net', '');
              session.lidToPhone[jid] = from;
              break;
            }
          }
        }
        if (!from) {
          console.warn(`[WA:${empresaId}] LID sin mapeo: ${jid}`);
          continue;
        }
      } else {
        continue;
      }

      const text = msg.message.conversation
        || msg.message.extendedTextMessage?.text
        || msg.message.imageMessage?.caption
        || '';
      if (!text) continue;

      try {
        const msgTs = typeof msg.messageTimestamp === 'object'
          ? Number(msg.messageTimestamp)
          : msg.messageTimestamp;
        const res = await fetch(`${BACKEND_URL}/api/whatsapp/incoming`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-wa-key': BACKEND_WA_KEY },
          body: JSON.stringify({ empresa_id: empresaId, from, text, timestamp: msgTs, msgId: msg.key.id }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.ok === false) {
          console.error(`[WA:${empresaId}] Backend rechazó mensaje de +${from}: ${res.status} reason=${body.reason}`);
        } else {
          console.log(`[WA:${empresaId}] Entrante de +${from}: ${text.slice(0, 60)}`);
        }
      } catch (e) {
        console.error(`[WA:${empresaId}] Error reenviando entrante:`, e.message);
      }
    }
  });
}

// Auto-arranca sesiones con credenciales guardadas en disco
function autoStartSavedSessions() {
  if (!fs.existsSync(AUTH_BASE)) return;
  const entries = fs.readdirSync(AUTH_BASE, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      console.log(`[WA] Auto-arrancando sesión guardada: ${entry.name}`);
      connectWhatsApp(entry.name).catch(console.error);
    }
  }
}

// ── Endpoints ────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ ok: true }));

// GET /status?empresa_id=xxx
app.get('/status', requireApiKey, (req, res) => {
  const { empresa_id } = req.query;
  if (!empresa_id) return res.status(400).json({ error: 'empresa_id requerido' });
  const session = sessions.get(empresa_id);
  if (!session) return res.json({ status: 'disconnected', phone: null, qr: null });
  res.json({
    status: session.status,
    phone: session.phone,
    qr: session.status === 'qr_pending' ? session.qr : null,
  });
});

// POST /send  body: { empresa_id, to, message }
app.post('/send', requireApiKey, async (req, res) => {
  const { empresa_id, to, message } = req.body;
  if (!empresa_id || !to || !message) {
    return res.status(400).json({ error: 'empresa_id, to y message son requeridos' });
  }
  const session = sessions.get(empresa_id);
  if (!session || session.status !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp no está conectado', status: session?.status || 'disconnected' });
  }
  try {
    const phone = String(to).replace(/\D/g, '');
    const jid = `${phone}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, { text: message });
    if (result?.key?.id) {
      session.sentMessageIds.add(result.key.id);
      if (session.sentMessageIds.size > 200) {
        session.sentMessageIds.delete(session.sentMessageIds.values().next().value);
      }
    }
    session.sock.onWhatsApp(phone).then(([info]) => {
      const lid = info?.jid?.endsWith('@lid') ? info.jid : info?.lid;
      if (lid) session.lidToPhone[lid] = phone;
    }).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    console.error(`[WA:${empresa_id}] Error enviando:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /logout  body: { empresa_id }
app.post('/logout', requireApiKey, async (req, res) => {
  const { empresa_id } = req.body;
  if (!empresa_id) return res.status(400).json({ error: 'empresa_id requerido' });
  try {
    const session = sessions.get(empresa_id);
    if (session?.reconnectTimer) clearTimeout(session.reconnectTimer);
    if (session?.sock) {
      try { await session.sock.logout(); } catch (_) {}
    }
    const dir = authDir(empresa_id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    sessions.delete(empresa_id);
    console.log(`[WA:${empresa_id}] Sesión cerrada`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /reconnect  body: { empresa_id }
app.post('/reconnect', requireApiKey, async (req, res) => {
  const { empresa_id } = req.body;
  if (!empresa_id) return res.status(400).json({ error: 'empresa_id requerido' });
  try {
    const session = sessions.get(empresa_id);
    if (session?.reconnectTimer) { clearTimeout(session.reconnectTimer); session.reconnectTimer = null; }
    if (session?.sock) {
      try { session.sock.end(undefined); } catch (_) {}
      session.sock = null;
    }
    if (session) { session.qr = null; session.phone = null; session.status = 'connecting'; }
    connectWhatsApp(empresa_id).catch(console.error);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[WA] Servicio multi-tenant corriendo en puerto ${PORT}`);
  autoStartSavedSessions();
});
