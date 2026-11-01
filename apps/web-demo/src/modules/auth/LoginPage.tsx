import { useState } from "react";
import { useAuth } from "../../core/auth/AuthContext";
import { Alert } from "../../shared/ui/Alert";
import { Button } from "../../shared/ui/Button";
import { Spinner } from "../../shared/ui/Spinner";

export function LoginPage() {
  const { loginWithKeycloak, loginWithMockGoogle, error, bootstrapping } = useAuth();
  const [busy, setBusy] = useState<"keycloak" | "google" | null>(null);

  if (bootstrapping) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <Spinner label="Checking session…" />
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-teal-100/80 via-slate-50 to-slate-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(135deg,transparent_40%,rgba(15,118,110,0.08)_100%)]"
      />

      <main className="relative mx-auto flex min-h-full max-w-lg flex-col justify-center px-6 py-16">
        <p className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          ContractFlow AI
        </p>
        <h1 className="mt-4 text-xl font-medium text-slate-800">
          Compare personal service contracts with clear, document-backed reports.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Sign in to upload your current contract and proposals, run an async AI
          comparison, and download the PDF report.
        </p>

        {error ? (
          <div className="mt-6">
            <Alert variant="danger">{error}</Alert>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <Button
            variant="primary"
            disabled={busy !== null}
            onClick={() => {
              setBusy("keycloak");
              void loginWithKeycloak().finally(() => setBusy(null));
            }}
          >
            {busy === "keycloak" ? "Redirecting…" : "Sign in with Keycloak"}
          </Button>

          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={() => {
              setBusy("google");
              void loginWithMockGoogle().finally(() => setBusy(null));
            }}
          >
            <GoogleMark />
            {busy === "google" ? "Connecting…" : "Continue with Google (mock)"}
          </Button>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Demo Keycloak user: <code className="rounded bg-slate-200/80 px-1">demo</code> /{" "}
          <code className="rounded bg-slate-200/80 px-1">demo</code>. Open the app as{" "}
          <code className="rounded bg-slate-200/80 px-1">http://localhost:8088</code>.
        </p>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.7S8.9 6 12 6c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.8 3.7 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
