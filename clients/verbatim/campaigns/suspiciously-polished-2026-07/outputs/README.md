# Campaign Outputs

This directory is reserved for campaign-specific human-reviewable outputs, such as:

- operator report snapshots
- normalized campaign summaries
- next-test recommendations
- approved decision records derived from live performance

Client Workspace v0.1 creates no runtime and performs no autonomous action.

Generated run artifacts may continue to use the repo-level convention:

```text
output/run-{timestamp}/
```

When an output becomes durable campaign memory, copy or summarize it here and record the decision in `../decision-log.md`.
