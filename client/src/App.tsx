import React, { useState, useEffect, useRef } from "react";
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
  LogIn, LogOut, CalendarDays, Radio, ScrollText,
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
import OfficialsPage          from "@/pages/Officials";
import OfficialSchedulePage  from "@/pages/OfficialSchedule";

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
// Navegación inferior — ítems según rol, con grupos desplegables
// ---------------------------------------------------------------------------
type NavItem   = { kind: "link";  href: string; icon: React.ElementType; label: string };
type NavGroup  = { kind: "group"; id: string; icon: React.ElementType; label: string; items: { href: string; label: string; icon: React.ElementType }[] };
type NavEntry  = NavItem | NavGroup;

function NavGroupButton({ group, location, openId, setOpenId }: {
  group: NavGroup; location: string; openId: string | null; setOpenId: (id: string | null) => void;
}) {
  const isOpen   = openId === group.id;
  const isActive = group.items.some((i) => location === i.href || location.startsWith(i.href));
  const Icon     = group.icon;

  return (
    <div className="relative flex-shrink-0">
      {/* Submenu flotante */}
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex flex-col items-center gap-1.5 z-50">
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const active = location === item.href || location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setOpenId(null)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all
                  ${active
                    ? "bg-brand-orange text-white glow-orange"
                    : "glass-panel text-white/80 hover:text-white hover:bg-white/15"
                  }`}>
                <ItemIcon size={14} />
                {item.label}
              </Link>
            );
          })}
          {/* Flecha indicadora */}
          <div className="w-2 h-2 bg-white/20 rotate-45 -mt-0.5" />
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); setOpenId(isOpen ? null : group.id); }}
        className={`p-3 rounded-full transition-all duration-300 ${
          isActive || isOpen
            ? "bg-brand-orange text-white glow-orange"
            : "text-white/50 hover:text-white hover:bg-white/10"
        }`}
        title={group.label}
      >
        <Icon size={20} />
      </button>
    </div>
  );
}

function Navigation() {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Cerrar submenu al clicar fuera
  useEffect(() => {
    if (!openSubmenu) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenSubmenu(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openSubmenu]);

  // Cerrar al cambiar de ruta
  useEffect(() => { setOpenSubmenu(null); }, [location]);

  const handleLogout = () => { logout(); navigate("/"); };

  if (location === "/login" || location === "/change-password") return null;

  const canAccess = (section: string) => hasAccess(user, ["admin"], section);

  const entries: NavEntry[] = [
    { kind: "link",  href: "/",          icon: Home,        label: "Inicio"        },
    { kind: "link",  href: "/standings", icon: Trophy,      label: "Clasificación" },
    { kind: "link",  href: "/history",   icon: History,     label: "Historial"     },
  ];

  if (user?.role === "lider" || user?.role === "admin" || canAccess("roster")) {
    entries.push({ kind: "link", href: "/roster", icon: User, label: "Roster" });
  }
  if (user?.role === "anotador" || user?.role === "admin" || canAccess("match")) {
    entries.push({ kind: "link", href: "/matches", icon: ClipboardList, label: "Mesa Técnica" });
  }

  // Grupo Calendario: Calendario + Rol Árbitros
  const calItems: NavGroup["items"] = [];
  if (user?.role === "admin" || canAccess("schedule"))
    calItems.push({ href: "/schedule",          label: "Calendario",   icon: CalendarDays });
  if (user?.role === "admin" || canAccess("official-schedule"))
    calItems.push({ href: "/official-schedule", label: "Rol Árbitros", icon: ScrollText   });

  if (calItems.length === 1) {
    entries.push({ kind: "link", href: calItems[0].href, icon: calItems[0].icon, label: calItems[0].label });
  } else if (calItems.length > 1) {
    entries.push({ kind: "group", id: "calendar", icon: CalendarDays, label: "Calendario", items: calItems });
  }

  if (user?.role === "admin" || user?.role === "transmision") {
    entries.push({ kind: "link", href: "/stream", icon: Radio, label: "Transmisiones" });
  }

  // Grupo Admin: Configuración + Cuentas
  const adminItems: NavGroup["items"] = [];
  if (user?.role === "admin" || canAccess("config"))
    adminItems.push({ href: "/config",   label: "Configuración", icon: Settings });
  if (user?.role === "admin" || canAccess("accounts"))
    adminItems.push({ href: "/accounts", label: "Cuentas",       icon: Users    });

  if (adminItems.length === 1) {
    entries.push({ kind: "link", href: adminItems[0].href, icon: adminItems[0].icon, label: adminItems[0].label });
  } else if (adminItems.length > 1) {
    entries.push({ kind: "group", id: "admin", icon: Settings, label: "Admin", items: adminItems });
  }

  const navLinks = (
    <>
      {entries.map((entry) => {
        if (entry.kind === "group") {
          return <NavGroupButton key={entry.id} group={entry} location={location} openId={openSubmenu} setOpenId={setOpenSubmenu} />;
        }
        const isActive = location === entry.href || (entry.href !== "/" && location.startsWith(entry.href));
        const Icon = entry.icon;
        return (
          <Link key={entry.href} href={entry.href}
            className={`p-3 rounded-full flex-shrink-0 transition-all duration-300 ${
              isActive ? "bg-brand-orange text-white glow-orange" : "text-white/50 hover:text-white hover:bg-white/10"
            }`}
            title={entry.label}>
            <Icon size={20} />
          </Link>
        );
      })}

      <div className="w-px h-5 bg-white/10 flex-shrink-0" />

      {user ? (
        <button onClick={handleLogout}
          className="p-3 rounded-full flex-shrink-0 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
          title={`Cerrar sesión — ${user.name}`}>
          <LogOut size={20} />
        </button>
      ) : (
        <Link href="/login"
          className={`p-3 rounded-full flex-shrink-0 transition-all duration-300 ${
            location === "/login" ? "bg-brand-orange text-white glow-orange" : "text-white/40 hover:text-green-400 hover:bg-green-500/10"
          }`}
          title="Iniciar sesión">
          <LogIn size={20} />
        </Link>
      )}
    </>
  );

  return (
    <nav ref={navRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-panel rounded-full px-5 py-3.5 flex items-center gap-2 sm:gap-3">
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
      <Route path="/officials">
        {() => <ProtectedRoute component={OfficialsPage}         roles={["admin"]} section="officials"          />}
      </Route>
      <Route path="/official-schedule">
        {() => <ProtectedRoute component={OfficialSchedulePage}  roles={["admin"]} section="official-schedule"  />}
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
          <div className="min-h-screen text-white pb-32 [overflow-x:clip]">
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
