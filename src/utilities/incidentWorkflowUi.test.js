import { describe, expect, it } from "vitest";
import { getGenericLifecycleStatusOptions, getNotificationDecisionControl } from "./incidentWorkflowUi";

const incident = (status, counselReviewStatus) => ({ status, counsel: { counselReviewStatus } });

describe("incident workflow UI eligibility", () => {
  it("allows notification recording only during reviewed counsel workflow", () => {
    expect(getNotificationDecisionControl(incident("COUNSEL_REVIEW", "NOT_REVIEWED")).eligible).toBe(false);
    expect(getNotificationDecisionControl(incident("COUNSEL_REVIEW", "PENDING_COUNSEL")).eligible).toBe(false);
    expect(getNotificationDecisionControl(incident("NOTIFICATION_DECISION", "PENDING_COUNSEL")).eligible).toBe(false);
    expect(getNotificationDecisionControl(incident("NOTIFICATION_DECISION", "COUNSEL_REVIEWED")).eligible).toBe(false);
    expect(getNotificationDecisionControl(incident("COUNSEL_REVIEW", "COUNSEL_REVIEWED"))).toEqual({
      eligible: true,
      action: "recordNotificationDecision",
      payload: { decision: { notificationDecisionStatus: "PENDING_COUNSEL", decisionBasisReference: "Pending authorized human decision" } },
    });
  });

  it("reserves protected lifecycle entries for their dedicated actions", () => {
    const options = getGenericLifecycleStatusOptions(["TRIAGE", "COUNSEL_REVIEW", "NOTIFICATION_DECISION", "REMEDIATION", "CLOSED"]);
    expect(options).toEqual([
      { status: "TRIAGE", disabled: false },
      { status: "COUNSEL_REVIEW", disabled: true },
      { status: "NOTIFICATION_DECISION", disabled: true },
      { status: "REMEDIATION", disabled: false },
      { status: "CLOSED", disabled: true },
    ]);
  });
});