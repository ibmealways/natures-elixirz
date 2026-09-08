const normalize = (value) => String(value || "").toLowerCase();

const RULES = Object.freeze([
  ["pregnancy", "Pregnancy or breastfeeding", /pregnan|breastfeed|nursing|lactat/, "review"],
  ["diabetes", "Diabetes or glucose-lowering medication", /diabet|insulin|metformin|glipizide|glyburide|semaglutide|tirzepatide/, "review"],
  ["kidney", "Kidney disease or dialysis", /kidney|renal|dialysis|hemodialysis|peritoneal dialysis/, "block"],
  ["liver", "Liver disease", /cirrhos|liver disease|hepatic failure|portal hypertension/, "block"],
  ["heart-failure", "Heart failure or fluid restriction", /heart failure|congestive|fluid restrict|edema/, "block"],
  ["hypertension", "Hypertension or sodium restriction", /hypertension|high blood pressure|low sodium|sodium restrict/, "review"],
  ["anticoagulant", "Anticoagulant use", /warfarin|coumadin|anticoagul|blood thinner|apixaban|eliquis|rivaroxaban|xarelto/, "review"],
  ["eating-disorder", "Eating-disorder history", /eating disorder|anorexia|bulimia|binge eating|arfid/, "block"],
  ["bariatric", "Bariatric surgery", /bariatric|gastric bypass|gastric sleeve|sleeve gastrectomy/, "block"],
  ["swallowing", "Swallowing difficulty", /dysphagia|swallowing difficult|aspiration|thickened liquid/, "block"],
  ["severe-gi", "Severe reflux or gastrointestinal disease", /severe reflux|severe gerd|crohn|ulcerative colitis|gastroparesis|bowel obstruction|short bowel/, "block"],
  ["frailty", "Frailty or malnutrition risk", /frail|malnutrition|underweight|unintentional weight loss/, "block"],
]);

const present = (value) => Array.isArray(value) ? value.some((item) => String(item || "").trim()) : Boolean(String(value || "").trim());

export function assessClientNutritionRisk(profile = {}) {
  const combined = [...(Array.isArray(profile.conditions) ? profile.conditions : []), profile.otherHealthConditions, profile.surgicalHistory, profile.medications].map(normalize).join(" | ");
  const flags = RULES.filter(([, , pattern]) => pattern.test(combined)).map(([id, label, , level]) => ({ id, label, level }));
  const age = Number(profile.age);
  if (Number.isFinite(age) && age < 18) flags.push({ id: "minor", label: "Child or adolescent", level: "block" });
  if (present(profile.allergies)) flags.push({ id: "allergy", label: "Food allergy", level: "review" });
  if (present(profile.intolerances)) flags.push({ id: "intolerance", label: "Food intolerance", level: "review" });
  const blocking = flags.filter((flag) => flag.level === "block");
  return {
    flags,
    generationLimited: blocking.length > 0,
    message: blocking.length
      ? `Personalized generation is paused because ${blocking.map((flag) => flag.label).join(", ")} requires clinician-established nutrition or texture targets.`
      : flags.length ? `Additional review applies: ${flags.map((flag) => flag.label).join(", ")}.` : "",
  };
}
