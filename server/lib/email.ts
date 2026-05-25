import { Resend } from "resend";

const client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function now() {
  return new Date().toLocaleString("es-MX", {
    timeZone: "America/Monterrey",
    dateStyle: "full",
    timeStyle: "short",
  });
}

async function send(subject: string, html: string) {
  if (!client || !process.env.ADMIN_EMAIL) return;
  try {
    await client.emails.send({
      from: "Torneo Municipal <onboarding@resend.dev>",
      to:   process.env.ADMIN_EMAIL,
      subject: `🔒 ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0d0d0d;color:#fff;border-radius:12px">
          <h2 style="color:#ff4500;margin:0 0 16px">🔒 Alerta de Seguridad</h2>
          ${html}
          <hr style="border-color:#333;margin:20px 0"/>
          <p style="font-size:12px;color:#666">Torneo Municipal — Sistema de notificaciones automáticas</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("[email] Error al enviar notificación:", e);
  }
}

// ── Zona de peligro ejecutada ────────────────────────────────────────────────
const SCOPE_LABELS: Record<string, string> = {
  matches: "Borrar calendario",
  players: "Borrar jugadores",
  all:     "Resetear todo",
};

export async function notifyDangerZone(scope: string, adminName: string, ip: string) {
  const label = SCOPE_LABELS[scope] ?? scope;
  await send(`Zona de peligro: "${label}"`, `
    <p>El administrador <strong style="color:#ff4500">${adminName}</strong>
    ejecutó la acción <strong>"${label}"</strong>.</p>
    <table style="width:100%;font-size:14px;color:#aaa;margin-top:12px">
      <tr><td>📅 Fecha</td><td>${now()}</td></tr>
      <tr><td>🌐 IP</td><td>${ip}</td></tr>
    </table>
    <p style="color:#f87171;margin-top:16px">Si no fuiste tú, cambia tu contraseña inmediatamente.</p>
  `);
}

// ── Nueva cuenta admin ───────────────────────────────────────────────────────
export async function notifyNewAdmin(newUsername: string, createdBy: string, ip: string) {
  await send(`Nueva cuenta admin: "${newUsername}"`, `
    <p>El administrador <strong style="color:#ff4500">${createdBy}</strong>
    creó una nueva cuenta con rol <strong>admin</strong>:
    <strong>${newUsername}</strong>.</p>
    <table style="width:100%;font-size:14px;color:#aaa;margin-top:12px">
      <tr><td>📅 Fecha</td><td>${now()}</td></tr>
      <tr><td>🌐 IP</td><td>${ip}</td></tr>
    </table>
    <p style="color:#f87171;margin-top:16px">Si no autorizaste esto, revisa tu sistema de inmediato.</p>
  `);
}

// ── Intentos fallidos de login ───────────────────────────────────────────────
// Rastreo en memoria: clave = "username:ip"
const failMap = new Map<string, { count: number; lastSent: number }>();

export function trackFailedLogin(username: string, ip: string): void {
  const key   = `${username}:${ip}`;
  const entry = failMap.get(key) ?? { count: 0, lastSent: 0 };
  entry.count++;
  failMap.set(key, entry);

  // Notifica al 3er intento y cada 3 después, con cooldown de 1 hora
  if (entry.count >= 3 && entry.count % 3 === 0) {
    const nowMs = Date.now();
    if (nowMs - entry.lastSent > 3_600_000) {
      entry.lastSent = nowMs;
      send(`${entry.count} intentos fallidos: "${username}"`, `
        <p>Se detectaron <strong style="color:#ff4500">${entry.count} intentos fallidos</strong>
        de inicio de sesión para el usuario <strong>${username}</strong>.</p>
        <table style="width:100%;font-size:14px;color:#aaa;margin-top:12px">
          <tr><td>📅 Fecha</td><td>${now()}</td></tr>
          <tr><td>🌐 IP</td><td>${ip}</td></tr>
        </table>
        <p style="color:#f87171;margin-top:16px">Si no eres tú, alguien podría estar intentando acceder a tu sistema.</p>
      `).catch(() => {});
    }
  }
}

export function resetFailedLogins(username: string, ip: string): void {
  failMap.delete(`${username}:${ip}`);
}
