"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, AtSign, Compass, KeyRound, Mail } from "lucide-react";

type Mode = "login" | "register";
type Step = "email" | "password";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPanel() {
  const [mode, setMode] = useState<Mode>("register");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = emailPattern.test(normalizedEmail);
  const title = step === "email" ? "Qual e la tua e-mail?" : mode === "login" ? "Inserisci la password" : "Crea il tuo accesso";
  const actionLabel = loading ? "Attendi..." : mode === "login" ? "Accedi" : "Crea account";

  const helperText = useMemo(() => {
    if (step === "email") return "Useremo la tua e-mail per salvare progressi, note e connessioni del fascicolo.";
    if (mode === "login") return normalizedEmail;
    return "Scegli una password: il tuo archivio personale restera collegato a questa e-mail.";
  }, [mode, normalizedEmail, step]);

  async function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!emailIsValid) {
      setError("Inserisci un indirizzo e-mail valido.");
      return;
    }

    setStep("password");
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < (mode === "register" ? 8 : 1)) {
      setError(mode === "register" ? "La password deve avere almeno 8 caratteri." : "Inserisci la password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password, displayName })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Accesso non riuscito. Verifica che il database sia aggiornato.");
        return;
      }

      window.location.assign("/");
    } catch {
      setError("Il server non risponde. Controlla lo stato dell'app in Coolify.");
    } finally {
      setLoading(false);
    }
  }

  function resetEmail() {
    setStep("email");
    setPassword("");
    setError("");
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setPassword("");
    setError("");
    if (!emailIsValid) setStep("email");
  }

  function socialUnavailable(provider: string) {
    setError(`${provider} sara collegato quando configureremo OAuth. Per ora entra con e-mail e password.`);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#14151b] text-ink">
      <section className="grid min-h-screen lg:grid-cols-[1fr_34rem]">
        <div className="relative flex min-h-[34rem] items-center justify-center bg-[url('/brand/citycase-brand-board.png')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-y-0 right-0 hidden w-px bg-brass/25 lg:block" />
          <div className="relative max-w-3xl px-8">
            <img src="/brand/citycase-logo-symbol.png" alt="CityCase Nodo Intrecciato" className="h-24 w-24 border border-brass/40 object-cover" />
            <p className="mt-8 text-sm uppercase tracking-[0.34em] text-brass">CityCase</p>
            <h1 className="mt-3 max-w-xl text-5xl font-semibold leading-tight md:text-6xl">Archivio investigativo urbano</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/75">
              Entra con la tua e-mail, conserva note e connessioni personali, e continua il fascicolo dal punto in cui lo hai lasciato.
            </p>
          </div>
        </div>

        <div className="flex items-center bg-archive-900 px-7 py-10">
          <div className="w-full">
            {step === "password" ? (
              <button type="button" onClick={resetEmail} className="mb-8 inline-flex items-center gap-3 text-lg text-ink/80 transition hover:text-ink">
                <ArrowLeft size={23} />
                Indietro
              </button>
            ) : null}

            <form onSubmit={step === "email" ? continueWithEmail : submitPassword} className="w-full">
              <div className="mb-8">
                <p className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-ledger">
                  <Compass className="text-brass" size={22} />
                  Accesso analista
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">{title}</h2>
                <p className="mt-4 min-h-6 text-base text-ink/60">{helperText}</p>
              </div>

              {step === "email" ? (
                <label className="grid gap-3 text-lg text-ink/70">
                  Indirizzo e-mail
                  <span className="flex items-center rounded-[1.35rem] border border-white/35 bg-white/[0.03] px-5 transition focus-within:border-brass/70">
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className="min-h-16 flex-1 bg-transparent text-xl text-ink outline-none"
                    />
                    <AtSign className="text-ink/45" size={28} />
                  </span>
                </label>
              ) : (
                <div className="grid gap-5">
                  {mode === "register" ? (
                    <label className="grid gap-3 text-lg text-ink/70">
                      Nome visibile
                      <span className="flex items-center rounded-[1.35rem] border border-white/25 bg-white/[0.03] px-5 transition focus-within:border-brass/70">
                        <input
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          autoComplete="name"
                          placeholder="Es. Andrea"
                          className="min-h-16 flex-1 bg-transparent text-xl text-ink outline-none placeholder:text-ink/25"
                        />
                      </span>
                    </label>
                  ) : null}

                  <label className="grid gap-3 text-lg text-ink/70">
                    Password
                    <span className="flex items-center rounded-[1.35rem] border border-white/35 bg-white/[0.03] px-5 transition focus-within:border-brass/70">
                      <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        className="min-h-16 flex-1 bg-transparent text-xl text-ink outline-none"
                      />
                      <KeyRound className="text-ink/45" size={28} />
                    </span>
                  </label>
                </div>
              )}

              {error ? <p className="mt-5 rounded-xl border border-rust/50 bg-rust/10 p-4 text-sm leading-6 text-ink">{error}</p> : null}

              <button
                className="mt-8 min-h-16 w-full rounded-[1.35rem] bg-brass px-4 text-xl font-semibold text-black transition hover:bg-[#e0bd5c] disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-black/55"
                disabled={loading || (step === "email" && !emailIsValid)}
              >
                {step === "email" ? "Continua" : actionLabel}
              </button>
            </form>

            {step === "email" ? (
              <>
                <div className="my-9 grid grid-cols-[1fr_auto_1fr] items-center gap-6 text-lg text-ink/60">
                  <span className="h-px bg-white/14" />
                  oppure
                  <span className="h-px bg-white/14" />
                </div>

                <div className="grid gap-5">
                  <button
                    type="button"
                    onClick={() => socialUnavailable("Google")}
                    className="grid min-h-16 grid-cols-[4rem_1fr_4rem] items-center rounded-full bg-white/[0.04] text-xl text-ink transition hover:bg-white/[0.07]"
                  >
                    <span className="ml-2 grid h-12 w-12 place-items-center rounded-full bg-white text-2xl font-bold text-[#4285f4]">G</span>
                    Continua con Google
                    <span />
                  </button>
                  <button
                    type="button"
                    onClick={() => socialUnavailable("Apple")}
                    className="grid min-h-16 grid-cols-[4rem_1fr_4rem] items-center rounded-full bg-white/[0.04] text-xl text-ink transition hover:bg-white/[0.07]"
                  >
                    <span className="ml-2 grid h-12 w-12 place-items-center rounded-full bg-white text-2xl font-bold text-black">A</span>
                    Continua con Apple
                    <span />
                  </button>
                </div>
              </>
            ) : null}

            <div className="mt-9 text-center text-lg text-ink/60">
              {mode === "register" ? "Hai gia un account? " : "Non hai ancora un account? "}
              <button type="button" onClick={() => switchMode(mode === "register" ? "login" : "register")} className="text-[#39bdf8] underline underline-offset-4">
                {mode === "register" ? "Accedi" : "Registrati"}
              </button>
            </div>

            <a href="mailto:privacy@citycase.it" className="mt-10 flex items-center justify-center gap-2 text-center text-lg text-[#39bdf8] underline underline-offset-4">
              <Mail size={18} />
              Informativa sulla privacy
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
