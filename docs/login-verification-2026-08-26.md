# Production login verification

- The published login form accepted the `admin` local account credentials.
- The application returned a valid local session and redirected to `/overview`.
- The UI confirmed the authenticated identity as `Pro Group Admin`.
- Direct production tRPC login testing also returned HTTP 200 and a secure `local_session` cookie.
- The production tRPC login for `admin_sales` also returned HTTP 200 and a secure session cookie.
- The browser session was explicitly logged out and the production login form was reopened for an independent Admin Sales UI test.
- The Admin Sales form was submitted with the correct credentials. The request completed after roughly 13 seconds, then redirected to `/overview`; the dashboard identified the signed-in user as `Admin Sales`.
- A full browser reload of `/overview` retained the Admin Sales session and authenticated identity.
