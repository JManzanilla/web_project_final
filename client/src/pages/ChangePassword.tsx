import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, Check } from "lucide-react";
import { sileo } from "sileo";

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const [, navigate] = useLocation();

  const [newPassword, setNewPassword]     = useState("");
  const [confirm, setConfirm]             = useState("");
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const isValid  = newPassword.length >= 6 && newPassword === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { sileo.warning({ title: "Contraseña muy corta", description: "Mínimo 6 caracteres" }); return; }
    if (newPassword !== confirm) { sileo.warning({ title: "Las contraseñas no coinciden" }); return; }
    const result = await changePassword(newPassword);
    if (result.success) {
      sileo.success({ title: "Contraseña actualizada", description: "Bienvenido al panel" });
      navigate("/");
    } else {
      sileo.error({ title: "Error", description: result.error ?? "No se pudo cambiar la contraseña" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Encabezado */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-7 h-7 text-brand-orange" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Crea tu contraseña
          </h2>
          <p className="text-white/35 text-sm mt-2">
            Hola{" "}
            <span className="text-white/70 font-semibold">{user?.name}</span>,
            elige una contraseña personal para tu cuenta
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 space-y-5">

          {/* Nueva contraseña */}
          <div className="space-y-2">
            <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
              Nueva contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className="glass-input h-12 pl-11 pr-12 text-base"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="space-y-2">
            <label className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="repite la contraseña"
                className={`glass-input h-12 pl-11 pr-12 text-base ${
                  mismatch ? "border-red-500/50" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mismatch && (
              <p className="text-red-400/80 text-xs font-medium">
                Las contraseñas no coinciden
              </p>
            )}
          </div>

          {/* Botón */}
          <Button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-full h-12 bg-brand-orange hover:bg-brand-orange/85 text-white font-bold text-base glow-orange transition-all mt-2 disabled:opacity-40"
          >
            <Check className="w-4 h-4 mr-2" />
            Guardar y continuar
          </Button>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          Esta contraseña es tuya — el administrador no la puede ver.
        </p>
      </div>
    </div>
  );
}
