import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import LogoMark from "../components/LogoMark";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setSubmitting(true);
    // TODO: replace with real auth call once backend auth is wired up
    setTimeout(() => {
      setSubmitting(false);
      navigate("/patients");
    }, 700);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col">
      {/* Structural top bar, consistent with the rest of the app */}
      <div className="h-14 w-full bg-navy-900 flex items-center px-6 border-b-2 border-gold-500">
        <LogoMark size={28} />
        <span className="ml-2.5 text-sm font-semibold text-white tracking-wide uppercase">
          LabPilot <span className="text-gold-400">AI</span>
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-slate-300">
            <div className="px-7 py-5 border-b border-slate-200">
              <h1 className="text-base font-semibold text-slate-900 uppercase tracking-wide">
                Sign In
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials to access the patient dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hospital.org"
                  className="w-full border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-navy-600 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-600 uppercase tracking-wide"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-navy-700 hover:text-navy-800 focus:outline-none focus:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-300 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-navy-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 border-slate-300 text-navy-700 focus:ring-2 focus:ring-gold-400"
                />
                <span className="text-sm text-slate-600">Keep me signed in</span>
              </label>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-900 disabled:bg-navy-400 text-white text-sm font-semibold uppercase tracking-wide py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 border border-navy-900"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 mt-5">
            Access is provisioned by your administrator. Contact IT support if
            you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}
