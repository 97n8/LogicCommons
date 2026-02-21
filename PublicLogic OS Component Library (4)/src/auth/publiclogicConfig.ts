export type PublicLogicRuntimeConfig = {
  msal?: {
    clientId?: string;
    tenantId?: string;
    redirectUri?: string;
    postLogoutRedirectUri?: string;
  };
  sharepoint?: {
    hostname?: string;
    sitePath?: string;
    url?: string;
    vault?: {
      libraryRoot?: string;
      casesListName?: string;
      auditListName?: string;
    };
  };
  puddleJumper?: {
    baseUrl?: string;
    path?: string;
  };
  allowedEmails?: string[];
};

declare global {
  interface Window {
    PUBLICLOGIC_OS_CONFIG?: PublicLogicRuntimeConfig;
  }
}

export const DEFAULT_ALLOWED_EMAILS = [
  "nate@publiclogic.org",
  "allie@publiclogic.org",
];

export function getRuntimeConfig(): PublicLogicRuntimeConfig {
  return window.PUBLICLOGIC_OS_CONFIG ?? {};
}

export function getAllowedEmails(): string[] {
  const custom = getRuntimeConfig();
  const list = custom.allowedEmails?.filter(Boolean);
  return list?.length ? list : DEFAULT_ALLOWED_EMAILS;
}

export function getMsalRuntimeConfig() {
  const custom = getRuntimeConfig();
  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const baseUrl = `${window.location.origin}${basePath}`;

  const clientId =
    custom.msal?.clientId ?? "1b53d140-0779-4a64-943c-a11ba19ec0ce";
  const tenantId =
    custom.msal?.tenantId ?? "12879da8-d927-419b-8a2e-fda32e1732be";
  const redirectUri = custom.msal?.redirectUri ?? baseUrl;
  const postLogoutRedirectUri = custom.msal?.postLogoutRedirectUri ?? baseUrl;

  return { clientId, tenantId, redirectUri, postLogoutRedirectUri };
}

export function getSharePointRuntimeConfig() {
  const custom = getRuntimeConfig();
  return {
    hostname: custom.sharepoint?.hostname ?? "publiclogic978.sharepoint.com",
    sitePath: custom.sharepoint?.sitePath ?? "sites/PL",
    url: custom.sharepoint?.url ?? "https://publiclogic978.sharepoint.com/sites/PL",
    vault: {
      libraryRoot: custom.sharepoint?.vault?.libraryRoot ?? "MunicipalVault",
      casesListName: custom.sharepoint?.vault?.casesListName ?? "PL_PRR_Cases",
      auditListName: custom.sharepoint?.vault?.auditListName ?? "PL_PRR_Audit",
    },
  };
}

type ResolvePjArgs = {
  nodeEnv?: string;
  origin?: string;
  envPjBaseUrl?: string;
};

export function resolvePuddleJumperUrl(args: ResolvePjArgs = {}): string {
  const runtime = getRuntimeConfig();
  const nodeEnv = args.nodeEnv ?? (import.meta.env.PROD ? "production" : "development");
  const origin = args.origin ?? window.location.origin;
  const fromEnv = args.envPjBaseUrl ?? (import.meta.env.VITE_PJ_BASE_URL as string | undefined);
  const configured = runtime.puddleJumper?.baseUrl ?? fromEnv ?? runtime.puddleJumper?.path ?? "/pj";

  if (!configured || configured.trim().length === 0) {
    return "/pj";
  }

  const trimmed = configured.trim();
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  let resolved: URL;
  try {
    resolved = new URL(trimmed, origin);
  } catch {
    return "/pj";
  }

  if (nodeEnv === "production" && resolved.protocol === "http:") {
    resolved = new URL(resolved.toString());
    resolved.protocol = "https:";
    // eslint-disable-next-line no-console
    console.warn("PJ_BASE_URL used http in production; forcing https.");
  }

  return resolved.toString();
}
