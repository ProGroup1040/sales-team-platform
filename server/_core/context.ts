import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifyAppUserToken } from "../db";
import { getLocalSessionFromRequest } from "../localAuth";
import { getRequestCookie } from "./httpCookies";
import { sdk } from "./sdk";

export type RequestActor = {
  id: number;
  source: "oauth" | "local" | "app_user";
  role: string;
  name: string;
  engineerId: number | null;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  actor: RequestActor | null;
};

export async function createContext(
  opts: CreateExpressContextOptions,
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // Authentication is optional for explicitly public procedures.
    user = null;
  }

  let actor: RequestActor | null = null;

  // Internal app-user sessions take precedence over other session types. Token
  // verification also reloads the account, so inactive accounts are rejected.
  const appToken = getRequestCookie(opts.req, "app_user_token");
  if (appToken) {
    const appUser = await verifyAppUserToken(appToken);
    if (appUser) {
      actor = { ...appUser, source: "app_user" };
    }
  }

  if (!actor) {
    const localSession = await getLocalSessionFromRequest(opts.req);
    if (localSession) {
      actor = {
        id: localSession.engineerId,
        source: "local",
        role: localSession.role,
        name: localSession.name,
        engineerId: localSession.engineerId,
      };
    }
  }

  if (!actor && user) {
    actor = {
      id: user.id,
      source: "oauth",
      role: user.role,
      name: user.name ?? user.email ?? "User",
      engineerId: null,
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    actor,
  };
}
