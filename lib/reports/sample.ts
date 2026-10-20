/**
 * The synthetic identity of every public / agent sample report (homepage preview images, the agent sample PDF).
 * A report whose name is the sample name prints the unmistakably synthetic ID below instead of an ID that looks like a customer's
 * (LVA-<date>-<NAME>); production report IDs are unchanged.
 */
export const SAMPLE_APPLICANT_NAME = "Sample Applicant";
export const SAMPLE_REPORT_ID = "SAMPLE-REPORT";

export const isSampleApplicant = (name: string | null | undefined): boolean => (name ?? "").trim().toLowerCase() === SAMPLE_APPLICANT_NAME.toLowerCase();
