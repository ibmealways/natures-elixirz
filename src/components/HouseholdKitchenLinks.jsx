import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Link2, RefreshCcw, Unlink, UsersRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getHouseholdKitchenLinks, manageHouseholdKitchenLink, requestHouseholdKitchenLink } from "../utilities/householdKitchenLinks";

export default function HouseholdKitchenLinks() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [links, setLinks] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!user) return;
    setBusy("load");
    try { setLinks((await getHouseholdKitchenLinks()).links || []); }
    catch (error) { setMessage(error?.message || "Household pantry connections could not be loaded."); }
    finally { setBusy(""); }
  }, [user]);
  useEffect(() => { load(); }, [load]);
  const send = async () => {
    setBusy("request"); setMessage("");
    try { const result = await requestHouseholdKitchenLink(email); setEmail(""); setMessage(result.message); await load(); }
    catch (error) { setMessage(error?.message || "The pantry request could not be sent."); }
    finally { setBusy(""); }
  };
  const decide = async (linkId, action) => {
    setBusy(`${action}-${linkId}`); setMessage("");
    try {
      await manageHouseholdKitchenLink(linkId, action);
      setMessage(action === "approve" ? "Household pantries connected. Both Kernels will now synchronize additions and deletions." : action === "block" ? "Pantry request blocked." : "Pantry connection disconnected. Each account keeps its current inventory.");
      await load();
    } catch (error) { setMessage(error?.message || "The pantry connection could not be changed."); }
    finally { setBusy(""); }
  };
  if (!user) return null;
  return <section className="vip-family-console" aria-labelledby="household-kitchen-title">
    <header><div><p className="ne-kicker"><UsersRound size={15} /> Shared household pantry</p><h3 id="household-kitchen-title">Connect both Kitchen Kernels</h3><p>After the other account approves, Smoothie and Meal Plan Pantry, Fridge, and Freezer changes synchronize in both directions. Profiles, medications, recipes, and activity history stay private.</p></div><button type="button" onClick={load} disabled={Boolean(busy)} aria-label="Refresh pantry connections"><RefreshCcw size={16} /></button></header>
    <div className="vip-family-request"><Link2 size={20} /><div><strong>Connect a family member&apos;s pantry</strong><label><span>Family member&apos;s account email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="family@example.com" /><small>They must have a verified account and approve the request.</small></label><button type="button" disabled={!email || Boolean(busy)} onClick={send}>Send pantry link</button></div></div>
    {links.length > 0 && <div className="vip-family-list"><h4>Pantry connections</h4>{links.map((link) => <article key={link.id}><span><strong>{link.otherEmail}</strong><small>{link.status === "active" ? "Two-way synchronization active" : `Status: ${link.status}`}</small></span><div>{link.direction === "incoming" && link.status === "pending" && <><button type="button" onClick={() => decide(link.id, "approve")} disabled={Boolean(busy)}><Check size={15} /> Approve</button><button className="danger" type="button" onClick={() => decide(link.id, "block")} disabled={Boolean(busy)}><Ban size={15} /> Block</button></>}{link.status === "active" && <button className="danger" type="button" onClick={() => decide(link.id, "disconnect")} disabled={Boolean(busy)}><Unlink size={15} /> Disconnect</button>}</div></article>)}</div>}
    {message && <p className="vip-family-message" role="status">{message}</p>}
  </section>;
}
