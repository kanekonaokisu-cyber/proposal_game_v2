# Supabase setup for shared quiz settings

The GitHub Pages app is static, so `localStorage` alone cannot share settings with players using other devices. Supabase stores the quiz questions and a version number; player pages read the public settings, while editing requires the configured administrator account.

## One-time setup

1. Create a Supabase project.
2. In **Authentication → Users**, create the one administrator account. In **Authentication → Providers → Email**, disable new user signups. Do not add a public registration form.
3. In **SQL Editor**, run `select id, email from auth.users;` and copy the administrator's `id` (UUID).
4. Open [`../supabase/setup.sql`](../supabase/setup.sql), replace each `REPLACE_WITH_ADMIN_USER_UUID` with that UUID, then run the complete SQL file in **SQL Editor**. This limits writes to the one administrator account.
5. In **Project Settings → API Keys**, copy the **Project URL** and the **Publishable key** (or legacy `anon` key) into `supabase-config.js`. Increment the `?v=` value for that script in `index.html` so browsers fetch the configured values:

   ```js
   window.PROPOSAL_GAME_SUPABASE = {
     url: "https://YOUR_PROJECT.supabase.co",
     anonKey: "YOUR_PUBLIC_ANON_KEY"
   };
   ```

   The Publishable / `anon` key is public by design. Never put a `secret` or `service_role` key in this file.
6. Commit and deploy `supabase-config.js`. Open `/#/admin` and sign in with the administrator account.
7. Edit the question text, four answer choices, correct choice, and the next QR route and player guidance for both correct and incorrect answers, then select **設定を保存してゲームをリセット**. DUMMY1 and DUMMY2 are also editable quiz questions; configure both before players start.

## Runtime behavior

- All devices read the same question settings. Open player pages check for changes every 10 seconds and when they return to the foreground.
- Saving settings increments the shared version and resets local game progress on each device when it next syncs. Players should restart from the Q1 QR code.
- Correct- and incorrect-answer routes and player guidance are configured independently. Routes can use the next normal question or the existing wrong-route QR detour where available. DUMMY1 and DUMMY2 each display a quiz, then lead to Q3 and Q4 respectively. Every answer uses the same answer-result screen; the selected route and its guidance determine which QR the player should find next.
- Question settings are shared; individual answer progress remains local to each device.
- The `anon` role can only read the settings row. Only the administrator UUID configured in the RLS policies can insert or update it. Keep Supabase email signups disabled and create only the administrator account.
