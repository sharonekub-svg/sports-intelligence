export const ANALYTICS_EVENTS = {
  SIGNUP: "signup",
  LOGIN: "login",
  MATCH_VIEW: "match_view",
  SCANNER_OPEN: "scanner_open",
  PRO_PAGE_VIEW: "pro_page_view",
  CHECKOUT_START: "checkout_start",
  PURCHASE: "purchase",
  SAVE: "save",
  SEARCH: "search",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
