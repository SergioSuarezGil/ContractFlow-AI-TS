export const SERVICE_TYPES = [
  "electricity",
  "gas",
  "insurance",
  "mobile",
  "internet",
  "other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];
