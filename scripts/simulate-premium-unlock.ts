import { submitFullCheckWaitlist, unlockPremiumReport } from "@/app/[locale]/full-check/actions";

async function run() {
  process.env.SIMULATE_EMAIL_DELIVERY = "true";

  const submitForm = new FormData();
  submitForm.set("email", "ahmet.yilmaz@example.com");
  submitForm.set("fullName", "Ahmet Yilmaz");
  submitForm.set("visaInterest", "190");
  submitForm.set("preferredLanguage", "tr");
  submitForm.set("currentCountry", "Australia");
  submitForm.set("mainGoal", "Skilled migration pathway optimization");
  submitForm.set("passportCountry", "Turkiye");
  submitForm.set("age", "32");
  submitForm.set("occupation", "Software Engineer (261313)");
  submitForm.set("englishLevel", "Superior");
  submitForm.set("englishTestTaken", "yes");
  submitForm.set("occupationConfirmed", "yes");
  submitForm.set("estimatedBudgetRange", "15k-25k AUD");
  submitForm.set("timeline", "0-6");
  submitForm.set("sponsorOrFamily", "married");
  submitForm.set("biggestConcern", "Invitation competitiveness");
  submitForm.set("source", "simulation");

  const submitState = await submitFullCheckWaitlist({ status: "idle" }, submitForm);

  if (submitState.status !== "success" || !submitState.reportId) {
    console.log("Submit state:", submitState);
    throw new Error("Could not create locked report preview.");
  }

  console.log("Preview created:", {
    reportId: submitState.reportId,
    estimatedPoints: submitState.preview?.estimatedPoints,
    pathways: submitState.preview?.pathways.map((p) => `${p.subclass}:${p.confidenceLevel}`),
  });

  const unlockForm = new FormData();
  unlockForm.set("reportId", submitState.reportId);
  unlockForm.set("fullName", "Ahmet Yilmaz");
  unlockForm.set("email", "ahmet.yilmaz@example.com");
  unlockForm.set("phone", "+61412345678");
  unlockForm.set("unlockMethod", "payment");

  const unlockState = await unlockPremiumReport({ status: "idle" }, unlockForm);

  console.log("Unlock result:", {
    status: unlockState.status,
    message: unlockState.message,
    unlockedReportAvailable: Boolean(unlockState.report),
    spouseDocsPresent:
      unlockState.report?.documentChecklist
        ?.flatMap((c) => c.items)
        ?.filter((i) => {
          const n = i.toLowerCase();
          return (
            n.includes("spouse") ||
            n.includes("marriage") ||
            n.includes("esin") ||
            n.includes("evlilik") ||
            n.includes("配偶") ||
            n.includes("结婚")
          );
        }) ?? [],
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
