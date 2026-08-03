import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export function AuthScreen({ mode = "login", user, onLogin, onChangePassword, onLogout }) {
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (mode === "change" && newPassword !== confirmation) {
      setError("ახალი პაროლები ერთმანეთს არ ემთხვევა");
      return;
    }

    setSubmitting(true);
    const result = mode === "change"
      ? await onChangePassword({ currentPassword: password, newPassword })
      : await onLogin({ email, password });
    setSubmitting(false);
    if (!result.ok) setError(result.error);
  }

  const changingPassword = mode === "change";

  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="Zoommer Delivery">
        <div className="auth-brand">
          <strong>ZOOMMER</strong>
          <span>DELIVERY</span>
        </div>
        <div className="auth-brand-copy">
          <span className="auth-brand-icon"><ShieldCheck /></span>
          <h1>მიწოდებების მართვა ერთ უსაფრთხო სივრცეში</h1>
          <p>ორდერები, რეგისტრაციები, კურიერები და ბეჭდვა მხოლოდ ავტორიზებული თანამშრომლებისთვის.</p>
        </div>
        <small>Zoommer Delivery Operations</small>
      </section>

      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit} data-testid={changingPassword ? "password-change-form" : "login-form"}>
          <span className="auth-form-icon">{changingPassword ? <KeyRound /> : <LockKeyhole />}</span>
          <div className="auth-form-heading">
            <h2>{changingPassword ? "შეცვალეთ დროებითი პაროლი" : "პლატფორმაზე შესვლა"}</h2>
            <p>
              {changingPassword
                ? `${user?.email} • უსაფრთხოებისთვის შექმენით ახალი პაროლი`
                : "გამოიყენეთ თქვენი Zoommer თანამშრომლის ანგარიში"}
            </p>
          </div>

          {!changingPassword ? (
            <label className="auth-field">
              <span>ელფოსტა</span>
              <div><Mail /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required placeholder="name@zoommer.ge" data-testid="login-email" /></div>
            </label>
          ) : null}

          <label className="auth-field">
            <span>{changingPassword ? "დროებითი პაროლი" : "პაროლი"}</span>
            <div>
              <KeyRound />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={changingPassword ? "current-password" : "current-password"} required minLength={12} placeholder="••••••••••••" data-testid={changingPassword ? "current-password" : "login-password"} />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "პაროლის დამალვა" : "პაროლის ჩვენება"}>{showPassword ? <EyeOff /> : <Eye />}</button>
            </div>
          </label>

          {changingPassword ? (
            <>
              <label className="auth-field">
                <span>ახალი პაროლი</span>
                <div><LockKeyhole /><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required minLength={12} maxLength={128} placeholder="მინიმუმ 12 სიმბოლო" data-testid="new-password" /></div>
              </label>
              <label className="auth-field">
                <span>გაიმეორეთ ახალი პაროლი</span>
                <div><LockKeyhole /><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={12} maxLength={128} placeholder="გაიმეორეთ პაროლი" data-testid="confirm-password" /></div>
              </label>
            </>
          ) : null}

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button className="auth-submit" type="submit" disabled={submitting} data-testid={changingPassword ? "change-password-submit" : "login-submit"}>
            {submitting ? "მუშავდება..." : changingPassword ? "პაროლის შეცვლა" : "შესვლა"}
            {!submitting ? <ArrowRight /> : null}
          </button>

          {changingPassword ? (
            <button className="auth-switch-account" type="button" onClick={onLogout} disabled={submitting}>
              სხვა ანგარიშით შესვლა
            </button>
          ) : null}

          <p className="auth-security-note"><ShieldCheck />სესია დაცულია და ავტომატურად დასრულდება 8 საათში.</p>
        </form>
      </section>
    </main>
  );
}

export function AuthLoading() {
  return (
    <main className="auth-loading" aria-label="ავტორიზაციის შემოწმება">
      <div className="auth-brand"><strong>ZOOMMER</strong><span>DELIVERY</span></div>
      <i />
      <span>უსაფრთხო სესიის შემოწმება...</span>
    </main>
  );
}
