# Frontend deploy (Vercel)

This repository contains a GitHub Actions workflow that can deploy the frontend to Vercel.

Required secret:

- `VERCEL_TOKEN` — a Vercel token with deploy permissions. Add it under Settings → Secrets → Actions.

How it runs:

- On `push` to `main`: will run a production deploy.

- On `workflow_dispatch`: will run a preview deploy by default; pass `target=production` to deploy to production.

Manual CLI (local):

```powershell
$env:VERCEL_TOKEN = '<your-token>'
cd .\frontend
npx vercel --token $env:VERCEL_TOKEN --confirm    # preview
npx vercel --token $env:VERCEL_TOKEN --prod --confirm  # production
```
