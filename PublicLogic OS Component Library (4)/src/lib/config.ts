const basePath = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

export const config = {
  msal: {
    clientId: "1b53d140-0779-4a64-943c-a11ba19ec0ce",
    tenantId: "12879da8-d927-419b-8a2e-fda32e1732be",
    redirectUri: `${window.location.origin}${basePath}`,
    postLogoutRedirectUri: `${window.location.origin}${basePath}`,
    cacheLocation: "sessionStorage" as const,
  },
  graph: {
    scopes: ["User.Read", "Sites.ReadWrite.All"],
  }
};
