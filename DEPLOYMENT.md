# Deployment

## Local Development

Use the single root `.env` file for local development.

```bash
npm run dev
```

This starts:

- Frontend on `http://localhost:5173`
- Backend on `http://localhost:3000`
- Postgres and Redis on internal Docker networks
- MinIO for local private-file testing

The frontend requests signed upload URLs from the backend, uploads directly to object storage, then confirms the upload with the backend. That is the right shape for production because large files do not pass through the API server.

## Production On One EC2

Production uses:

- `compose.yml`
- `compose.prod.yml`
- root `.env` created manually on EC2 from `.env.example`

On the EC2 host:

```bash
git clone <repo-url> HCM
cd HCM
cp .env.example .env
nano .env
```

Fill every `PASTE_*` value. The deploy script refuses to run if placeholders remain.

Then deploy:

```bash
./scripts/deploy-prod.sh "$(pwd)"
```

The only public container port is HTTP port `80` through the Docker Nginx container. Postgres and Redis stay on an internal Docker network.

## GitHub Actions Deployment

The production workflow deploys after `CI` passes on `main`, and can also be run manually.

Create these GitHub secrets:

- `EC2_HOST`: EC2 public IP or DNS name.
- `EC2_USER`: SSH user, usually `ubuntu`.
- `EC2_SSH_KEY`: private key for that EC2 user.
- `EC2_APP_DIR`: deploy directory, for example `/home/ubuntu/HCM`.
- `EC2_SSH_PORT`: optional, defaults to `22`.

The workflow syncs the repository to EC2 but does not sync `.env`. Production `.env` must exist on the EC2 host.

## S3 Notes

Production expects a private S3 bucket:

- Block public access should remain enabled.
- Add CORS for your current HTTP origin, for example `http://EC2_PUBLIC_IP`.
- Allow `PUT`, `GET`, and `HEAD`.
- Allow headers including `Content-Type` and `x-amz-meta-*`.

When you later move to a real infra setup, replace EC2-local Postgres/Redis with RDS/ElastiCache and replace static AWS keys with an EC2 instance role or Secrets Manager.
