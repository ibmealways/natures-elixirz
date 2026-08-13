import { useCallback, useEffect, useState } from "react";
import { Ban, Check, RefreshCcw, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getVipFamilyAccess, manageVipFamilyAccess, requestVipFamilyAccess } from "../utilities/vipFamily";

export default function VipFamilyAccess() {
  const { user } = useAuth();
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [access, setAccess] = useState({ incoming: [], outgoing: [] });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setBusy("load");
    try { setAccess(await getVipFamilyAccess()); }
    catch (error) { setMessage(error?.message || "Family access could not be loaded."); }
    finally { setBusy(""); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const requestAccess = async () => {
    setBusy("request"); setMessage("");
    try {
      const result = await requestVipFamilyAccess(subscriberEmail);
      setMessage(result.message);
      setSubscriberEmail("");
      await load();
    } catch (error) { setMessage(error?.message || "The family request could not be sent."); }
    finally { setBusy(""); }
  };

  const decide = async (id, action) => {
    setBusy(`${action}-${id}`); setMessage("");
    try {
      await manageVipFamilyAccess(id, action);
      setMessage(action === "approve" ? "Family account approved." : action === "block" ? "Request blocked." : "Family access removed.");
      await load();
    } catch (error) { setMessage(error?.message || "That family-access action could not be completed."); }
    finally { setBusy(""); }
  };

  if (!user) return null;
  const incoming = access.incoming || [];
  const outgoing = access.outgoing || [];
  return <section className="vip-family-console" aria-labelledby="vip-family-title">
    <header><div><p className="ne-kicker">V.I.P. Household Circle</p><h3 id="vip-family-title">Family access for every V.I.P.</h3><p>Every active V.I.P. subscriber receives two protected family seats. Family accounts receive all digital tiers, but no merchandise or AI-generated food images. The first 5,000 V.I.P. subscribers also keep Founding Circle status and their founding price for as long as that subscription remains active.</p></div><button type="button" onClick={load} disabled={Boolean(busy)} aria-label="Refresh family access"><RefreshCcw size={16} /></button></header>
    <div className="vip-family-request"><UserRoundPlus size={20} /><div><strong>Request access through a V.I.P. subscriber</strong><p>Enter the subscriber&apos;s exact account email. They receive an alert and must approve you before access begins.</p><label><span>Subscriber email</span><input type="email" value={subscriberEmail} onChange={(event) => setSubscriberEmail(event.target.value)} placeholder="subscriber@example.com" /></label><button type="button" disabled={!subscriberEmail || Boolean(busy)} onClick={requestAccess}>Send secure request</button></div></div>
    {incoming.length > 0 && <div className="vip-family-list"><h4>Requests using your subscriber email</h4>{incoming.map((item) => <article key={item.id}><span><strong>{item.memberEmail}</strong><small>Status: {item.status}</small></span><div>{item.status === "pending" && <><button type="button" onClick={() => decide(item.id, "approve")} disabled={Boolean(busy)}><Check size={15} /> Approve</button><button className="danger" type="button" onClick={() => decide(item.id, "block")} disabled={Boolean(busy)}><Ban size={15} /> Block</button></>}{item.status === "approved" && <button className="danger" type="button" onClick={() => decide(item.id, "remove")} disabled={Boolean(busy)}>Remove access</button>}</div></article>)}</div>}
    {outgoing.length > 0 && <div className="vip-family-list"><h4>Your family requests</h4>{outgoing.map((item) => <article key={item.id}><span><strong>{item.ownerEmail}</strong><small>Status: {item.status}</small></span>{item.status === "approved" && <ShieldCheck size={20} />}</article>)}</div>}
    {message && <p className="vip-family-message" role="status">{message}</p>}
  </section>;
}
