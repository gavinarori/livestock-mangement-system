# AgroVault — GitHub Actions Workflows

## Overview

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push / PR | Lint, type-check, build, security audit |
| `deploy.yml` | Push to `main` / manual | Production deployment via Vercel |
| `preview.yml` | Pull requests | Preview deployments + Lighthouse |
| `security.yml` | Weekly Monday / manual | CodeQL, npm audit, secret scanning |
| `backup.yml` | Daily 02:00 UTC / manual | MongoDB backup to artifacts + S3 |
| `release.yml` | Version tags / manual | GitHub Release + production deploy |

---

## Required GitHub Secrets

Configure all of these under **Settings → Secrets and variables → Actions**.

### Vercel
| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel personal access token (Settings → Tokens) |
| `VERCEL_ORG_ID` | Found in Vercel project Settings → General |
| `VERCEL_PROJECT_ID` | Found in Vercel project Settings → General |

### Application
| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | MongoDB connection string (`mongodb+srv://...`) |
| `JWT_SECRET` | Strong random secret for JWT signing (min 64 chars) |
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g. `https://agrovault.co.ke`) |

### Optional — Notifications
| Secret | Description |
|--------|-------------|
| `SLACK_WEBHOOK_URL` | Incoming Webhook URL for deploy/failure alerts |

### Optional — S3 Backups
| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM key with S3 write access |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_REGION` | e.g. `af-south-1` (Cape Town) |
| `BACKUP_S3_BUCKET` | Bucket name for MongoDB backups |

---

## GitHub Environments

Create two environments under **Settings → Environments**:

### `production`
- Enable **Required reviewers** (add at least one reviewer)
- Enable **Deployment branches** — restrict to `main` only
- Add all production secrets above

### `staging`  
- No required reviewers
- Can deploy from any branch

---

## Branch Protection (recommended)

For `main`:
- ✅ Require pull request before merging
- ✅ Require status checks: `lint`, `typecheck`, `build`, `security`
- ✅ Require branches to be up to date
- ✅ Require signed commits
- ✅ Do not allow bypassing the above settings

---

## Generating a secure JWT_SECRET

```bash
openssl rand -base64 64
```

---

## Manual workflows

**Trigger a deployment:**
```
GitHub → Actions → Deploy → Run workflow → Choose environment
```

**Trigger a backup:**
```
GitHub → Actions → Database Backup → Run workflow
```

**Create a release:**
```bash
git tag v1.2.0
git push origin v1.2.0
```
This automatically triggers the release workflow and deploys to production.
