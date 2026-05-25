# SETUP

Critical first steps for growth-agents. Run these in order. Each step has a verification check before you move on.

These commands assume Git Bash (or any POSIX shell) on Windows. If a step fails, stop and paste the error to Claude in claude.ai before moving on.

---

## Step 0: Confirm you're in the right place

```bash
cd /c/Users/Arun/growth-agents
pwd
```

**Expected:** `/c/Users/Arun/growth-agents`

---

## Step 1: git init + first commit

```bash
git init
git branch -M main
printf "node_modules/\n.env\ndist/\n.DS_Store\noutput/\n" > .gitignore
git add .gitignore
git commit -m "chore: initial gitignore"
```

**Verify:** `git log --oneline` shows one commit.

---

## Step 2: package.json + initial dependencies

```bash
npm init -y
npm install --save dotenv @anthropic-ai/sdk node-fetch
npm install --save-dev typescript @types/node tsx
```

Then edit `package.json` and add this line near the top, after `"main"`:

```
"type": "module",
```

Create a basic `tsconfig.json`:

```bash
npx tsc --init --target es2022 --module es2022 --moduleResolution bundler --strict --esModuleInterop --skipLibCheck
```

**Verify:** Run `node -e "import('@anthropic-ai/sdk').then(()=>console.log('ok'))"`. Should print `ok`.

---

## Step 3: .env scaffold

Create `.env.example`:

```bash
cat > .env.example <<'EOF'
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=1164218856768665
META_PIXEL_ID=26411512478545039
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
HERMES_API_KEY=
COMPOSIO_API_KEY=
EOF
```

Copy to `.env`:

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in the keys you have today. The ones I expect you can fill immediately:

- `ANTHROPIC_API_KEY` (you have a console.anthropic.com key)
- `META_AD_ACCOUNT_ID` (already prefilled: 1164218856768665)
- `META_PIXEL_ID` (already prefilled: 26411512478545039)
- `META_ACCESS_TOKEN` (generate at developers.facebook.com if you don't have one; we can defer this until Sunday)
- `PERPLEXITY_API_KEY` (sign up at perplexity.ai if you don't have one)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (same Supabase project as Verbatim works; copy from ai-highlighter's .env.local)

`HERMES_API_KEY` and `COMPOSIO_API_KEY` get added later. Leave blank for now.

**Verify:** `head -3 .env` shows your filled keys.

---

## Step 4: Folder structure check

The directories should already exist (Claude created them). Verify:

```bash
ls -la agents/paid-ads/skills/
```

**Expected:** `creative-generator/` and `pain-point-scraper/`

---

## Step 5: Verify Meta Pixel on helloverbatim.com

Switch to the Verbatim repo:

```bash
cd /c/Users/Arun/ai-highlighter
grep -ri "fbq\|26411512478545039\|meta.*pixel" app/ 2>/dev/null | head -10
```

**If nothing returns:** Pixel is NOT in the codebase yet. Stop. Tell Claude.

**If it returns matches:** Make sure the changes are deployed to Vercel (run `vercel ls` or check the Vercel dashboard for the latest deployment).

Then open https://helloverbatim.com in Chrome with the **Meta Pixel Helper** extension installed. The Pixel Helper icon should show a green check and "1 pixel found." If it doesn't, the deploy hasn't propagated or the Pixel ID is wrong.

Finally, open https://business.facebook.com/events_manager2 and check that PageView events are firing for Pixel 26411512478545039.

**Verify:** Pixel Helper green + Events Manager shows live PageView.

---

## Step 6: Add waitlist email capture on helloverbatim.com

This is the paid-intent signal for the weekend test. Without it, the ads are blind.

In `ai-highlighter`, you need:

1. A Supabase table `waitlist` with columns:
   - `id` uuid primary key default gen_random_uuid()
   - `email` text not null
   - `tier` text not null check (tier in ('free','pro','power'))
   - `created_at` timestamptz default now()
2. An API route at `app/api/waitlist/route.ts` that POSTs email + tier to Supabase
3. A hero-section component on the home page with: email input, tier selector ($0 / $12 / $29), submit button

If you'd like, hand this to a CC session in the ai-highlighter repo with this prompt:

> Add a /api/waitlist route that POSTs {email, tier} to a new Supabase 'waitlist' table. Add a hero-section component on app/page.tsx with an email input, a tier selector showing $0/Free, $12/Pro, $29/Power, and a submit button. Wire the Meta Pixel to fire a custom 'waitlist_signup' event with the tier as a property on submit. Deploy and verify in the live site.

When it's deployed and a test submission lands in Supabase, you're green.

**Verify:** Submit a test email + tier on helloverbatim.com. Confirm a row appears in Supabase `waitlist` table.

---

## Step 7: Switch back to growth-agents and stub the first skill

```bash
cd /c/Users/Arun/growth-agents
```

Create the skill stub:

```bash
cat > agents/paid-ads/skills/creative-generator/index.ts <<'EOF'
import 'dotenv/config';

type Brief = {
  hook: string;
  body: string;
  brand: { primary: string; logoUrl: string };
  audience: string;
};

export async function generate(brief: Brief) {
  console.log('TODO: generate 1080x1080 PNG via React + html2canvas using brief:', brief);
  return { path: 'TODO' };
}

// Smoke test
if (import.meta.url === `file://${process.argv[1]}`) {
  generate({
    hook: "Adversarial review for AI.",
    body: "Verbatim is adversarial review for AI work before you act on it.",
    brand: { primary: '#F12258', logoUrl: 'https://helloverbatim.com/logo.png' },
    audience: 'independent-consultants',
  });
}
EOF
```

**Verify:** Run `npx tsx agents/paid-ads/skills/creative-generator/index.ts`. Should print `TODO: generate 1080x1080 PNG...` with the brief object.

---

## Step 8: Open Claude Code in this repo and hand off

```bash
cd /c/Users/Arun/growth-agents
claude
```

In the new CC session, paste this initial brief:

> Read CLAUDE.md, ARCHITECTURE.md, WEEKEND-PLAN.md, and briefs/verbatim-consultant-test.md. Then expand `agents/paid-ads/skills/creative-generator/index.ts` into a working React + html2canvas ad variant generator following the Cody Schneider pattern. Input: a Brief JSON. Output: 1080x1080 PNG files in `output/run-{timestamp}/`. Use Puppeteer or Playwright headless to render the React component server-side and rasterize to PNG. Generate ONE test variant from the Verbatim consultant brief and show me what it looks like. Stop and ask before moving to bulk generation.

Run that. When CC produces a variant, screenshot it and paste back to Claude in claude.ai for interpretation.

---

## Saturday evening checkpoint

By tonight you should have:

- [ ] growth-agents repo exists with foundation (Steps 0-4 complete)
- [ ] Meta Pixel verified live on helloverbatim.com (Step 5)
- [ ] Waitlist email capture verified live on helloverbatim.com (Step 6)
- [ ] creative-generator skill stub renders one test variant (Step 7-8)

If any of these are red, tell Claude in claude.ai before Sunday so we can adjust the Sunday plan.

---

## Sunday plan

See WEEKEND-PLAN.md for the full Sunday playbook (30 variants, curate to 5, upload to Meta, configure audience, target $45/day across two ad sets).
