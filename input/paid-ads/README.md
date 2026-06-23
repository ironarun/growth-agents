# Paid Ads Input Files

Use this folder for local Paid Ads Agent research instructions.

Tracked example:

```powershell
npm.cmd run agent:paid-ads -- --instruction-file .\input\paid-ads\batch-research-example.txt
```

Private working files should use the `.local.txt` suffix:

```text
input/paid-ads/batch-research-2026-06-23.local.txt
```

`.local.txt` files are ignored by git. Do not store credentials, account IDs that should remain private, or browser session data in these files.
