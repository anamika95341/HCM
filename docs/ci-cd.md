# CI/CD

## Workflows

- `CI`: runs backend tests, frontend build, Compose validation, and production image builds.
- `Security`: runs gitleaks, dependency review on pull requests, and critical-level npm audits.
- `Deploy Prod`: deploys the `main` branch to the production EC2 host.

## Required GitHub Secrets

### Deployment SSH

- `PROD_SSH_HOST`
- `PROD_SSH_PORT`
- `PROD_SSH_USER`
- `PROD_SSH_PRIVATE_KEY`
- `PROD_DEPLOY_PATH`

## Server Prerequisites

- Docker Engine with Docker Compose plugin installed
- GitHub Actions runner IP allowed through SSH controls if your server is restricted
- A non-root deployment user with Docker access
- The target deployment directory already created or creatable by the deployment user
- `backend/.env` already present on the target server with the real deployment values
- Host nginx installed on the EC2 instance

## Deploy Behavior

The production deploy workflow:

1. Syncs the repository to the target server
2. Uses the existing `backend/.env` on the target server
3. Runs `scripts/deploy-prod.sh`
4. Rebuilds and starts the stack with `docker compose --env-file backend/.env -f compose.yml up -d --build --remove-orphans`
5. Runs backend migrations

## Security Notes

- Only one application env file is required in this deploy path: `backend/.env`
- `backend/.env` remains gitignored and is managed directly on the server
- Containerized nginx has been removed from the active root stack
- Host-level nginx on the EC2 instance should proxy:
  - `/` to `http://127.0.0.1:5173`
  - `/api/` and `/ws` to `http://127.0.0.1:3000`
- Restrict EC2 security groups according to your environment. For a public dev server, keep the intended ports open only as needed.
- A ready-to-use EC2 nginx config is in [`deploy/nginx/hcm-ec2.conf`](/mnt/d/hcmproject/HCM/deploy/nginx/hcm-ec2.conf)
