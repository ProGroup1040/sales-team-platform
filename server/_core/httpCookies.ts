import type { Request, Response } from "express";
import * as cookieModule from "cookie";

type SerializeOptions = {
  /** Express-compatible duration in milliseconds. */
  maxAge?: number;
  expires?: Date;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
};

type CookieApi = {
  parse(header: string): Record<string, string | undefined>;
  serialize(name: string, value: string, options?: SerializeOptions): string;
};

const cookie = cookieModule as unknown as CookieApi;

function toSerializedCookieOptions(options: SerializeOptions): SerializeOptions {
  if (options.maxAge === undefined) return options;
  return {
    ...options,
    // `cookie.serialize` expects seconds whereas Express's `res.cookie` expects
    // milliseconds. Keep this wrapper's public contract Express-compatible.
    maxAge: Math.floor(options.maxAge / 1000),
  };
}

export function getRequestCookie(req: Request, name: string): string | undefined {
  return cookie.parse(req.headers.cookie ?? "")[name];
}

export function setResponseCookie(
  res: Response,
  name: string,
  value: string,
  options: SerializeOptions = {},
): void {
  if (typeof res.cookie === "function") {
    // Express's cookie middleware is not required; this branch is retained for
    // hosts that provide it, while the append branch works on plain Express.
    res.cookie(name, value, options);
    return;
  }
  res.append("Set-Cookie", cookie.serialize(name, value, toSerializedCookieOptions(options)));
}

export function clearResponseCookie(
  res: Response,
  name: string,
  options: SerializeOptions = {},
): void {
  if (typeof res.clearCookie === "function") {
    res.clearCookie(name, { ...options, maxAge: -1 });
    return;
  }
  setResponseCookie(res, name, "", { ...options, maxAge: 0 });
}
