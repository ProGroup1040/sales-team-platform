export function getSessionSecret(environment: NodeJS.ProcessEnv = process.env) {
  // APP_JWT_SECRET is an application-owned override for environments where the
  // platform-managed JWT_SECRET cannot be changed directly.
  return environment.APP_JWT_SECRET?.trim() || environment.JWT_SECRET?.trim() || "";
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: getSessionSecret(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
