"use client";

import { useState } from "react";
import { Compass, KeyRound, UserRound } from "lucide-react";

type Mode = "login" | "register";

export function LoginPanel() {
  const [mode, setMode] = useState<Mode>("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Accesso non riuscito. Verifica che il database sia aggiornato.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Il server non risponde. Controlla i log di Coolify e lo stato del database.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-archive-950 text-ink">
      <section className="grid min-h-screen lg:grid-cols-[1fr_26rem]">
        <div className="relative flex min-h-[34rem] items-center justify-center border-b border-white/10 bg-[url('/brand/citycase-brand-board.png')] bg-cover bg-center lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-black/65" />
          <div className="relative max-w-3xl px-8">
            <img src="/brand/citycase-logo-symbol.png" alt="CityCase Nodo Intrecciato" className="h-24 w-24 border border-brass/40 object-cover" />
            <p className="mt-8 text-sm uppercase tracking-[0.34em] text-brass">CityCase</p>
            <h1 className="mt-3 text-5xl font-semibold leading-tight md:text-6xl">Archivio investigativo urbano</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/75">
              Entra con il tuo nickname, conserva note e connessioni personali, e continua il fascicolo dal punto in cui lo hai lasciato.
            </p>
          </div>
        </div>

        <div className="flex items-center bg-archive-900 px-6 py-10">
          <form onSubmit={submit} className="w-full border border-white/10 bg-black/20 p-6 shadow-panel">
            <div className="flex items-center gap-3">
              <Compass className="text-brass" size={28} />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-ledger">Accesso analista</p>
                <h2 className="text-2xl font-semibold">{mode === "login" ? "Bentornato" : "Nuovo profilo"}</h2>
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="flex items-center gap-2 text-archive-500">
                  <UserRound size={15} />
                  Nickname
                </span>
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className="border border-white/10 bg-archive-950 px-3 py-3 text-ink outline-none focus:border-brass/70"
                  autoComplete="username"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="flex items-center gap-2 text-archive-500">
                  <KeyRound size={15} />
                  Password
                </span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="border border-white/10 bg-archive-950 px-3 py-3 text-ink outline-none focus:border-brass/70"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </label>
            </div>

            {error ? <p className="mt-4 border border-rust/50 bg-rust/10 p-3 text-sm text-ink">{error}</p> : null}

            <button className="mt-6 w-full border border-brass/60 bg-brass px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black" disabled={loading}>
              {loading ? "Attendi..." : mode === "login" ? "Entra" : "Crea profilo"}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="mt-4 w-full border border-white/10 px-4 py-3 text-sm text-archive-500 transition hover:border-brass/40 hover:text-ink"
            >
              {mode === "login" ? "Crea un nuovo nickname" : "Ho già un profilo"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
