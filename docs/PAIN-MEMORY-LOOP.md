# Pain Memory Loop

Pain-point memory connects Conversation Scout to Creative Generator.

The GTM engine loop is:

```text
conversation discovery
-> profile-routed review queue
-> pain-point memory
-> creative research inputs
-> template candidates
-> generated variants
-> performance feedback
-> next action recommendation
```

## What Pain-Point Memory Is

Pain-point memory is structured market signal extracted from conversations.

It is not generic notes. It is the reusable evidence layer that captures what people care about, how they describe the problem, what they object to, and what emotional pressure sits underneath the words.

Current output:

```text
output/run-{timestamp}/pain-point-memory.json
```

Each record includes:

- `id`
- `sourcePostId`
- `platform`
- `topic`
- `selectedProfile`
- `audience`
- `painPoint`
- `audienceLanguage`
- `objection`
- `emotionalTrigger`
- `creativeAngle`
- `suggestedTemplateUse`
- `confidence`
- `notes`

## Why It Matters

Pain-point memory is the bridge between distribution and creative generation.

Conversation Scout should not only help Arun decide whether to reply to a post. It should also capture reusable market language and objections that can become:

- Ad hooks.
- Reply patterns.
- Organic posts.
- Creative template candidates.
- Verbatim positioning tests.
- Future client GTM inputs.

The point is to turn live audience signal into structured creative inputs, not to treat every conversation as a one-off comment opportunity.

## How It Feeds Creative Generator

Pain-point memory should map into Creative Generator briefs and template planning.

Field mapping:

| Pain memory field | Creative Generator target |
| --- | --- |
| `painPoint` | `researchInputs.audiencePainPoints` |
| `audienceLanguage` | `researchInputs.resonantCopyPatterns` or `researchInputs.sourceNotes` |
| `objection` | `researchInputs.objectionsToAddress` |
| `emotionalTrigger` | Creative angle and template rationale |
| `creativeAngle` | `templateCandidates.copyPattern` or `templateCandidates.whyThisTemplate` |
| `suggestedTemplateUse` | `templateCandidates.sourceReferences` or template notes |

Example:

```text
painPoint:
AI output can sound client-ready while hiding a missing assumption.

audienceLanguage:
confident paragraph, sounds right, client catches the missing assumption

objection:
I already review AI work myself, but I may miss the confident wrong paragraph.

creativeAngle:
Confidence is not correctness. Pressure-test the conclusion before it reaches the client.
```

This can feed:

- A Verbatim consultant ad hook.
- A Debate-focused template candidate.
- A LinkedIn reply pattern.
- A landing-page section about client-facing risk.

## Current Boundary

Current system:

```text
manual seed posts
-> pain-point-memory.json
```

Not yet:

- Automatic ingestion.
- Warehouse tables.
- Scoring over time.
- Deduplication.
- Cross-run memory consolidation.
- Pushing memory directly into Creative Generator briefs.

This boundary is intentional. The first job is to prove that manually collected conversations can produce useful structured memory.

## Next Implementation Steps

Likely next steps:

1. Add a sample `pain-point-memory.json` fixture.
2. Add a converter that turns `pain-point-memory.json` into Creative Generator `researchInputs`.
3. Add confidence filtering.
4. Add deduplication by `painPoint` and `audienceLanguage`.
5. Add cross-run memory consolidation.
6. Later, store memory in Supabase.

Do not add ingestion or warehouse work before the manual memory loop is producing useful signal.
