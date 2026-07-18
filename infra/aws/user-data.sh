#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VYBEON — EC2 bootstrap (user-data), IP-only deployment (no domain / no TLS)
#
# Paste this as "User data" when launching the instance. It installs Docker +
# Compose and clones the repo, then STOPS. It deliberately does NOT write any
# secrets: EC2 user-data is readable by anything that can reach the instance
# metadata endpoint, so real credentials must never live here.
#
# After boot, SSH in and finish (see FINAL STEPS printed to /var/log/vybe-setup.log):
#   ssh -i vybe-key.pem ubuntu@<ELASTIC_IP>
#   cd /opt/vybe && sudo cp .env.example .env && sudo nano .env   # fill in secrets
#   sudo docker compose -f infra/docker-compose.yml up -d
# ─────────────────────────────────────────────────────────────────────────────
set -euxo pipefail
exec > >(tee -a /var/log/vybe-setup.log) 2>&1

REPO_URL="https://github.com/praveenyadav1019/Vybe.git"
APP_DIR="/opt/vybe"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# ── Docker Engine + Compose plugin (official repo) ───────────────────────────
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker ubuntu || true

# ── Clone the app ────────────────────────────────────────────────────────────
if [ ! -d "$APP_DIR/.git" ]; then
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi
chown -R ubuntu:ubuntu "$APP_DIR"

# ── Kernel tuning for a TURN relay (many concurrent UDP flows) ───────────────
cat >/etc/sysctl.d/99-vybe-turn.conf <<'EOF'
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.udp_mem=65536 131072 262144
fs.file-max=200000
EOF
sysctl --system || true

cat <<'BANNER'
================================================================
 VYBEON bootstrap complete — MANUAL STEPS REQUIRED
================================================================
 1) ssh -i vybe-key.pem ubuntu@<ELASTIC_IP>
 2) cd /opt/vybe && cp .env.example .env && nano .env
      Required for this deployment:
        POSTGRES_PASSWORD=<long random>
        JWT_SECRET=<32+ random chars>
        TURN_SECRET=<openssl rand -hex 32>     # must equal coturn's secret
        TURN_EXTERNAL_IP=<this box's ELASTIC IP>
        TURN_HOST=<this box's ELASTIC IP>      # what mobile clients dial
        TURN_TLS_ENABLED=false                 # no domain yet
        NODE_ENV=production
 3) docker compose -f infra/docker-compose.yml up -d
 4) docker compose -f infra/docker-compose.yml exec api npx prisma migrate deploy
 5) Verify:  curl http://localhost/health
================================================================
BANNER
