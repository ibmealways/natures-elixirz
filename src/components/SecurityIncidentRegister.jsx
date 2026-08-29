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
  const [operation, setOperation] = useState({ kind: "task", title: "", category: "TRIAGE", status: "OPEN", dueAt: "", notes: "" });
  const [triage, setTriage] = useState({ discoverySource: "", initialScope: "", operationalSeverity: "SEV0", investigationOwner: "", responseOwner: "", nextReviewAt: "", notes: "" });

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
    try { const result = await manageSecurityIncidents(action, { incidentId: selected.incidentId, expectedVersion: selected.version, reason: "Administrator-recorded incident response update.", ...values }); setSelected(result.incident); await load(); setMessage(result.replayed ? "The previously completed update was safely replayed." : action === "addContainment" ? `Containment item recorded: ${values.item.checklistId}. Recordkeeping only; no action was executed.` : "Incident record and append-only audit updated."); }
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
  async function addOperation(event) {
    event.preventDefault();
    if (operation.kind === "task") await run("createTask", { task: { title: operation.title, category: operation.category, status: operation.status, priority: "NORMAL", dueAt: operation.dueAt || null, notes: operation.notes } });
    if (operation.kind === "system") await run("addAffectedSystem", { system: { category: operation.category, label: operation.title, status: operation.status, notes: operation.notes } });
    if (operation.kind === "deadline") await run("addDeadline", { deadline: { type: operation.title, dueAt: operation.dueAt, source: operation.category, status: operation.status, notes: operation.notes } });
    if (operation.kind === "review") await run("recordReviewCheckpoint", { checkpoint: { type: operation.category, status: operation.status, reviewerIdentity: operation.title || null, notes: operation.notes } });
    setOperation({ kind: "task", title: "", category: "TRIAGE", status: "OPEN", dueAt: "", notes: "" });
  }
  const configureOperation = (kind) => {
    const defaults = kind === "system" ? { category: "FIRESTORE", status: "SUSPECTED" } : kind === "deadline" ? { category: "ADMIN_ENTERED", status: "OPEN" } : kind === "review" ? { category: "TECHNICAL_INVESTIGATION", status: "PENDING" } : { category: "TRIAGE", status: "OPEN" };
    setOperation({ ...operation, kind, ...defaults });
  };
  async function saveTriage(event) {
    event.preventDefault();
    await run("setTriage", { triage: { ...triage, nextReviewAt: triage.nextReviewAt || null, affectedSystemCategories: [], suspectedDataCategories: [], estimatedAffectedUserRange: null, discoveredAt: null } });
  }
  return <section className="incident-register">
    <div className="incident-heading"><div><p><ShieldCheck size={16} /> Restricted internal record</p><h2>Privacy &amp; Security Incident Register</h2></div><button disabled={busy} onClick={load}><RefreshCw size={15} /> Refresh</button></div>
    <p className="incident-warning"><AlertTriangle size={16} /> Operational tracking only. This tool does not determine whether an event is a legally reportable breach and never sends notices or performs containment.</p>
    <form className="incident-create" onSubmit={create}><input required maxLength={160} placeholder="Minimized incident title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><input required maxLength={2000} placeholder="Minimized summary—do not paste health data" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /><select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}>{["SEV0", "SEV1", "SEV2", "SEV3"].map((item) => <option key={item}>{item}</option>)}</select><button disabled={busy}><Plus size={15} /> Report</button></form>
    {message && <p aria-live="polite">{message}</p>}
    <div className="incident-workspace"><aside>{incidents.map((item) => <button className={selected?.incidentId === item.incidentId ? "active" : ""} key={item.incidentId} onClick={() => setSelected(item)}><strong>{item.severity} · {item.status}</strong><span>{item.title}</span></button>)}</aside>
      {selected ? <article><h3>{selected.title}</h3><p>{selected.summary}</p><div className="incident-controls"><label>Status<select value={selected.status} onChange={(e) => run("transition", { nextStatus: e.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label>Severity<select value={selected.severity} onChange={(e) => run("update", { changes: { severity: e.target.value } })}>{["SEV0", "SEV1", "SEV2", "SEV3"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="incident-summary" aria-label="Operational summary"><span>Open tasks <strong>{(selected.responseTasks || []).filter((item) => !["COMPLETE","CANCELLED"].includes(item.status)).length}</strong></span><span>Affected systems <strong>{selected.affectedSystemRecords?.length || 0}</strong></span><span>Open deadlines <strong>{(selected.operationalDeadlines || []).filter((item) => item.status === "OPEN").length}</strong></span><span>Human reviews <strong>{selected.reviewCheckpoints?.length || 0}</strong></span></div>
      <details><summary>Triage workspace</summary><form className="incident-entry" onSubmit={saveTriage}><input maxLength={160} placeholder="Discovery source" value={triage.discoverySource} onChange={(e) => setTriage({ ...triage, discoverySource: e.target.value })} /><input maxLength={1500} placeholder="Initial minimized scope" value={triage.initialScope} onChange={(e) => setTriage({ ...triage, initialScope: e.target.value })} /><select value={triage.operationalSeverity} onChange={(e) => setTriage({ ...triage, operationalSeverity: e.target.value })}>{["SEV0","SEV1","SEV2","SEV3"].map((item) => <option key={item}>{item}</option>)}</select><input maxLength={128} placeholder="Investigation owner" value={triage.investigationOwner} onChange={(e) => setTriage({ ...triage, investigationOwner: e.target.value })} /><input maxLength={128} placeholder="Response owner" value={triage.responseOwner} onChange={(e) => setTriage({ ...triage, responseOwner: e.target.value })} /><input type="datetime-local" value={triage.nextReviewAt} onChange={(e) => setTriage({ ...triage, nextReviewAt: e.target.value })} /><input maxLength={2000} placeholder="Triage notes - no secrets or health records" value={triage.notes} onChange={(e) => setTriage({ ...triage, notes: e.target.value })} /><button disabled={busy}>Save triage</button></form>{selected.triage && <pre>{JSON.stringify(selected.triage, null, 2)}</pre>}</details>
      <details open><summary>Operational workflow</summary><form className="incident-entry" onSubmit={addOperation}>
        <select value={operation.kind} onChange={(e) => configureOperation(e.target.value)}><option value="task">Response task</option><option value="system">Affected system</option><option value="deadline">Human-entered deadline</option><option value="review">Human review checkpoint</option></select>
        <input required={operation.kind !== "review"} maxLength={160} placeholder="Title, label, or reviewer identity" value={operation.title} onChange={(e) => setOperation({ ...operation, title: e.target.value })} />
        {operation.kind === "task" && <><select value={operation.category} onChange={(e) => setOperation({ ...operation, category: e.target.value })}>{["TRIAGE","INVESTIGATION","EVIDENCE","CONTAINMENT_TRACKING","RECOVERY_TRACKING","COUNSEL_REVIEW","NOTIFICATION_DECISION","DOCUMENTATION","POST_INCIDENT"].map((item) => <option key={item}>{item}</option>)}</select><select value={operation.status} onChange={(e) => setOperation({ ...operation, status: e.target.value })}>{["OPEN","IN_PROGRESS","BLOCKED","COMPLETE","CANCELLED"].map((item) => <option key={item}>{item}</option>)}</select></>}
        {operation.kind === "system" && <><select value={operation.category} onChange={(e) => setOperation({ ...operation, category: e.target.value })}>{["FIREBASE_AUTH","FIRESTORE","CLOUD_FUNCTIONS","HOSTING","STRIPE_INTEGRATION","EMAIL_PROVIDER","AI_PROVIDER","APPLICATION_FRONTEND","ADMINISTRATIVE_CONSOLE","OTHER"].map((item) => <option key={item}>{item}</option>)}</select><select value={operation.status} onChange={(e) => setOperation({ ...operation, status: e.target.value })}>{["SUSPECTED","UNDER_REVIEW","CONFIRMED_AFFECTED","CONFIRMED_NOT_AFFECTED"].map((item) => <option key={item}>{item}</option>)}</select></>}
        {operation.kind === "deadline" && <><select value={operation.category} onChange={(e) => setOperation({ ...operation, category: e.target.value })}>{["INTERNAL_POLICY","COUNSEL_PROVIDED","ADMIN_ENTERED","OTHER"].map((item) => <option key={item}>{item}</option>)}</select><input required type="datetime-local" value={operation.dueAt} onChange={(e) => setOperation({ ...operation, dueAt: e.target.value })} /></>}
        {operation.kind === "review" && <><select value={operation.category} onChange={(e) => setOperation({ ...operation, category: e.target.value })}>{["TECHNICAL_INVESTIGATION","AFFECTED_USER_ESTIMATE","COUNSEL","NOTIFICATION_DECISION","CONTAINMENT_PLAN","RECOVERY","CLOSURE"].map((item) => <option key={item}>{item}</option>)}</select><select value={operation.status} onChange={(e) => setOperation({ ...operation, status: e.target.value })}>{["PENDING","REQUESTED","REVIEWED","NOT_APPLICABLE"].map((item) => <option key={item}>{item}</option>)}</select></>}
        <input maxLength={1000} placeholder="Operational notes - no secrets or health records" value={operation.notes} onChange={(e) => setOperation({ ...operation, notes: e.target.value })} /><button disabled={busy}>Add operational record</button>
      </form><div className="incident-record-grid">
        <section><h4>Tasks</h4>{(selected.responseTasks || []).map((item) => <p key={item.taskId}><strong>{item.status}</strong> | {item.title} {item.status !== "COMPLETE" && <button onClick={() => run("updateTask", { task: { taskId: item.taskId, title: item.title, category: item.category, status: "COMPLETE", priority: item.priority, assignedTo: item.assignedTo, dueAt: item.dueAt, notes: item.notes } })}>Complete</button>}</p>)}</section>
        <section><h4>Affected systems</h4>{(selected.affectedSystemRecords || []).map((item) => <p key={item.systemId}><strong>{item.status}</strong> | {item.label} {item.status === "SUSPECTED" && <button onClick={() => run("updateAffectedSystem", { system: { systemId: item.systemId, category: item.category, label: item.label, status: "UNDER_REVIEW", notes: item.notes } })}>Begin review</button>}</p>)}</section>
        <section><h4>Deadlines</h4>{(selected.operationalDeadlines || []).map((item) => <p key={item.deadlineId}><strong>{item.status}</strong> | {item.type} {item.status === "OPEN" && <button onClick={() => run("updateDeadline", { deadline: { deadlineId: item.deadlineId, type: item.type, dueAt: item.dueAt, source: item.source, owner: item.owner, status: "COMPLETE", notes: item.notes } })}>Complete</button>}</p>)}</section>
        <section><h4>Human reviews</h4>{(selected.reviewCheckpoints || []).map((item) => <p key={item.type}><strong>{item.status}</strong> | {item.type}</p>)}</section>
      </div></details>
      <form className="incident-entry" onSubmit={addEntry}><select value={entry.kind} onChange={(e) => setEntry({ ...entry, kind: e.target.value })}><option value="timeline">Timeline event</option><option value="evidence">Evidence reference</option><option value="finding">Technical finding</option></select><input required placeholder="Type / source system" value={entry.primary} onChange={(e) => setEntry({ ...entry, primary: e.target.value })} /><input required placeholder="Minimized description" value={entry.secondary} onChange={(e) => setEntry({ ...entry, secondary: e.target.value })} /><input placeholder="Reference only (no copied health data)" value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} /><button disabled={busy}>Add record</button></form>
      <div className="incident-actions"><select id="containment-item">{checklist.map((item) => <option key={item}>{item}</option>)}</select><button disabled={busy} onClick={() => run("addContainment", { item: { checklistId: document.getElementById("containment-item").value, status: "IN_PROGRESS", notes: "Tracking entry only; no action executed." } })}>Track containment item</button><button disabled={busy} onClick={() => run("requestCounselReview")}>Request counsel review</button><button disabled={busy} onClick={() => run("recordCounselDecision", { decision: { status: "COUNSEL_REVIEWED", notesReference: "Restricted counsel record reference" } })}>Record counsel reviewed</button><button disabled={busy} onClick={() => run("recordNotificationDecision", { decision: { notificationDecisionStatus: "PENDING_COUNSEL", decisionBasisReference: "Pending authorized human decision" } })}>Record decision pending</button></div><section className="incident-containment" aria-live="polite"><h4>Tracked containment items</h4>{(selected.containmentActions || []).length ? <ul>{selected.containmentActions.map((item) => <li key={item.checklistId}><strong>{item.status}</strong> | {item.checklistId} <small>Recordkeeping only; no action executed.</small></li>)}</ul> : <p>No containment items are recorded yet.</p>}</section>
      <details><summary>Assessment snapshot</summary><pre>{JSON.stringify({ affectedUsers: selected.affectedUserAssessment, hbnr: selected.hbnrAssessment, counsel: selected.counsel, notification: selected.notificationDecision, postIncident: selected.postIncidentReview }, null, 2)}</pre></details>
      </article> : <article className="incident-empty">Select an incident to begin triage and documentation.</article>}</div>
  </section>;
}
