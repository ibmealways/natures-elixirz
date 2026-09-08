import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Headphones, Mail, MessageSquare, Send } from "lucide-react";
import { Link } from "react-router-dom";
import GlowNav from "../components/GlowNav";
import { useAuth } from "../context/AuthContext";
import { submitSupportRequest } from "../utilities/support";
import "../styles/CosmicShell.css";
import "../styles/supportCenter.css";

const categories = ["Technical issue", "Account or synchronization", "Billing or subscription", "Safety concern", "Accessibility", "Comment or suggestion"];

export default function SupportCenter() {
  const { user } = useAuth();
  const [category, setCategory] = useState(categories[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setStatus(null);
    try {
      const result = await submitSupportRequest({ category, subject, message });
      setStatus({ ok: true, text: `Your report was received. Support case ${result.caseId} was also emailed to you.` });
      setSubject(""); setMessage("");
    } catch (error) {
      setStatus({ ok: false, text: error.message || "Your support request could not be sent." });
    } finally { setBusy(false); }
  }

  return <div className="cosmic-page-shell support-cosmos"><GlowNav /><main className="support-page">
    <header><p><Headphones size={17} /> Subscriber care portal</p><h1>Tell us what needs <em>attention.</em></h1><span>Report an issue, share a concern, or send a comment directly to Nature&apos;s Elixirz Support.</span></header>
    <div className="support-grid">
      <section className="support-form-card"><div className="support-card-heading"><MessageSquare /><div><p>SECURE SUPPORT CASE</p><h2>Contact support</h2></div></div>
        {!user ? <div className="support-signin"><Mail /><h3>Sign in to send a traceable report</h3><p>Your signed-in email lets Support reply and keeps reports connected to the correct account.</p><Link to="/account#account-access">Sign in / Create account</Link></div> : <form onSubmit={submit}>
          <p className="support-identity">Reply will be sent to <strong>{user.email}</strong></p>
          <label>What can we help with?<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Subject<input required maxLength={140} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Briefly describe the issue" /></label>
          <label>Details<textarea required maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what happened, what page you were using, and what you expected to happen." /></label>
          <button disabled={busy || !subject.trim() || !message.trim()}><Send size={18} /> {busy ? "Sending securely…" : "Send to Support"}</button>
          {status && <div className={status.ok ? "support-status success" : "support-status error"} aria-live="polite">{status.ok ? <CheckCircle2 /> : <AlertTriangle />}{status.text}</div>}
        </form>}
      </section>
      <aside><article><Mail /><h2>Business-controlled email</h2><p>You may also email <a href="mailto:support@natureselixirz.com">support@natureselixirz.com</a>. In-app reports receive a case number and confirmation copy.</p></article><article className="support-warning"><AlertTriangle /><h2>Keep sensitive details private</h2><p>Never send a password, payment-card number, full medication list, or private health record. For urgent or emergency symptoms, contact local emergency services—not app support.</p></article></aside>
    </div>
  </main></div>;
}
