import { describe, expect, it } from "vitest";
import type { Response } from "express";
import { setResponseCookie } from "./httpCookies";
import { ONE_YEAR_MS } from "../../shared/const";

describe("setResponseCookie", () => {
  it("uses milliseconds for Express response cookies", () => {
    const cookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const response = {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookieCalls.push({ name, value, options });
      },
    } as unknown as Response;

    setResponseCookie(response, "local_session", "token", { maxAge: ONE_YEAR_MS, httpOnly: true });

    expect(cookieCalls).toHaveLength(1);
    expect(cookieCalls[0]?.options.maxAge).toBe(ONE_YEAR_MS);
  });

  it("converts millisecond durations to seconds for a plain Set-Cookie response", () => {
    const headers: string[] = [];
    const response = {
      append: (_name: string, value: string) => headers.push(value),
    } as unknown as Response;

    setResponseCookie(response, "local_session", "token", { maxAge: ONE_YEAR_MS, path: "/" });

    expect(headers).toHaveLength(1);
    expect(headers[0]).toContain("Max-Age=31536000");
  });
});
