import React, { useEffect, useState } from "react";
import { AlertTriangle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { manageSecurityIncidents } from "../utilities/securityIncidents";
import "../styles/securityIncidentRegister.css";

const statuses = ["REPORTED", "TRIAGE", "CONTAINMENT", "INVESTIGATION", "EVIDENCE_PRESERVATION", "TECHNICAL_ASSESSMENT", "COUNSEL_REVIEW", "NOTIFICATION_DECISION", "REMEDIATION", "CLOSED"];
const checklist = ["revoke-compromised-credentials", "disable-affected-integration", "disable-affected-administrative-access", "isolate-affected-function", "review-firestore-rule-exposure", "review-storage-exposure", "review-openai-transmission", "review-household-authorization", "review-astra-authorization", "review-exported-downloaded-information", "preserve-logs-before-configuration-changes", "contact-vendor-security-team", "escalate-to-counsel"];

export default function SecurityIncidentRegister() {
  const [incidents, setIncidents] = useState([]), [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ title: "", summary: "", severity: "SEV0" });
  const [entry, setEntry] = useState({ kind: "timeline", primary: "", secondary: "", reference: "" });

  async function load() {
    setBusy(true);
    try { const result = await manageSecurityIncidents("list"); setIncidents(result.incidents || []); setMessage(""); }
    catch (error) { setMessage(error.message || "Incident register could not be loaded."); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);
  async function run(action, values = {}) {
    if (!selected?.incidentId) return;
    setBusy(true);
    try { const result = await manageSecurityIncidents(action, { incidentId: selected.incidentId, expectedVersion: selected.version, reason: "Administrator-recorded incident response update.", ...values }); setSelected(result.incident); await load(); setMessage(result.replayed ? "The previously completed update was safely replayed." : "Incident record and append-only audit updated."); }
    catch (error) { setMessage(error.message || "Incident update failed."); }
    finally { setBusy(false); }
  }
  async function create(event) {
    event.preventDefault(); setBusy(true);
    try { const result = await manageSecurityIncidents("create", { incident: draft, reason: "Initial internal incident report." }); setSelected(result.incident); setDraft({ title: "", summary: "", severity: "SEV0" }); await load(); }
    catch (error) { setMessage(error.message || "Incident could not be created."); }
    finally { setBusy(false); }
  }
  async function addEntry(event) {
    event.preventDefault();
    if (entry.kind === "timeline") await run("addTimeline", { event: { eventType: entry.primary, description: entry.secondary, sourceReference: entry.reference } });
    if (entry.kind === "evidence") await run("addEvidence", { item: { evidenceType: entry.primary, sourceSystem: entry.secondary, description: entry.reference, storageReference: null, containsSensitiveData: false } });
    if (entry.kind === "finding") await run("addTechnicalFinding", { finding: { findingType: entry.primary, summary: entry.secondary, sourceReference: entry.reference } });
    setEntry({ kind: "timeline", primary: "", secondary: "", reference: "" });
  }

  return <section className="incident-register">
    <div className="incident-heading"><div><p><ShieldCheck size={16} /> Restricted internal record</p><h2>Privacy &amp; Security Incident Register</h2></div><button disabled={busy} onClick={load}><RefreshCw size={15} /> Refresh</button></div>
    <p className="incident-warning"><AlertTriangle size={16} /> Operational tracking only. This tool does not determine whether an event is a legally reportable breach and never sends notices or performs containment.</p>
    <form className="incident-create" onSubmit={create}><input required maxLength={160} placeholder="Minimized incident title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><input required maxLength={2000} placeholder="Minimized summary—do not paste health data" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /><select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}>{["SEV0", "SEV1", "SEV2", "SEV3"].map((item) => <option key={item}>{item}</option>)}</select><button disabled={busy}><Plus size={15} /> Report</button></form>
    {message && <p aria-live="polite">{message}</p>}
    <div className="incident-workspace"><aside>{incidents.map((item) => <button className={selected?.incidentId === item.incidentId ? "active" : ""} key={item.incidentId} onClick={() => setSelected(item)}><strong>{item.severity} · {item.status}</strong><span>{item.title}</span></button>)}</aside>
      {selected ? <article><h3>{selected.title}</h3><p>{selected.summary}</p><div className="incident-controls"><label>Status<select value={selected.status} onChange={(e) => run("transition", { nextStatus: e.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label>Severity<select value={selected.severity} onChange={(e) => run("update", { changes: { severity: e.target.value } })}>{["SEV0", "SEV1", "SEV2", "SEV3"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <form className="incident-entry" onSubmit={addEntry}><select value={entry.kind} onChange={(e) => setEntry({ ...entry, kind: e.target.value })}><option value="timeline">Timeline event</option><option value="evidence">Evidence reference</option><option value="finding">Technical finding</option></select><input required placeholder="Type / source system" value={entry.primary} onChange={(e) => setEntry({ ...entry, primary: e.target.value })} /><input required placeholder="Minimized description" value={entry.secondary} onChange={(e) => setEntry({ ...entry, secondary: e.target.value })} /><input placeholder="Reference only (no copied health data)" value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} /><button disabled={busy}>Add record</button></form>
      <div className="incident-actions"><select id="containment-item">{checklist.map((item) => <option key={item}>{item}</option>)}</select><button onClick={() => run("addContainment", { item: { checklistId: document.getElementById("containment-item").value, status: "IN_PROGRESS", notes: "Tracking entry only; no action executed." } })}>Track containment item</button><button onClick={() => run("requestCounselReview")}>Request counsel review</button><button onClick={() => run("recordCounselDecision", { decision: { status: "COUNSEL_REVIEWED", notesReference: "Restricted counsel record reference" } })}>Record counsel reviewed</button><button onClick={() => run("recordNotificationDecision", { decision: { notificationDecisionStatus: "PENDING_COUNSEL", decisionBasisReference: "Pending authorized human decision" } })}>Record decision pending</button></div>
      <details><summary>Assessment snapshot</summary><pre>{JSON.stringify({ affectedUsers: selected.affectedUserAssessment, hbnr: selected.hbnrAssessment, counsel: selected.counsel, notification: selected.notificationDecision, postIncident: selected.postIncidentReview }, null, 2)}</pre></details>
      </article> : <article className="incident-empty">Select an incident to begin triage and documentation.</article>}</div>
  </section>;
}
