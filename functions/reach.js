const referralLabels = {
  "friend-family": "Friend or family", "social-media": "Social media", search: "Web search",
  "community-event": "Community event", "health-wellness-professional": "Health or wellness professional",
  "maha-event": "MAHA-related event or community", other: "Other",
};

function aggregate(values, minimum) {
  const counts = new Map();
  values.filter(Boolean).forEach((label) => {
    const clean = String(label).trim().slice(0, 80);
    if (!clean) return;
    const key = clean.toLocaleLowerCase("en-US");
    const current = counts.get(key) || { label: clean, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  const all = [...counts.values()];
  return {
    groups: all.filter((entry) => entry.count >= minimum).sort((a, b) => b.count - a.count),
    suppressedResponses: all.filter((entry) => entry.count < minimum).reduce((sum, entry) => sum + entry.count, 0),
  };
}

export function aggregateReachRecords(records, minimum = 3) {
  const responses = records.map((record) => record?.reach || {}).filter((reach) => reach.country || reach.region || (reach.referral && reach.referral !== "prefer-not-to-say"));
  return {
    totalSubscribers: records.length,
    respondents: responses.length,
    countries: aggregate(responses.map((reach) => reach.country), minimum),
    regions: aggregate(responses.map((reach) => reach.region && reach.country ? `${reach.region}, ${reach.country}` : reach.region), minimum),
    referrals: aggregate(responses.map((reach) => referralLabels[reach.referral]), minimum),
    minimumGroupSize: minimum,
  };
}
