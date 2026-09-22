# ABC List

Three columns. **A** is what must happen today, **B** is what needs to happen this week,
**C** is what needs to happen eventually. Drag items between them, tick them off, and
completed items go to an archive rather than disappearing.

Runs as a static site on GitHub Pages. Data lives in Supabase. One shared password for
the family.

---

## How the password actually works

GitHub Pages only serves files, so a password checked in JavaScript would be theatre:
anyone could view the source, skip the check, and read the data anyway.

This app does it properly instead:

- The password is checked by **Supabase Auth**, on Supabase's servers.
- A correct password returns a short-lived token. Every read and write carries it.
- **Row Level Security** policies (in [`supabase/schema.sql`](supabase/schema.sql)) reject
  any request whose token is missing or belongs to someone else.

So the browser never decides who gets in. Without the password there is no token, and
without a token the database returns nothing.

The **publishable** key that ships in the bundle is **public by design**. It names the
project, it does not grant access. Supabase publishes it for exactly this use.

What this protects against: strangers finding the URL, search engines, anyone poking at
the site. What it does not protect against: someone your family gives the password to, or
a family member's unlocked phone. It is a family board, not a vault. Personnel matters and
anything confidential belong somewhere else.

---

## Setup

Roughly 15 minutes, nearly all of it in the Supabase dashboard.

### 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project (the free tier is
   plenty for this).
2. Pick a region near you and save the database password it generates somewhere safe. You
   will not need it for this app, but you will want it eventually.

### 2. Create the tables

In the dashboard: **SQL Editor → New query**. Paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), then **Run**. It is safe to re-run later.

### 3. Create the one shared family account

**Authentication → Users → Add user → Create new user**

- Email: anything you control, for example `family@yourdomain.com`. Nobody types this into
  the app; it just names the account the password belongs to.
- Password: **this is the family password.** Pick something you are happy saying out loud
  to everyone in the house.
- Tick **Auto Confirm User**, otherwise the account cannot sign in until a confirmation
  email is clicked.

Everyone in the family signs in as this one account. That is what makes the board shared.

### 4. Close the door behind you

In the **Authentication** section, find the setting **"Allow new users to sign up"** and
turn it **off**. Supabase moves this one around between dashboard versions, so if it is
not where you expect, search the dashboard for that phrase.

Do not skip this. Without it, anybody could register their own account on your project.
They would not see your lists, since the policies in step 2 stop that, but there is no reason
to let strangers create accounts at all.

### 5. Collect the two settings

Click **Connect** at the top of the project dashboard. It shows the project URL and the
publishable key side by side, ready to copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **Publishable key**, starting `sb_publishable_` → `VITE_SUPABASE_PUBLISHABLE_KEY`

If the Connect dialog shows no publishable key, go to **Settings → API Keys** and create
one. That page also lists every key the project has.

Two things worth knowing, because most tutorials still describe the old setup:

- Supabase renamed these keys in 2025. What used to be called the **anon / public** key
  is now the **publishable** key. The old name still works but is deprecated at the end
  of 2026, so use the new one.
- There is **no longer a Settings → API page**. Keys live under **Settings → API Keys**.

Do not use the **secret** key (`sb_secret_`). It bypasses row level security and must
never reach a browser.

### 6. Run it locally (optional, but worth doing once)

```bash
cp .env.example .env.local
```

Fill in the URL, the publishable key, and the family email from step 3, then:

```bash
npm install && npm run dev
```

Open the printed address and sign in with the family password.

### 7. Put it on GitHub Pages

Create the repository and push:

```bash
gh repo create abc-list --public --source=. --remote=origin --push
```

On a free GitHub account, Pages needs a public repository. That is fine here: the
repository holds no secrets. The Supabase settings are injected at build time from the
secrets below, and the publishable key is public by design anyway.

Add the three build secrets under **Settings → Secrets and variables → Actions → New
repository secret**, named exactly:

| Secret | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL from step 5 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key from step 5 |
| `VITE_FAMILY_EMAIL` | The email from step 3 |

Or from the terminal:

```bash
gh secret set VITE_SUPABASE_URL && gh secret set VITE_SUPABASE_PUBLISHABLE_KEY && gh secret set VITE_FAMILY_EMAIL
```

Then **Settings → Pages → Source → GitHub Actions**, and either push again or run the
workflow by hand from the **Actions** tab. The site lands at
`https://<your-username>.github.io/abc-list/`.

---

## Using it

- **Add.** Type in the box at the bottom of a column and press Enter.
- **Move.** Drag by the grip on the left of a card. On a phone, press and hold briefly
  first so the page can still scroll. The **⋯** menu has "Move to" as an alternative, which
  also works with a keyboard and a screen reader.
- **Reorder.** Drag up and down inside a column.
- **Complete.** Click the circle. The item moves to the archive; nothing is deleted.
- **Archive.** The button in the top right. Search it, restore anything back to the
  column it came from, or delete for good.
- **Edit.** Click an item's text. Enter saves, Escape cancels.

Two people with the board open see each other's changes live.

Signing in lasts until you sign out, so the family only types the password once per device.

---

## Changing the family password

**Authentication → Users**, click the family user, **Reset password** (or delete the user
and recreate it). Everyone signed in stays signed in until their session expires, so sign
out on any device you want locked out immediately.

Nothing needs rebuilding, because the password is not part of the site.

---

## Layout

```
src/
  lib/supabase.ts    Supabase client and build-time config check
  lib/types.ts       Item and list shapes, the A/B/C labels
  lib/ordering.ts    Fractional positions, so a drag writes one row
  hooks/useAuth.ts   Sign in, sign out, session
  hooks/useItems.ts  Loading, writes, optimistic updates, live sync
  components/        Login, Board, Column, ItemCard, Archive
supabase/schema.sql  Tables, indexes, and the row level security policies
.github/workflows/   Build and deploy to Pages on every push to main
```

## Notes

- **Ordering.** Items carry a floating point `position`; a drop lands midway between its
  new neighbours, so a reorder writes one row rather than renumbering the column. When a
  gap gets too small to split, that column is renumbered once.
- **Failed writes.** Every change is applied locally first, then sent. If the write fails,
  a banner appears and the board is reloaded from the server, so what you see is never a
  change that did not actually save.
- **Free tier.** Supabase pauses projects after a long stretch of inactivity. Ordinary use
  keeps it awake; if it ever pauses, the dashboard has a Resume button and nothing is lost.
