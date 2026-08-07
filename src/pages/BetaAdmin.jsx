import React, { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Globe2, RefreshCw, Search, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import GlowNav from "../components/GlowNav";
import { useAuth } from "../context/AuthContext";
import { manageBetaTesters } from "../utilities/betaAdmin";
import "../styles/CosmicShell.css";
import "../styles/betaAdmin.css";
import "../styles/betaReach.css";

const defaultExpiration = () => { const date = new Date(); date.setDate(date.getDate() + 30); return date.toISOString().slice(0, 10); };

function ReachGroup({ title, data }) {
  return <article><h3>{title}</h3>{data?.groups?.length ? <ul>{data.groups.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.count}</strong></li>)}</ul> : <p>No group has reached the privacy threshold yet.</p>}{data?.suppressedResponses > 0 && <small>{data.suppressedResponses} response{data.suppressedResponses === 1 ? "" : "s"} hidden in small groups.</small>}</article>;
}

export default function BetaAdmin() {
  const { user } = useAuth();
  const [email, setEmail] = useState(""); const [expires, setExpires] = useState(defaultExpiration);
  const [testers, setTesters] = useState([]); const [reach, setReach] = useState(null); const [lookup, setLookup] = useState(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [authorized, setAuthorized] = useState(null);

  async function load() {
    if (!user) return;
    setBusy(true); setMessage("");
    try { const [roster, community] = await Promise.all([manageBetaTesters("list"), manageBetaTesters("reach")]); setTesters(roster.testers || []); setReach(community.reach || null); setAuthorized(true); }
    catch (error) { setAuthorized(false); setMessage(error.message || "Administrator access is required."); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, [user]);

  async function run(action, selectedEmail = email) {
    setBusy(true); setMessage("");
    try { const payload = { email: selectedEmail }; if (action === "grant") payload.expiresAt = new Date(`${expires}T23:59:59.999Z`).toISOString(); const result = await manageBetaTesters(action, payload); setLookup(result.tester || null); setMessage(action === "grant" ? "Tier 5 beta access granted." : action === "revoke" ? "Beta access revoked." : "Account located."); if (action !== "lookup") await load(); }
    catch (error) { setMessage(error.message || "The beta operation could not be completed."); } finally { setBusy(false); }
  }

  return <div className="cosmic-page-shell beta-admin-cosmos"><GlowNav /><main className="beta-admin-page">
    <header><p><ShieldCheck size={16} /> Private operations console</p><h1>Beta Tester <em>Administration</em></h1><span>Manage access metadata and privacy-protected community totals. Individual wellness and reach records are never displayed here.</span></header>
    {!user ? <section className="beta-lock"><ShieldCheck size={32} /><h2>Sign in first</h2><p>Use the authorized Nature&apos;s Elixirz administrator account.</p></section> : authorized === false ? <section className="beta-lock"><ShieldCheck size={32} /><h2>Administrator authorization required</h2><p>Create the protected Firestore document <code>betaAdmins/{user.uid}</code> with boolean field <code>enabled: true</code>, then refresh this page.</p><small>Signed-in UID: {user.uid}</small></section> : <>
      <section className="beta-command"><div><label>Tester email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tester@example.com" /></label><label>Access expires<input type="date" value={expires} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExpires(event.target.value)} /></label></div><div><button disabled={busy || !email} onClick={() => run("lookup")}><Search size={16} /> Check account</button><button disabled={busy || !email} onClick={() => run("grant")}><UserPlus size={16} /> Grant Tier 5</button><button className="danger" disabled={busy || !email} onClick={() => run("revoke")}><UserMinus size={16} /> Revoke</button></div>{message && <p>{message}</p>}{lookup && <div className="beta-lookup"><strong>{lookup.email}</strong><span>{lookup.emailVerified ? "Email verified" : "Email not verified"}</span><span>Tier {lookup.tier}</span><span>{lookup.status}</span></div>}</section>
      <section className="beta-reach"><div className="beta-roster-heading"><div><p><Globe2 size={16} /> Community reach</p><h2>{reach?.respondents || 0} voluntary responses</h2></div><small>Only groups of {reach?.minimumGroupSize || 3}+ are shown</small></div><p className="beta-reach-note">Aggregate, self-reported information only. No GPS, IP-derived location, movement tracking, or individual location records appear here.</p><div className="beta-reach-grid"><ReachGroup title="Countries" data={reach?.countries} /><ReachGroup title="Broad regions" data={reach?.regions} /><ReachGroup title="How people found us" data={reach?.referrals} /></div></section>
      <section className="beta-roster"><div className="beta-roster-heading"><div><p><Users size={16} /> Testing roster</p><h2>{testers.length} beta testers</h2></div><button disabled={busy} onClick={load}><RefreshCw size={15} /> Refresh</button></div><div className="beta-table"><div className="beta-row beta-head"><span>Tester</span><span>Verified</span><span>Access</span><span>Expiration</span><span>Action</span></div>{testers.map((tester) => <div className="beta-row" key={tester.uid}><span><strong>{tester.email}</strong><small>{tester.uid}</small></span><span className={tester.emailVerified ? "good" : "warn"}>{tester.emailVerified ? <CheckCircle2 size={14} /> : null}{tester.emailVerified ? "Verified" : "Pending"}</span><span>Tier {tester.tier} · {tester.status}</span><span><CalendarClock size={14} /> {tester.expiresAt ? new Date(tester.expiresAt).toLocaleDateString() : "—"}</span><span><button className="danger" disabled={busy || tester.status === "revoked"} onClick={() => run("revoke", tester.email)}>Revoke</button></span></div>)}</div></section>
    </>}
  </main></div>;
}
