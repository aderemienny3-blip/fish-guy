import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const MUSIC_SESSION_COOKIE = "fgs_music_session";

export const createSessionToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function getSessionHash(): Promise<string | null> {
  const token = (await cookies()).get(MUSIC_SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

export function sessionCookie(request: Request, token: string) {
  const secure = new URL(request.url).protocol === "https:";
  return {
    name: MUSIC_SESSION_COOKIE,
    value: token,
    options: { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 },
  };
}
