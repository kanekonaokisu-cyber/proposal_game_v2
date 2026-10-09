# Supabase setup for shared quiz settings

The GitHub Pages app is static, so `localStorage` alone cannot share settings with players using other devices. Supabase stores the quiz questions and a version number; player pages read the public settings, while editing requires the configured administrator account.

## One-time setup

1. Create a Supabase project.
2. In **SQL Editor**, run [`../supabase/setup.sql`](../supabase/setup.sql).
3. In **Authentication → Providers → Email**, disable new user signups. Create the one administrator account from the Supabase dashboard; do not add a public registration form.
4. In **Project Settings → API**, copy the Project URL and the `anon` / publishable key into `supabase-config.js`. Increment the `?v=` value for that script in `index.html` so browsers fetch the configured values:

   ```js
   window.PROPOSAL_GAME_SUPABASE = {
     url: "https://YOUR_PROJECT.supabase.co",
     anonKey: "YOUR_PUBLIC_ANON_KEY"
   };
   ```

   The browser key is public by design. Never put a service-role key in this file.
5. Commit and deploy `supabase-config.js`. Open `/#/admin` and sign in with the administrator account.
6. Edit the question text, four answer choices, and correct choice, then select **設定を保存してゲームをリセット**.

## Runtime behavior

- All devices read the same question settings. Open player pages check for changes every 10 seconds and when they return to the foreground.
- Saving settings increments the shared version and resets local game progress on each device when it next syncs. Players should restart from the Q1 QR code.
- Question settings are shared; individual answer progress remains local to each device.
- The `anon` role can only read the settings row. Only authenticated users can insert or update it. Keep Supabase email signups disabled and create only the administrator account.
