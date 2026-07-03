"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <button onClick={logout} className="border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-archive-500 transition hover:border-brass/50 hover:text-brass">
      Esci
    </button>
  );
}
