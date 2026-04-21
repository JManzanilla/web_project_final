import React from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SileoToaster } from "sileo";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppBackground } from "./components/layout/AppBackground";
import {
  Home, Settings, Users, User,
  ClipboardList, History, Trophy,
  LogIn, LogOut, CalendarDays, Radio,
} from "lucide-react";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import NotFound          from "@/pages/not-found";
import HomePage          from "@/pages/Home";
import ConfigPage        from "@/pages/Config";
import AccountsPage      from "@/pages/Accounts";
import RosterPage        from "@/pages/Roster";
import MatchPage         from "@/pages/Match";
import MatchesPage       from "@/pages/Matches";
import HistoryPage       from "@/pages/History";
import SchedulePage      from "@/pages/Schedule";
import StandingsPage     from "@/pages/Standings";
import LoginPage         from "@/pages/Login";
import ChangePasswordPage from "@/pages/ChangePassword";
import StreamPage         from "@/pages/Stream";

// ---------------------------------------------------------------------------
// Ruta protegida — redirige si no está autenticado o no tiene el rol correcto
// ---------------------------------------------------------------------------
// Devuelve true si el usuario tiene acceso a la ruta
function hasAccess(user: ReturnType<typeof useAuth>["user"], roles: string[], section?: string) {
  if (!user) return false;
  if (roles.includes(user.role)) return true;
  if (section) return !!(user.permissions?.[section as import("@/context/AuthContext").SectionKey]?.view);
  return false;
}

function ProtectedRoute({
  component: Component,
  roles,
  section,
}: {
  component: React.ComponentType;
  roles: string[];
  section?: string;
}) {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (user.firstLogin) { navigate("/change-password"); return; }
    if (!hasAccess(user, roles, section)) { navigate("/"); return; }
  }, [user]);

  if (!user || !hasAccess(user, roles, section)) return null;
  if (user.firstLogin) return null;
  return <Component />;
}

// ---------------------------------------------------------------------------
// Navegación inferior — ítems según rol
// ---------------------------------------------------------------------------
function Navigation() {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => { logout(); navigate("/"); };

  // Ocultar nav en páginas de auth
  if (location === "/login" || location === "/change-password") return null;

  const publicItems = [
    { href: "/",          icon: Home,          label: "Inicio"        },
    { href: "/standings", icon: Trophy,         label: "Clasificación" },
    { href: "/history",   icon: History,        label: "Historial"     },
  ];

  const roleItems: { href: string; icon: React.ElementType; label: string }[] = [];

  const canAccess = (section: string) => hasAccess(user, ["admin"], section);

  if (user?.role === "lider" || user?.role === "admin" || canAccess("roster")) {
    roleItems.push({ href: "/roster",    icon: User,          label: "Roster"        });
  }
  if (user?.role === "anotador" || user?.role === "admin" || canAccess("match")) {
    roleItems.push({ href: "/matches",   icon: ClipboardList, label: "Mesa Técnica"  });
  }
  if (user?.role === "admin" || canAccess("schedule")) {
    roleItems.push({ href: "/schedule",  icon: CalendarDays,  label: "Calendario"    });
  }
  if (user?.role === "admin" || user?.role === "transmision") {
    roleItems.push({ href: "/stream",    icon: Radio,         label: "Transmisiones" });
  }
  if (user?.role === "admin" || canAccess("config")) {
    roleItems.push({ href: "/config",    icon: Settings,      label: "Configuración" });
  }
  if (user?.role === "admin" || canAccess("accounts")) {
    roleItems.push({ href: "/accounts",  icon: Users,         label: "Cuentas"       });
  }

  const navItems = [...publicItems, ...roleItems];
  const isAdmin = user?.role === "admin";

  const navLinks = (
    <>
      {navItems.map((item) => {
        const isActive =
          location === item.href ||
          (item.href !== "/" && location.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative p-3 rounded-full flex-shrink-0 transition-all duration-300 ${
              isActive
                ? "bg-brand-orange text-white glow-orange"
                : "text-white/50 hover:text-white hover:bg-white/10"
            }`}
            title={item.label}
          >
            <Icon size={20} />
          </Link>
        );
      })}

      {/* Separador */}
      <div className="w-px h-5 bg-white/10 flex-shrink-0" />

      {/* Login / Logout */}
      {user ? (
        <button
          onClick={handleLogout}
          className="p-3 rounded-full flex-shrink-0 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
          title={`Cerrar sesión — ${user.name}`}
        >
          <LogOut size={20} />
        </button>
      ) : (
        <Link
          href="/login"
          className={`p-3 rounded-full flex-shrink-0 transition-all duration-300 ${
            location === "/login"
              ? "bg-brand-orange text-white glow-orange"
              : "text-white/40 hover:text-green-400 hover:bg-green-500/10"
          }`}
          title="Iniciar sesión"
        >
          <LogIn size={20} />
        </Link>
      )}
    </>
  );

  /* Admin: movil=ancho fijo+scroll, desktop=auto extendido */
  if (isAdmin) {
    return (
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(320px,calc(100vw-32px))] sm:w-auto">
        <div className="glass-panel rounded-full px-4 sm:px-5 py-3.5 flex items-center gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible scrollbar-none scroll-smooth">
          {navLinks}
        </div>
      </nav>
    );
  }

  /* Resto de usuarios: pildora auto */
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-panel rounded-full px-5 py-3.5 flex items-center gap-3">
        {navLinks}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function Router() {
  const { user } = useAuth();
  const [, navigate] = useLocation(); // usado en rutas de auth inline

  return (
    <Switch>
      {/* Rutas públicas */}
      <Route path="/"          component={HomePage}      />
      <Route path="/standings" component={StandingsPage} />
      <Route path="/history"   component={HistoryPage}   />

      {/* Rutas de autenticación */}
      <Route path="/login">
        {() => {
          if (user && !user.firstLogin) { navigate("/"); return null; }
          return <LoginPage />;
        }}
      </Route>
      <Route path="/change-password">
        {() => {
          if (!user) { navigate("/login"); return null; }
          return <ChangePasswordPage />;
        }}
      </Route>

      {/* Rutas protegidas */}
      <Route path="/roster">
        {() => <ProtectedRoute component={RosterPage}    roles={["admin", "lider"]}     section="roster"   />}
      </Route>
      <Route path="/matches">
        {() => <ProtectedRoute component={MatchesPage}   roles={["admin", "anotador"]}  section="match"    />}
      </Route>
      <Route path="/match/:id">
        {() => <ProtectedRoute component={MatchPage}     roles={["admin", "anotador"]}  section="match"    />}
      </Route>
      <Route path="/schedule">
        {() => <ProtectedRoute component={SchedulePage}  roles={["admin"]}              section="schedule" />}
      </Route>
      <Route path="/config">
        {() => <ProtectedRoute component={ConfigPage}    roles={["admin"]}              section="config"   />}
      </Route>
      <Route path="/accounts">
        {() => <ProtectedRoute component={AccountsPage}  roles={["admin"]}              section="accounts" />}
      </Route>
      <Route path="/stream">
        {() => <ProtectedRoute component={StreamPage}    roles={["admin", "transmision"]}                 />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppBackground />
          <div className="min-h-screen text-white pb-32 overflow-x-hidden">
            <Router />
            <Navigation />
          </div>
          <Toaster />
          <SileoToaster position="top-center" theme="light" options={{ fill: "#000000", duration: 10000 }} />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
