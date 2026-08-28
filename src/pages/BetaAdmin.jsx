import React, { useEffect, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2, Globe2, Mail, RefreshCw, Search, Send, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import GlowNav from "../components/GlowNav";
import SecurityIncidentRegister from "../components/SecurityIncidentRegister";
import { useAuth } from "../context/AuthContext";
import { manageBetaTesters } from "../utilities/betaAdmin";
import { sendBetaTesterUpdate } from "../utilities/support";
import "../styles/CosmicShell.css";
import "../styles/betaAdmin.css";
import "../styles/betaAdminMail.css";
import "../styles/betaReach.css";
import "../styles/betaApprovals.css";

const defaultExpiration = () => { const date = new Date(); date.setDate(date.getDate() + 30); return date.toISOString().slice(0, 10); };

const MAIL_PART_LIMIT = 6500;

function splitMailMessage(value, limit = MAIL_PART_LIMIT) {
  const remainingLines = String(value || "").replace(/\r\n/g, "\n").split("\n");
  const parts = [];
  let current = "";

  remainingLines.forEach((line) => {
    let remainder = line;
    while (remainder.length > limit) {
      if (current) { parts.push(current); current = ""; }
      parts.push(remainder.slice(0, limit));
      remainder = remainder.slice(limit);
    }
    const candidate = current ? `${current}\n${remainder}` : remainder;
    if (candidate.length > limit) {
      if (current) parts.push(current);
      current = remainder;
    } else current = candidate;
  });
  if (current) parts.push(current);
  return parts.filter((part) => part.trim());
}

function ReachGroup({ title, data }) {
  return <article><h3>{title}</h3>{data?.groups?.length ? <ul>{data.groups.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.count}</strong></li>)}</ul> : <p>No group has reached the privacy threshold yet.</p>}{data?.suppressedResponses > 0 && <small>{data.suppressedResponses} response{data.suppressedResponses === 1 ? "" : "s"} hidden in small groups.</small>}</article>;
}

export default function BetaAdmin() {
  const { user } = useAuth();
  const [email, setEmail] = useState(""); const [expires, setExpires] = useState(defaultExpiration);
  const [testers, setTesters] = useState([]); const [requests, setRequests] = useState([]); const [reach, setReach] = useState(null); const [lookup, setLookup] = useState(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [authorized, setAuthorized] = useState(null);
  const [mailAudience, setMailAudience] = useState("active"); const [mailEmail, setMailEmail] = useState("");
  const [mailSubject, setMailSubject] = useState(""); const [mailBody, setMailBody] = useState("");
  const [mailBusy, setMailBusy] = useState(false); const [mailStatus, setMailStatus] = useState("");
  const [refreshStatus, setRefreshStatus] = useState(""); const [lastRefreshed, setLastRefreshed] = useState(null);

  async function load({ announce = false } = {}) {
    if (!user) return;
    setBusy(true); setMessage(""); if (announce) setRefreshStatus("Refreshing account requests, roster, and community totals…");
    try {
      const [roster, pending, community] = await Promise.all([manageBetaTesters("list"), manageBetaTesters("pending"), manageBetaTesters("reach")]);
      const nextTesters = roster.testers || []; const nextRequests = pending.requests || []; const nextReach = community.reach || null;
      setTesters(nextTesters); setRequests(nextRequests); setReach(nextReach); setAuthorized(true);
      const refreshedAt = new Date(); setLastRefreshed(refreshedAt);
      if (announce) setRefreshStatus(`Refresh complete: ${nextRequests.length} pending account${nextRequests.length === 1 ? "" : "s"}, ${nextTesters.length} tester${nextTesters.length === 1 ? "" : "s"}, and ${nextReach?.respondents || 0} voluntary response${nextReach?.respondents === 1 ? "" : "s"}.`);
    }
    catch (error) { setAuthorized(false); setRefreshStatus(announce ? "Refresh failed. The previous admin data remains displayed." : ""); setMessage(error.message || "Administrator access is required."); }
    finally { setBusy(false); }
  }
  useEffect(() => { load({ announce: false }); }, [user]);

  async function run(action, selectedEmail = email) {
    setBusy(true); setMessage("");
    try { const payload = { email: selectedEmail }; if (action === "grant") payload.expiresAt = new Date(`${expires}T23:59:59.999Z`).toISOString(); const result = await manageBetaTesters(action, payload); setLookup(result.tester || null); setMessage(action === "grant" ? "Tier 5 beta access granted." : action === "revoke" ? "Beta access revoked." : action === "deny" ? "Account marked as not authorized." : "Account located."); if (action !== "lookup") await load(); }
    catch (error) { setMessage(error.message || "The beta operation could not be completed."); } finally { setBusy(false); }
  }

  async function sendUpdate(event) {
    event.preventDefault(); setMailBusy(true); setMailStatus("");
    try {
      const parts = splitMailMessage(mailBody);
      let recipientCount = 0;
      for (let index = 0; index < parts.length; index += 1) {
        const suffix = parts.length > 1 ? ` (Part ${index + 1} of ${parts.length})` : "";
        const subject = `${mailSubject.slice(0, 140 - suffix.length)}${suffix}`;
        const result = await sendBetaTesterUpdate({ audience: mailAudience, email: mailEmail, subject, message: parts[index] });
        recipientCount = result.recipientCount;
      }
      const partSummary = parts.length > 1 ? ` in ${parts.length} numbered parts each` : "";
      setMailStatus(`${recipientCount} individual beta tester email${recipientCount === 1 ? "" : "s"} queued${partSummary} from support@natureselixirz.com.`);
      setMailSubject(""); setMailBody("");
    } catch (error) {
      const detail = String(error?.message || "");
      setMailStatus(detail === "internal"
        ? "The email service did not accept this update. Please wait a moment and try again; no password or private tester data needs to be entered."
        : detail || "The beta update could not be queued.");
    }
    finally { setMailBusy(false); }
  }

  return <div className="cosmic-page-shell beta-admin-cosmos"><GlowNav /><main className="beta-admin-page">
    <header><p><ShieldCheck size={16} /> Private operations console</p><h1>Beta Tester <em>Administration</em></h1><span>Manage access metadata and privacy-protected community totals. Individual wellness and reach records are never displayed here.</span></header>
    {!user ? <section className="beta-lock"><ShieldCheck size={32} /><h2>Sign in first</h2><p>Use the authorized Nature&apos;s Elixirz administrator account.</p></section> : authorized === false ? <section className="beta-lock"><ShieldCheck size={32} /><h2>Administrator authorization required</h2><p>Create the protected Firestore document <code>betaAdmins/{user.uid}</code> with boolean field <code>enabled: true</code>, then refresh this page.</p><small>Signed-in UID: {user.uid}</small></section> : <>
      <section className="beta-approvals"><div className="beta-roster-heading"><div><p><BellRing size={16} /> New-account alerts</p><h2>{requests.length} account{requests.length === 1 ? "" : "s"} awaiting authorization</h2></div><div className="beta-refresh-control"><button disabled={busy} onClick={() => load({ announce: true })}><RefreshCw className={busy ? "is-spinning" : ""} size={15} /> {busy ? "Refreshing…" : "Refresh"}</button>{lastRefreshed && <small>Updated {lastRefreshed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</small>}</div></div>{refreshStatus && <p className="beta-refresh-status" aria-live="polite">{refreshStatus}</p>}{message && <p className="beta-approval-message">{message}</p>}{requests.length ? <div className="beta-approval-list">{requests.map((request) => <article key={request.uid}><div><strong>{request.email}</strong><small>{request.emailVerified ? "Email verified" : "Email verification pending"}{request.createdAt ? ` · Created ${new Date(request.createdAt).toLocaleString()}` : ""}</small></div><div className="beta-approval-actions"><button disabled={busy} onClick={() => run("grant", request.email)}><UserPlus size={15} /> Authorize beta access</button><button className="danger" disabled={busy} onClick={() => run("deny", request.email)}><UserMinus size={15} /> Do not authorize</button></div></article>)}</div> : <p className="beta-empty">No new accounts are waiting for review.</p>}</section>
      <section className="beta-command"><div><label>Tester email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tester@example.com" /></label><label>Access expires<input type="date" value={expires} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExpires(event.target.value)} /></label></div><div><button disabled={busy || !email} onClick={() => run("lookup")}><Search size={16} /> Check account</button><button disabled={busy || !email} onClick={() => run("grant")}><UserPlus size={16} /> Grant Tier 5</button><button className="danger" disabled={busy || !email} onClick={() => run("revoke")}><UserMinus size={16} /> Revoke</button></div>{message && <p>{message}</p>}{lookup && <div className="beta-lookup"><strong>{lookup.email}</strong><span>{lookup.emailVerified ? "Email verified" : "Email not verified"}</span><span>Tier {lookup.tier}</span><span>{lookup.status}</span></div>}</section>
      <section className="beta-reach"><div className="beta-roster-heading"><div><p><Globe2 size={16} /> Community reach</p><h2>{reach?.respondents || 0} voluntary responses</h2></div><small>Only groups of {reach?.minimumGroupSize || 3}+ are shown</small></div><p className="beta-reach-note">Aggregate, self-reported information only. No GPS, IP-derived location, movement tracking, or individual location records appear here.</p><div className="beta-reach-grid"><ReachGroup title="Countries" data={reach?.countries} /><ReachGroup title="Broad regions" data={reach?.regions} /><ReachGroup title="How people found us" data={reach?.referrals} /></div></section>
      <section className="beta-roster"><div className="beta-roster-heading"><div><p><Users size={16} /> Testing roster</p><h2>{testers.length} beta testers</h2></div><div className="beta-refresh-control"><button disabled={busy} onClick={() => load({ announce: true })}><RefreshCw className={busy ? "is-spinning" : ""} size={15} /> {busy ? "Refreshing…" : "Refresh"}</button>{lastRefreshed && <small>Updated {lastRefreshed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</small>}</div></div><div className="beta-table"><div className="beta-row beta-head"><span>Tester</span><span>Verified</span><span>Access</span><span>Expiration</span><span>Action</span></div>{testers.map((tester) => <div className="beta-row" key={tester.uid}><span><strong>{tester.email}</strong><small>{tester.uid}</small></span><span className={tester.emailVerified ? "good" : "warn"}>{tester.emailVerified ? <CheckCircle2 size={14} /> : null}{tester.emailVerified ? "Verified" : "Pending"}</span><span>Tier {tester.tier} · {tester.status}</span><span><CalendarClock size={14} /> {tester.expiresAt ? new Date(tester.expiresAt).toLocaleDateString() : "—"}</span><span><button className="danger" disabled={busy || tester.status === "revoked"} onClick={() => run("revoke", tester.email)}>Revoke</button></span></div>)}</div></section>
      <section className="beta-mail"><div className="beta-roster-heading"><div><p><Mail size={16} /> Business email console</p><h2>Send beta tester information and updates</h2></div><small>From support@natureselixirz.com</small></div><p className="beta-mail-note">Each message is sent separately so beta testers never see one another&apos;s email addresses. Long checklists are automatically divided into numbered email parts.</p><form onSubmit={sendUpdate}><label>Recipients<select value={mailAudience} onChange={(event) => setMailAudience(event.target.value)}><option value="active">All active beta testers</option><option value="one">One active beta tester</option><option value="self">Preview to my administrator email</option></select></label>{mailAudience === "one" && <label>Tester email<input type="email" required value={mailEmail} onChange={(event) => setMailEmail(event.target.value)} placeholder="tester@example.com" /></label>}<label className="wide">Subject<input required maxLength={140} value={mailSubject} onChange={(event) => setMailSubject(event.target.value)} placeholder="Nature's Elixirz beta update" /></label><label className="wide">Message<textarea required maxLength={50000} rows={12} value={mailBody} onChange={(event) => setMailBody(event.target.value)} placeholder="Write testing instructions, release notes, or an important beta update..." /><span className="beta-mail-count">{mailBody.length.toLocaleString()} / 50,000 characters{mailBody.length > MAIL_PART_LIMIT ? ` · sends as ${splitMailMessage(mailBody).length} numbered parts` : ""}</span></label><div className="wide beta-mail-actions"><button disabled={mailBusy || !mailSubject.trim() || !mailBody.trim()} type="submit"><Send size={16} /> {mailBusy ? "Queuing..." : "Send update"}</button><a href="mailto:support@natureselixirz.com">Open support mailbox</a></div></form>{mailStatus && <p className="beta-mail-status">{mailStatus}</p>}</section>
      <SecurityIncidentRegister />
    </>}
  </main></div>;
}
