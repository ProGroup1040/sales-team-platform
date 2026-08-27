# Production login verification

- The published login form accepted the `admin` local account credentials.
- The application returned a valid local session and redirected to `/overview`.
- The UI confirmed the authenticated identity as `Pro Group Admin`.
- Direct production tRPC login testing also returned HTTP 200 and a secure `local_session` cookie.
- The production tRPC login for `admin_sales` also returned HTTP 200 and a secure session cookie.
- The browser session was explicitly logged out and the production login form was reopened for an independent Admin Sales UI test.
- The Admin Sales form was submitted with the correct credentials. The request completed after roughly 13 seconds, then redirected to `/overview`; the dashboard identified the signed-in user as `Admin Sales`.
- A full browser reload of `/overview` retained the Admin Sales session and authenticated identity.

## Incident follow-up

On the latest production endpoint, both administrative credentials were accepted by the local-login procedure. The accounts are active, not deleted, and each has a configured password hash. The investigation did identify a session-cookie duration unit mismatch: Express receives cookie durations in milliseconds, while the previous login code supplied seconds. The correction preserves the intended one-year session policy rather than issuing an approximately 8.8-hour cookie. The fix has unit coverage and awaits production-header verification after deployment.

After deployment, both production login requests were accepted and the `local_session` cookie carried the corrected one-year `Max-Age` value. A fresh Admin sign-in through the published browser form also redirected successfully to `/overview` and displayed the authenticated Admin identity.
