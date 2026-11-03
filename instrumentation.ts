export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV === "production") {
    return;
  }

  // Dev-only workaround: if this machine's clock is intentionally set away
  // from real time, Clerk's server-side session checks see freshly-issued
  // tokens as already expired (it compares `exp` against `Date.now()`),
  // causing a sign-in/dashboard redirect loop. This never touches the
  // system clock — it only corrects what Date.now() returns inside this
  // one Node.js process, by measuring the offset against an external time
  // source once at server startup.
  try {
    const res = await fetch("https://www.google.com", {
      method: "HEAD",
      cache: "no-store",
    });
    const serverDateHeader = res.headers.get("date");
    if (!serverDateHeader) return;

    const offsetMs = Date.now() - new Date(serverDateHeader).getTime();
    if (Math.abs(offsetMs) < 5000) return; // within Clerk's own default tolerance

    const originalNow = Date.now.bind(Date);
    Date.now = () => originalNow() - offsetMs;

    console.warn(
      `[dev-clock-skew] This process's clock is ~${Math.round(offsetMs / 1000)}s off real time. ` +
        `Patched Date.now() for this dev server process only — no system settings were changed.`,
    );
  } catch {
    // No network at startup, or the check failed — leave the clock untouched.
  }
}
