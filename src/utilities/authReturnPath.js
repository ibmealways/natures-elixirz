export const BETA_ADMIN_RETURN_PATH = "/beta-admin";

export function safeAuthReturnPath(search) {
  const returnTo = new URLSearchParams(search).get("returnTo");
  return returnTo === BETA_ADMIN_RETURN_PATH ? BETA_ADMIN_RETURN_PATH : null;
}

export function accountAccessPath(returnTo = null) {
  return returnTo === BETA_ADMIN_RETURN_PATH
    ? `/account?returnTo=${encodeURIComponent(BETA_ADMIN_RETURN_PATH)}#account-access`
    : "/account#account-access";
}
