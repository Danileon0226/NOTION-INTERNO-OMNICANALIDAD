"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Delete, Lock, LogOut } from "lucide-react";
import { useLock } from "@/lib/lock";
import { authMode, signOutAccount } from "@/lib/account";
import zeroMark from "@/brand/zero-mark.png";

const PIN_LEN = 4;

// Pantalla de bloqueo con PIN: cubre todo el OS hasta desbloquear.
// Teclado táctil + soporte de teclado físico; sacude ante PIN incorrecto.
export function LockScreen() {
  const unlock = useLock((s) => s.unlock);
  const clearPin = useLock((s) => s.clearPin);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = useCallback(
    async (value: string) => {
      const ok = await unlock(value);
      if (!ok) {
        setError(true);
        setPin("");
        setTimeout(() => setError(false), 450);
      }
    },
    [unlock]
  );

  const press = useCallback(
    (d: string) => {
      setError(false);
      setPin((p) => {
        if (p.length >= PIN_LEN) return p;
        const next = p + d;
        if (next.length === PIN_LEN) void submit(next);
        return next;
      });
    },
    [submit]
  );

  const back = useCallback(() => {
    setError(false);
    setPin((p) => p.slice(0, -1));
  }, []);

  // Teclado físico.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back]);

  function forgot() {
    clearPin();
    if (authMode !== "open") void signOutAccount();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--night)] px-4">
      <div className="brand-halo w-full max-w-xs text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <Image src={zeroMark} alt="ZERO AGENCY" width={38} height={38} className="h-9 w-9 rounded-lg" />
        </div>
        <h1 className="flex items-center justify-center gap-1.5 text-base font-semibold text-white">
          <Lock size={15} /> ZERO bloqueado
        </h1>
        <p className="mt-1 text-[13px] text-white/55">Introduce tu PIN para continuar</p>

        {/* Puntos */}
        <div className={`my-6 flex items-center justify-center gap-3 ${error ? "lock-shake" : ""}`}>
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border transition ${
                i < pin.length ? "border-transparent bg-white" : "border-white/30"
              } ${error ? "border-red-400" : ""}`}
            />
          ))}
        </div>

        {/* Teclado */}
        <div className="mx-auto grid max-w-[15rem] grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => press(d)}>
              {d}
            </Key>
          ))}
          <span />
          <Key onClick={() => press("0")}>0</Key>
          <Key onClick={back} aria-label="Borrar">
            <Delete size={18} className="mx-auto" />
          </Key>
        </div>

        <button
          onClick={forgot}
          className="mt-7 inline-flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white/80"
        >
          <LogOut size={12} /> ¿Olvidaste tu PIN? {authMode !== "open" ? "Cerrar sesión" : "Quitar PIN"}
        </button>
      </div>
    </div>
  );
}

function Key({ children, onClick, ...rest }: React.ComponentProps<"button">) {
  return (
    <button
      onClick={onClick}
      {...rest}
      className="grid h-16 w-16 place-items-center justify-self-center rounded-full bg-white/8 text-xl font-medium text-white ring-1 ring-white/10 transition hover:bg-white/15 active:scale-95"
    >
      {children}
    </button>
  );
}
