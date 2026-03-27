# FitDuo — Self-Hosted Setup

## Step 1: Create Supabase database (free)

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Go to **SQL Editor** and run this query:

```sql
create table fitduo (
  key text primary key,
  value text not null
);

-- Allow anyone to read/write (since this is a private shared app)
alter table fitduo enable row level security;
create policy "allow all" on fitduo for all using (true) with check (true);
```

4. Go to **Project Settings → API**
5. Copy your **Project URL** and **anon/public key**
6. Open `src/App.jsx` and replace at the top:
   ```js
   const SUPABASE_URL = "YOUR_SUPABASE_URL";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
   ```

---

## Step 2: Deploy to Vercel (free)

1. Push this folder to a GitHub repo
2. Go to https://vercel.com and sign in with GitHub
3. Click **Add New Project** → import your repo
4. Click **Deploy** — done!
5. Vercel gives you a URL like `https://fitduo-abc123.vercel.app`

---

## Step 3: Set up iPhone Shortcut

1. Open the **Shortcuts** app
2. Create a new Shortcut
3. Add these actions in order:

   **Action 1:** Find Health Samples
   - Type: Step Count
   - Start Date: is today

   **Action 2:** Find Health Samples
   - Type: Active Energy Burned
   - Start Date: is today

   **Action 3:** Find Health Samples
   - Type: Exercise Minutes (or Apple Exercise Time)
   - Start Date: is today

   **Action 4:** Text
   - Type this URL, inserting the Health Sample variables where shown:
   ```
   https://YOUR-VERCEL-URL.vercel.app?user=you&steps=[Steps Health Samples]&calories=[Active Energy Health Samples]&active_min=[Exercise Minutes Health Samples]
   ```
   - Tap where it says STEPS/CALORIES/MINUTES and use the variable picker to insert each Health Samples result

   **Action 5:** Open URLs
   - Input: the Text from Action 4

4. Optionally go to **Automations** tab → add Time of Day triggers (e.g. 8am, 12pm, 6pm, 10pm)

---

## Your wife's Shortcut
Same steps but change `user=you` to `user=wife` in the URL.
