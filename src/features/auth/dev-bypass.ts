export const isDevAuthBypassEnabled = () =>
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_AUTH_BYPASS === "true";
