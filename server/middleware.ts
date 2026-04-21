import { NextResponse, type NextRequest } from "next/server";

// Configura CORS para que el frontend Vite pueda llamar a la API
export function middleware(req: NextRequest) {
  const origin  = req.headers.get("origin") ?? "";
  const allowed = process.env.FRONTEND_URL ?? "http://localhost:5000";

  // Preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin":      allowed,
        "Access-Control-Allow-Methods":     "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":     "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  const res = NextResponse.next();
  if (origin === allowed) {
    res.headers.set("Access-Control-Allow-Origin",      allowed);
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
