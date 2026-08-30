const NOTIFICATION_DECISION_STATUS = "NOTIFICATION_DECISION";
const COUNSEL_REVIEW_STATUS = "COUNSEL_REVIEW";
const CLOSED_STATUS = "CLOSED";
const COUNSEL_REVIEWED = "COUNSEL_REVIEWED";
const PROTECTED_GENERIC_STATUSES = new Set([COUNSEL_REVIEW_STATUS, NOTIFICATION_DECISION_STATUS, CLOSED_STATUS]);

export function getGenericLifecycleStatusOptions(statuses) {
  return statuses.map((status) => ({
    status,
    disabled: PROTECTED_GENERIC_STATUSES.has(status),
  }));
}

export function getNotificationDecisionControl(incident) {
  if (incident?.status !== COUNSEL_REVIEW_STATUS) {
    return {
      eligible: false,
      explanation: incident?.status === NOTIFICATION_DECISION_STATUS
        ? "This incident is already in the notification-decision stage. Notification recording cannot be repeated through this workflow."
        : "Notification decision can be recorded only during authorized counsel review.",
    };
  }
  if (incident?.counsel?.counselReviewStatus !== COUNSEL_REVIEWED) {
    return {
      eligible: false,
      explanation: "Notification decision is unavailable until authorized counsel review is recorded.",
    };
  }
  return {
    eligible: true,
    action: "recordNotificationDecision",
    payload: {
      decision: {
        notificationDecisionStatus: "PENDING_COUNSEL",
        decisionBasisReference: "Pending authorized human decision",
      },
    },
  };
}