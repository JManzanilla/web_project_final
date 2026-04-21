import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { sileo } from "sileo";

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      sileo.error({ title: "Acceso denegado", description: result.error ?? "Usuario o contraseña incorrectos" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Título */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
            TORNEO <span className="text-brand-orange">MUNICIPAL</span>
          </h1>
          <p className="text-white/30 text-sm mt-2 font-medium">
            Acceso al panel de gestión
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 space-y-5">

          {/* Usuario */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu usuario"
                className="glass-input h-12 pl-11 text-base"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input h-12 pl-11 pr-12 text-base"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón */}
          <Button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full rounded-full h-12 bg-brand-orange hover:bg-brand-orange/85 text-white font-bold text-base glow-orange transition-all mt-2"
          >
            {loading ? "Verificando..." : "Iniciar sesión"}
          </Button>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          ¿Olvidaste tu contraseña? Contacta al administrador del torneo.
        </p>
      </div>
    </div>
  );
}
