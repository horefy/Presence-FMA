"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Table2 } from "lucide-react";
import { Alert } from "@/components/ui";
import { getErrorMessage } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { username: "admin", label: "Super administrateur" },
  { username: "direction", label: "Administrateur" },
  { username: "rh", label: "Ressources humaines" },
  { username: "enseignant", label: "Enseignant" },
  { username: "secretariat", label: "Secretariat" },
  { username: "comptable", label: "Comptable" },
  { username: "tuteur", label: "Tuteur" },
];

/**
 * Modele de connexion (page de connexion moderne : fond gradue, panneau gauche
 * abstrait, champs soulignes, bouton gradient) adapte au theme indigo/slate de
 * la plateforme.
 */
const PAGE_GRADIENT =
  "linear-gradient(135deg, #A855F7 0%, #7C3AED 48%, #4F46E5 100%)";
const PANEL_GRADIENT =
  "linear-gradient(155deg, #00A9F5 0%, #174BEF 45%, #B74DF2 100%)";
const UNDERLINE_GRADIENT = "linear-gradient(to right, #7C3AED, #3B82F6)";
const BUTTON_GRADIENT =
  "linear-gradient(to right, #2563EB, #4F46E5 50%, #7C3AED)";

/** Cle du stockage local pour le rappel d'identifiant (« Se souvenir de moi »). */
const REMEMBER_KEY = "gp_login_identifier";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hint, setHint] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  /* Identifiant enregistre : lecture apres hydration (pas de desynchronisation). */
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const saved = window.localStorage.getItem(REMEMBER_KEY);
        if (saved) {
          setUsername(saved);
          setRemember(true);
        }
      } catch {
        /* Stockage local indisponible : on ignore. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setHint(null);
    setLoading(true);
    try {
      const id = username.trim();
      try {
        if (remember) window.localStorage.setItem(REMEMBER_KEY, id);
        else window.localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* Stockage local indisponible : on ignore. */
      }
      const res = await signIn("credentials", {
        username: id,
        password,
        redirect: false,
        redirectTo: callbackUrl,
      });
      if (res?.error) {
        setError("Identifiants invalides. Veuillez verifier votre saisie.");
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (e) {
      setError(getErrorMessage(e));
      setLoading(false);
    }
  }

  function fillDemo(u: string) {
    setUsername(u);
    setPassword("Password123!");
    setRemember(false);
    setError(null);
    setHint(null);
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{ backgroundImage: PAGE_GRADIENT }}
    >
      <div className="w-full max-w-[880px] overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid lg:min-h-[560px] lg:grid-cols-[55fr_45fr]">
        {/* ---------------------- Panneau gauche : abstrait ---------------------- */}
        <div
          className="relative hidden overflow-hidden lg:block"
          style={{ backgroundImage: PANEL_GRADIENT }}
        >
          {/* Vague claire en bas : zone du lien du site */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
            style={{
              backgroundImage:
                "linear-gradient(to top, rgba(244,247,252,0.92), rgba(244,247,252,0))",
            }}
          />
          {/* Cercles a degradés (le model : haut centre, bas gauche, bas droite) */}
          <div
            className="pointer-events-none absolute left-1/2 top-16 h-52 w-52 -translate-x-1/2 rounded-full opacity-75 blur-[2px]"
            style={{ backgroundImage: "linear-gradient(135deg, #00C7E8, #A94DEB)" }}
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-24 h-64 w-64 rounded-full opacity-60 blur-[2px]"
            style={{ backgroundImage: "linear-gradient(135deg, #0055F5, #A34DEB)" }}
          />
          <div
            className="pointer-events-none absolute right-12 bottom-44 h-24 w-24 rounded-full opacity-75"
            style={{ backgroundImage: "linear-gradient(135deg, #00C5EA, #C04DEB)" }}
          />
          {/* Onde abstraite lisse */}
          <div className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rotate-12 rounded-[45%] bg-white/10 blur-2xl" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-10 text-center">
            {/* Marque de la plateforme */}
            <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Table2 className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-white">Gestion Presences</p>
            </div>

            <p className="text-[32px] font-normal leading-tight text-white">
              Bienvenue
            </p>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.3em] text-[#DCE7FF]">
              Connectez-vous a votre compte
            </p>
          </div>

          <p className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[11px] font-semibold tracking-[0.35em] text-[#252525]">
            W W W . E C O L E . M G
          </p>
        </div>

        {/* ---------------------- Panneau droit : formulaire ---------------------- */}
        <div className="flex flex-col justify-center bg-white p-8 sm:p-11">
          <p className="text-[15px] text-[#777777]">Bonjour !</p>
          <p className="mt-0.5 text-[16px] font-bold text-[#4F46E5]">
            Content de vous revoir !
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#292929]">
            <span className="text-[#4F46E5]">Connectez-vous</span> a votre compte
          </h1>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            {error ? <Alert tone="error">{error}</Alert> : null}
            {hint ? <Alert tone="info">{hint}</Alert> : null}

            {/* Champ : identifiant / e-mail (souligné dégradé) */}
            <div className="relative pb-2">
              <label
                htmlFor="username"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Adresse e-mail ou identifiant
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@ecole.mg"
                className="w-full border-0 border-b border-slate-200 bg-transparent px-0 py-2 text-sm text-slate-900 outline-none placeholder:text-[#9BAFC5] focus:border-slate-300"
              />
              <div
                className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full rounded-full"
                style={{ backgroundImage: UNDERLINE_GRADIENT }}
              />
            </div>

            {/* Champ : mot de passe (souligné dégradé) */}
            <div className="relative pb-2">
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border-0 border-b border-slate-200 bg-transparent px-0 py-2 text-sm text-slate-900 outline-none placeholder:text-[#9BAFC5] focus:border-slate-300"
              />
              <div
                className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full rounded-full"
                style={{ backgroundImage: UNDERLINE_GRADIENT }}
              />
            </div>

            {/* Rappel + mot de passe oublie */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-indigo-600"
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setHint(
                    "Contactez l'administrateur de votre etablissement pour reinitialiser votre mot de passe.",
                  );
                }}
                className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-800"
              >
                Mot de passe oublie ?
              </button>
            </div>

            {/* Bouton gradient */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold uppercase tracking-[3px] text-white shadow-lg transition-transform hover:brightness-110 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
              style={{ backgroundImage: BUTTON_GRADIENT }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Se connecter
            </button>

            <p className="text-center text-xs text-[#555555]">
              Pas encore de compte ?{" "}
              <a
                href="mailto:direction@ecole.mg"
                className="font-semibold text-indigo-600 hover:underline"
              >
                Demander un acces
              </a>
            </p>
          </form>

          {/* Comptes de demonstration */}
          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Comptes de demonstration
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => fillDemo(a.username)}
                  title={`${a.username} / Password123!`}
                  className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
