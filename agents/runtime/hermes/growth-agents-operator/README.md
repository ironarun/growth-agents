# growth-agents-operator

This is the boot package for a dedicated Hermes project agent named `growth-agents-operator`.

It is separate from Arun's personal Hermes agent. It exists only to operate the `growth-agents` repo and the Supabase warehouse through approved workflows.

The operator's job is to run repeatable GTM engineering workflows safely:

- Read repo operating context.
- Run approved local scripts.
- Write to Supabase only through approved scripts.
- Generate output files.
- Report results clearly.

Runtime comes first. Specialization comes second.

This agent may later be cloned into specialized Paid Ads, SEO, Content Strategist, and Outreach agents, but this boot package is intentionally generic. The first proof task is not marketing work. The first proof task is proving the operator can run approved npm scripts, stop on failure, and report without exposing secrets.

