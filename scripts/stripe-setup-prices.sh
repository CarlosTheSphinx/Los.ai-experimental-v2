#!/usr/bin/env bash
# stripe-setup-prices.sh — Create all 12 Stripe price objects for Brokr.AI (ORC-85)
#
# Pricing from ORC-47 board-approved document:
#   Starter  $99/mo  | $948/yr  ($79/mo)
#   Pro      $199/mo | $1908/yr ($159/mo)
#   Team     $399/mo | $3828/yr ($319/mo)
#   Founding Broker = 20% off each (perpetual for pilot graduates)
#
# Usage:
#   STRIPE_SECRET_KEY=sk_live_... bash scripts/stripe-setup-prices.sh
#
# Output: copy the printed env var block into your .env / hosting provider.
# Safe to re-run — existing prices are reused via metadata lookup.

set -euo pipefail

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "ERROR: STRIPE_SECRET_KEY is not set." >&2
  exit 1
fi

STRIPE_API="https://api.stripe.com/v1"
AUTH_HEADER="Authorization: Bearer $STRIPE_SECRET_KEY"

# Helper: create or retrieve a Stripe Product
upsert_product() {
  local name="$1"
  local metadata_key="$2"

  # Check if product already exists via metadata
  existing=$(curl -s -G "$STRIPE_API/products" \
    -H "$AUTH_HEADER" \
    --data-urlencode "active=true" \
    --data-urlencode "limit=100" \
    | jq -r --arg k "$metadata_key" '.data[] | select(.metadata.brokr_product_key == $k) | .id' \
    | head -1)

  if [[ -n "$existing" ]]; then
    echo "$existing"
    return
  fi

  curl -s -X POST "$STRIPE_API/products" \
    -H "$AUTH_HEADER" \
    -d "name=$name" \
    -d "metadata[brokr_product_key]=$metadata_key" \
    | jq -r '.id'
}

# Helper: create or retrieve a Stripe Price
upsert_price() {
  local product_id="$1"
  local unit_amount="$2"   # in cents
  local interval="$3"      # month or year
  local nickname="$4"
  local metadata_key="$5"

  # Check if price with this metadata key already exists
  existing=$(curl -s -G "$STRIPE_API/prices" \
    -H "$AUTH_HEADER" \
    --data-urlencode "active=true" \
    --data-urlencode "product=$product_id" \
    --data-urlencode "limit=100" \
    | jq -r --arg k "$metadata_key" '.data[] | select(.metadata.brokr_price_key == $k) | .id' \
    | head -1)

  if [[ -n "$existing" ]]; then
    echo "$existing"
    return
  fi

  curl -s -X POST "$STRIPE_API/prices" \
    -H "$AUTH_HEADER" \
    -d "product=$product_id" \
    -d "unit_amount=$unit_amount" \
    -d "currency=usd" \
    -d "recurring[interval]=$interval" \
    -d "nickname=$nickname" \
    -d "metadata[brokr_price_key]=$metadata_key" \
    | jq -r '.id'
}

echo "=== Brokr.AI Stripe Setup — ORC-85 ===" >&2
echo "" >&2

# ── Products ──────────────────────────────────────────────────────────────────
echo "[1/3] Creating products..." >&2
PROD_STARTER=$(upsert_product "Brokr.AI Starter" "starter")
PROD_PRO=$(upsert_product "Brokr.AI Pro" "pro")
PROD_TEAM=$(upsert_product "Brokr.AI Team" "team")
echo "  Starter:  $PROD_STARTER" >&2
echo "  Pro:      $PROD_PRO" >&2
echo "  Team:     $PROD_TEAM" >&2

# ── Standard Prices ───────────────────────────────────────────────────────────
echo "[2/3] Creating standard prices..." >&2

# Starter: $99/mo, $948/yr (=$79/mo billed annually)
P_STARTER_MONTHLY=$(upsert_price "$PROD_STARTER" 9900  month "Starter Monthly"             "starter_monthly")
P_STARTER_ANNUAL=$(upsert_price  "$PROD_STARTER" 94800 year  "Starter Annual ($79/mo)"      "starter_annual")

# Pro: $199/mo, $1908/yr (=$159/mo billed annually)
P_PRO_MONTHLY=$(upsert_price "$PROD_PRO" 19900  month "Pro Monthly"                  "pro_monthly")
P_PRO_ANNUAL=$(upsert_price  "$PROD_PRO" 190800 year  "Pro Annual ($159/mo)"         "pro_annual")

# Team: $399/mo, $3828/yr (=$319/mo billed annually)
P_TEAM_MONTHLY=$(upsert_price "$PROD_TEAM" 39900  month "Team Monthly"               "team_monthly")
P_TEAM_ANNUAL=$(upsert_price  "$PROD_TEAM" 382800 year  "Team Annual ($319/mo)"      "team_annual")

# ── Founding Broker Prices (20% off, perpetual for pilot graduates) ───────────
echo "[3/3] Creating Founding Broker prices (20% off)..." >&2

# Founding Starter: $79/mo, $756/yr (=$63/mo billed annually)
P_STARTER_MONTHLY_FOUNDING=$(upsert_price "$PROD_STARTER" 7900  month "Starter Monthly — Founding Broker" "starter_monthly_founding")
P_STARTER_ANNUAL_FOUNDING=$(upsert_price  "$PROD_STARTER" 75600 year  "Starter Annual — Founding Broker"  "starter_annual_founding")

# Founding Pro: $159/mo, $1524/yr (=$127/mo billed annually)
P_PRO_MONTHLY_FOUNDING=$(upsert_price "$PROD_PRO" 15900  month "Pro Monthly — Founding Broker" "pro_monthly_founding")
P_PRO_ANNUAL_FOUNDING=$(upsert_price  "$PROD_PRO" 152400 year  "Pro Annual — Founding Broker"  "pro_annual_founding")

# Founding Team: $319/mo, $3060/yr (=$255/mo billed annually)
P_TEAM_MONTHLY_FOUNDING=$(upsert_price "$PROD_TEAM" 31900  month "Team Monthly — Founding Broker" "team_monthly_founding")
P_TEAM_ANNUAL_FOUNDING=$(upsert_price  "$PROD_TEAM" 306000 year  "Team Annual — Founding Broker"  "team_annual_founding")

# ── Output env vars ───────────────────────────────────────────────────────────
echo "" >&2
echo "=== Copy these env vars to your server environment ===" >&2
echo ""
cat <<EOF
STRIPE_PRICE_ID_STARTER_MONTHLY=$P_STARTER_MONTHLY
STRIPE_PRICE_ID_STARTER_ANNUAL=$P_STARTER_ANNUAL
STRIPE_PRICE_ID_PRO_MONTHLY=$P_PRO_MONTHLY
STRIPE_PRICE_ID_PRO_ANNUAL=$P_PRO_ANNUAL
STRIPE_PRICE_ID_TEAM_MONTHLY=$P_TEAM_MONTHLY
STRIPE_PRICE_ID_TEAM_ANNUAL=$P_TEAM_ANNUAL
STRIPE_PRICE_ID_STARTER_MONTHLY_FOUNDING=$P_STARTER_MONTHLY_FOUNDING
STRIPE_PRICE_ID_STARTER_ANNUAL_FOUNDING=$P_STARTER_ANNUAL_FOUNDING
STRIPE_PRICE_ID_PRO_MONTHLY_FOUNDING=$P_PRO_MONTHLY_FOUNDING
STRIPE_PRICE_ID_PRO_ANNUAL_FOUNDING=$P_PRO_ANNUAL_FOUNDING
STRIPE_PRICE_ID_TEAM_MONTHLY_FOUNDING=$P_TEAM_MONTHLY_FOUNDING
STRIPE_PRICE_ID_TEAM_ANNUAL_FOUNDING=$P_TEAM_ANNUAL_FOUNDING
EOF

echo "" >&2
echo "Done. Set the above vars then restart the server — checkout goes live immediately." >&2
