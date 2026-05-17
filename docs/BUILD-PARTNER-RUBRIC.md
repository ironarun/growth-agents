# Build Partner Rubric

## Purpose

This rubric is used to compare Claude Code and Codex as build partners for `growth-agents`.

The goal is not to decide which model sounds smarter.

The goal is to decide which working loop produces better outcomes for Arun.

## Evaluation method

Use the same repo.

Use branches.

Do not create two separate repos unless explicitly needed.

Example branches:

```bash
git checkout -b claude/creative-generator-skeleton
```

```bash
git checkout -b codex/creative-generator-skeleton
```

Run the same task in both.

Compare the output using this rubric.

## Score each category 1 to 5

1 = poor  
3 = usable  
5 = strong

## 1. Context retention

Did the build partner understand:

- Verbatim is the first client, not the whole business.
- Debate is the current wedge.
- Library/highlights are separate from Debate.
- Consultants are the current ICP.
- Funnel instrumentation comes before creative volume.
- One repo with branches is better than duplicate repos.
- The current goal is a narrow useful slice, not a full platform.

## 2. Step discipline

Did it provide:

- exact commands
- small steps
- clear success criteria
- clear “paste this back” instructions
- no unnecessary wandering

Bad behavior:
- three broad options when one recommendation is needed
- vague “run the app”
- asking for clarification when the next diagnostic is obvious

## 3. Code quality

Did it produce:

- simple TypeScript
- clean file organization
- minimal dependencies
- reviewable diffs
- clear npm scripts
- useful error handling
- no speculative abstractions

Bad behavior:
- overbuilding
- hidden dependencies
- changing unrelated files
- building future phases too early

## 4. Recovery behavior

When something failed, did it:

- identify the error clearly
- name the likely cause
- propose the next smallest diagnostic
- avoid looping on the same failure
- avoid pretending success

## 5. Strategic judgment

Did it push back when needed?

Examples of good pushback:

- Do not build Meta upload yet.
- Do not generate 30 PNGs before one rendered ad works.
- Do not prioritize creative before funnel instrumentation.
- Do not fork the repo just to test Codex.
- Do not build a warehouse before we have campaign data.
- Do not confuse a flashy demo with durable infrastructure.

## 6. Founder usability

Did working with it make Arun:

- move faster
- feel less overwhelmed
- trust the next step
- execute instead of spiral
- understand what changed

This is not soft.

A build partner that creates less friction produces more shipping.

## Decision rule

After the first comparable task, choose one of three outcomes:

### Outcome A: Codex wins implementation

Use:

```text
ChatGPT Project → strategic build partner
Codex → implementation
Claude → legacy context reference
Repo docs → source of truth
```

### Outcome B: Claude Code remains better

Use:

```text
Claude → strategic and implementation partner
Codex → secondary reviewer or experiment lane
Repo docs → source of truth
```

### Outcome C: Hybrid wins

Use:

```text
Claude → context and product strategy
Codex → coding execution
ChatGPT → planning, critique, and portability
Repo docs → source of truth
```

## Non-negotiable lesson

No model should own the company memory.

The repo owns the memory.

The agents read it.

Arun decides.
