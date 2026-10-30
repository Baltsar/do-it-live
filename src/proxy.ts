import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "dil_gate";
const MONTH_S = 60 * 60 * 24 * 30;
// Each visitor's own media library in Blob is found by this random id (library-store.ts reads it).
const LIBRARY_COOKIE = "dil_lib";
// The jury link: ?jury=<JURY_CODE> on any page. budget.ts reads the cookie and checks the same hash.
const JURY_COOKIE = "dil_jury";
// Judging runs 9 to 23 December and winners are named late January: the pass outlives both.
const JURY_PASS_S = 60 * 60 * 24 * 120;

function withLibraryId(request: NextRequest, res: NextResponse): NextResponse {
  if (!request.cookies.get(LIBRARY_COOKIE)) {
    res.cookies.set(LIBRARY_COOKIE, crypto.randomUUID(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MONTH_S * 12 });
  }
  return res;
}

const sha256 = async (text: string): Promise<string> => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
};

/** The cookie holds a hash of the password, so the password itself never sits in the browser. */
const tokenFor = (password: string): Promise<string> => sha256(`do-it-live:${password}`);

/**
 * A judge's link sets the jury cookie and comes back without the code, so the code is not left in
 * the address bar, the history or a screenshot. A wrong code is ignored like any other parameter.
 */
async function juryEntry(request: NextRequest): Promise<NextResponse | null> {
  const code = process.env.JURY_CODE;
  const given = request.nextUrl.searchParams.get("jury");
  if (!code || given === null || given !== code) return null;
  const clean = request.nextUrl.clone();
  clean.searchParams.delete("jury");
  const res = NextResponse.redirect(clean, 303);
  res.cookies.set(JURY_COOKIE, await sha256(`do-it-live-jury:${code}`), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: JURY_PASS_S });
  res.headers.set("cache-control", "no-store");
  return withLibraryId(request, res);
}

function gatePage(wrong: boolean): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Do it live</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#000;color:#fff;font-family:system-ui,-apple-system,sans-serif;padding:24px}
form{width:100%;max-width:360px;display:flex;flex-direction:column;gap:16px}h1{margin:0 0 8px;font-size:56px;font-weight:900;letter-spacing:-.05em;line-height:.9}
input{font:inherit;font-size:20px;padding:14px 16px;border-radius:14px;border:2px solid rgba(255,255,255,.2);background:transparent;color:#fff;outline:none}input:focus{border-color:#ffd60a}
button{font:inherit;font-size:18px;font-weight:700;padding:14px;border:0;border-radius:999px;background:#ffd60a;color:#000}p{margin:0;color:#ff4fa3;font-weight:600}</style></head>
<body><form method="post" action="/unlock"><h1>Do it live</h1><input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>${wrong ? "<p>Wrong password.</p>" : ""}<button type="submit">Enter</button></form></body></html>`;
  return new NextResponse(html, { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/**
 * A password in front of everything, the API included: the drawing and director routes spend Nebius
 * credits. Only active where SITE_PASSWORD is set, so local development stays open.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const jury = await juryEntry(request);
  if (jury) return jury;
  const password = process.env.SITE_PASSWORD;
  if (!password) return withLibraryId(request, NextResponse.next());
  const token = await tokenFor(password);

  if (request.nextUrl.pathname === "/unlock" && request.method === "POST") {
    const form = await request.formData();
    if (form.get("password") !== password) return gatePage(true);
    const res = NextResponse.redirect(new URL("/", request.url), 303);
    res.cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MONTH_S });
    return withLibraryId(request, res);
  }

  if (request.cookies.get(COOKIE)?.value === token) return withLibraryId(request, NextResponse.next());
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "password required" }, { status: 401 });
  return gatePage(false);
}

export const config = {
  // The manifest is fetched without cookies, and holds nothing worth hiding.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
