## Goal

Inside the World mini app, Google's OAuth is blocked by Google's embedded-webview policy and fails with "Sign in failed". When Villedge is opened from World App, we should hide the Google button entirely and present World ID as the primary (and effectively only top-level) sign-in option.

Scope is limited to World App detection. Telegram Mini App behavior is unchanged.

## Changes

**1. New helper: `src/lib/inAppBrowser.ts`**
- Export `isWorldApp()` — detects World App webview via `navigator.userAgent` (contains `WorldApp`) and `window.WorldApp` global injected by World App.
- Pure client-side check, SSR-safe (`typeof window !== 'undefined'`).

**2. `src/components/AuthDialog.tsx`**
- Import `isWorldApp`.
- Compute `const inWorldApp = isWorldApp();` once.
- If `inWorldApp`:
  - Do not render the Google `<Button>`.
  - Render `WorldIdLoginButton` as the sole primary option.
  - Keep the "Other Methods" collapsible (TON, Privy) as-is so users still have fallbacks.
- Otherwise: render the current Google + World ID stack unchanged.

No changes to:
- `WorldIdLoginButton`, `lovable.auth.signInWithOAuth`, or any edge function.
- Telegram, TON, Privy flows.
- Styling/copy of the dialog header.

## Out of scope

- Telegram/Instagram/Facebook in-app webview handling.
- Any "open in external browser" fallback for Google.
- Backend or OAuth provider configuration.

## Verification

- In a normal desktop/mobile browser: dialog looks identical to today (Google + World ID).
- In World App: only World ID shows at the top; Google is gone; "Other Methods" still expandable.
