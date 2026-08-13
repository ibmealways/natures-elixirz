import React, { useEffect, useState } from "react";
import { Download, MailCheck, ShieldAlert, Trash2 } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, reload } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { deleteAccountData, downloadAccountArchive, exportAccountData } from "../utilities/accountControls";
import { requestBrandedVerificationEmail } from "../utilities/emailVerification";

export default function AccountControls() {
  const { user, signOut } = useAuth();
  const [verified, setVerified] = useState(Boolean(user?.emailVerified));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [dangerOpen, setDangerOpen] = useState(false);

  useEffect(() => { setVerified(Boolean(user?.emailVerified)); }, [user]);
  if (!user) return null;

  const refreshVerification = async () => {
    setBusy("verify"); setMessage("");
    try { await reload(user); setVerified(user.emailVerified); setMessage(user.emailVerified ? "Email verified." : "Verification is still pending."); }
    catch { setMessage("Verification status could not be refreshed."); }
    finally { setBusy(""); }
  };
  const resendVerification = async () => {
    setBusy("resend"); setMessage("");
    try {
      await requestBrandedVerificationEmail();
      setMessage(`Nature's Elixirz verification email queued for ${user.email}. Check Inbox, Junk, and provider filtering rules.`);
    } catch (error) {
      const messages = {
        "functions/resource-exhausted": "Please wait one minute before requesting another verification email.",
        "auth/unauthorized-continue-uri": "The verification return address is not authorized. Nature's Elixirz support must correct Firebase configuration.",
        "auth/network-request-failed": "The verification request could not reach Firebase. Check the connection and try again.",
        "auth/user-token-expired": "The sign-in session expired. Sign out, sign back in, and request verification again.",
      };
      setMessage(messages[error?.code] || `Firebase did not accept the verification request (${error?.code || "unknown error"}).`);
    }
    finally { setBusy(""); }
  };
  const exportData = async () => {
    setBusy("export"); setMessage("");
    try { downloadAccountArchive(await exportAccountData(), user.uid); setMessage("Your account archive was downloaded."); }
    catch { setMessage("Your archive could not be prepared. Please try again."); }
    finally { setBusy(""); }
  };
  const removeAccount = async () => {
    if (confirmation !== "DELETE MY ACCOUNT" || !password) return;
    setBusy("delete"); setMessage("");
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      await deleteAccountData();
      await signOut();
      window.location.assign("/");
    } catch (error) {
      setMessage(error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential"
        ? "The password was incorrect. Your account was not changed."
        : "Account deletion could not be completed. Your account remains active; contact support if this continues.");
      setBusy("");
    }
  };

  return <section className="account-controls" aria-label="Account controls">
    <div className="account-control-row"><div><MailCheck size={19} /><span><strong>Email verification</strong><small>{verified ? "Verified" : "Verification required for subscriptions and Astra"}</small></span></div><div>{!verified && <button disabled={Boolean(busy)} type="button" onClick={resendVerification}>Resend email</button>}<button disabled={Boolean(busy)} type="button" onClick={refreshVerification}>{busy === "verify" ? "Checking…" : "Check status"}</button></div></div>
    <div className="account-control-row"><div><Download size={19} /><span><strong>Download your data</strong><small>Export profile, recipes, journey, movement, kitchen, generated-image records, and account-access records as JSON.</small></span></div><button disabled={Boolean(busy)} type="button" onClick={exportData}>{busy === "export" ? "Preparing…" : "Download archive"}</button></div>
    <div className="account-danger">
      <button className="danger-toggle" type="button" onClick={() => setDangerOpen((value) => !value)}><ShieldAlert size={18} /> {dangerOpen ? "Close deletion controls" : "Delete account and data"}</button>
      {dangerOpen && <div className="danger-confirm"><p><strong>Permanent action.</strong> This cancels a linked subscription, deletes cloud data and meal images, and removes the sign-in account. Download an archive first if needed.</p><label><span>Current password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label><span>Type DELETE MY ACCOUNT</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="delete-account" disabled={busy === "delete" || !password || confirmation !== "DELETE MY ACCOUNT"} type="button" onClick={removeAccount}><Trash2 size={17} /> {busy === "delete" ? "Deleting…" : "Permanently delete my account"}</button></div>}
    </div>
    {message && <p className="account-control-message" aria-live="polite">{message}</p>}
  </section>;
}
