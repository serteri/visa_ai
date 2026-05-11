export const VISA_TRACKING_STATUSES = [
  "planning",
  "preparing",
  "submitted",
  "waiting",
  "approved",
  "rejected",
] as const;

export type VisaTrackingStatus = (typeof VISA_TRACKING_STATUSES)[number];
