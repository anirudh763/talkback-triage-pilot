# Labels

Put human label files here as `<rater-name>.json`, exactly as the app's **Copy my labels** button produces them. See [../LABELING.md](../LABELING.md) for the rubric, the procedure and the file format.

Compare raters, and the AI against them:

```bash
node scripts/agreement.js labels/rater-a.json labels/rater-b.json
```

No labels have been collected yet.
