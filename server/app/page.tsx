export default function Home() {
  const endpoints = [
    ["POST",  "/api/auth/signin",               "Iniciar sesión"],
    ["POST",  "/api/auth/signout",              "Cerrar sesión"],
    ["PUT",   "/api/auth/change-password",      "Cambiar contraseña"],
    ["GET",   "/api/teams",                     "Listar equipos"],
    ["POST",  "/api/teams",                     "Crear equipo (admin)"],
    ["GET",   "/api/players?teamId=",           "Listar jugadores"],
    ["POST",  "/api/players",                   "Agregar jugador"],
    ["GET",   "/api/matches?jornada=&status=",  "Listar partidos"],
    ["POST",  "/api/matches",                   "Crear partido (admin)"],
    ["PUT",   "/api/matches/:id",               "Actualizar marcador"],
    ["PUT",   "/api/matches/:id/officials",     "Guardar oficiales"],
    ["PUT",   "/api/matches/:id/stats",         "Guardar estadísticas"],
    ["GET",   "/api/standings",                 "Tabla de posiciones"],
    ["GET",   "/api/config",                    "Configuración del torneo"],
    ["PUT",   "/api/config",                    "Actualizar configuración (admin)"],
    ["GET",   "/api/users",                     "Listar usuarios (admin)"],
    ["POST",  "/api/users",                     "Crear usuario (admin)"],
    ["PUT",   "/api/users/:id/reset-password",  "Resetear contraseña (admin)"],
  ];

  const color = (m: string) =>
    m === "GET"  ? { bg: "#1e3a5f", fg: "#60a5fa" } :
    m === "POST" ? { bg: "#14532d", fg: "#4ade80" } :
                   { bg: "#422006", fg: "#fb923c" };

  return (
    <main style={{ fontFamily: "monospace", padding: "2rem", background: "#0f0f0f", minHeight: "100vh" }}>
      <h1 style={{ color: "#f97316", marginBottom: "0.25rem" }}>🏀 Torneo API</h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
        Backend del Torneo Municipal — Next.js 15 · Drizzle ORM · Supabase PostgreSQL
      </p>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {endpoints.map(([method, path, desc]) => {
          const c = color(method);
          return (
            <li key={path} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ background: c.bg, color: c.fg, padding: "0.1rem 0.6rem", borderRadius: 4, fontSize: "0.7rem", minWidth: 44, textAlign: "center" }}>
                {method}
              </span>
              <code style={{ color: "#d1d5db", fontSize: "0.85rem" }}>{path}</code>
              <span style={{ color: "#4b5563", fontSize: "0.8rem" }}>{desc}</span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
