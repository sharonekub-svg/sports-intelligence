export const ANALYTICS_EVENTS = {
  SIGNUP: "signup",
  LOGIN: "login",
  MATCH_VIEW: "match_view",
  OPPORTUNITIES_VIEW: "opportunities_view",
  CHECKOUT_START: "checkout_start",
  PURCHASE: "purchase",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
