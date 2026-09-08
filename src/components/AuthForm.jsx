import { useState } from "react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, isFirebaseConfigured } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { requestVipFamilyAccess } from "../utilities/vipFamily";
import { safeAuthReturnPath } from "../utilities/authReturnPath";

export default function AuthForm() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const returnPath = safeAuthReturnPath(location.search);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [familyAccount, setFamilyAccount] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState("");

  const submit = async (mode) => {
    if (!auth) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        if (familyAccount) {
          await requestVipFamilyAccess(subscriberEmail);
          setMessage(`Account created and secure family request sent. A verification email was queued automatically for ${email}. Check Inbox and Junk; access begins only after the V.I.P. subscriber approves you.`);
        } else {
          setMessage(`Account created. A verification email was queued automatically for ${email}. Check Inbox and Junk before subscribing.`);
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        if (returnPath) navigate(returnPath, { replace: true });
        setMessage("Signed in.");
      }
    } catch {
      setMessage("Authentication was unsuccessful. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!auth || !email.trim()) {
      setMessage("Enter your email address first, then choose Reset password.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("If an account exists for that address, a password-reset email has been sent.");
    } catch {
      setMessage("Password reset could not be started. Check the address and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!isFirebaseConfigured) {
    return <p className="ne-muted">Cloud accounts are not configured yet. Your profile remains stored only on this device.</p>;
  }
  if (user) return null;

  return (
    <div className="space-y-3">
      <input className="w-full rounded-xl border border-white/10 bg-black/30 p-3" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input className="w-full rounded-xl border border-white/10 bg-black/30 p-3" type="password" autoComplete="current-password" minLength="8" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <label className="auth-family-choice"><input type="checkbox" checked={familyAccount} onChange={(event) => setFamilyAccount(event.target.checked)} /><span>Create a V.I.P. family account</span></label>
      {familyAccount && <label className="auth-subscriber-email"><span>V.I.P. subscriber email</span><input required type="email" autoComplete="off" placeholder="subscriber@example.com" value={subscriberEmail} onChange={(event) => setSubscriberEmail(event.target.value)} /><small>The subscriber receives an alert and must approve this request. Knowing an email address alone never unlocks access.</small></label>}
      <div className="flex gap-2">
        <button disabled={busy || (familyAccount && !subscriberEmail)} className="ne-primary" onClick={() => submit("signup")}>Create account</button>
        <button disabled={busy} className="ne-secondary" onClick={() => submit("signin")}>Sign in</button>
      </div>
      <button disabled={busy} className="ne-text-action" type="button" onClick={resetPassword}>Forgot password? Send reset email</button>
      {message && <p aria-live="polite">{message}</p>}
    </div>
  );
}
