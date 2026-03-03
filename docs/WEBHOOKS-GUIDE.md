# Webhooks Guide

## Overview

Webhooks enable real-time notifications when important events occur in Lendry. Instead of continuously polling the API for changes, webhooks send HTTP POST requests to your application when events happen.

**Key Benefits:**
- Real-time notifications (near-instantaneous delivery)
- Reduced API calls and bandwidth usage
- Automatic retry logic (up to 5 retries with exponential backoff)
- HMAC-SHA256 signature verification for security
- Complete audit trail of all deliveries

---

## Getting Started

### Step 1: Create a Webhook Subscription

```bash
curl -X POST https://api.lendry.io/api/webhooks \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deal Status Updates",
    "url": "https://yourdomain.com/webhooks/deals",
    "events": ["deals.created", "deals.updated", "deals.status_changed"],
    "rateLimitPerSecond": 10
  }'
```

**Response:**
```json
{
  "id": "webhook_abc123...",
  "name": "Deal Status Updates",
  "url": "https://yourdomain.com/webhooks/deals",
  "events": ["deals.created", "deals.updated", "deals.status_changed"],
  "active": true,
  "createdAt": "2026-03-03T12:00:00Z"
}
```

### Step 2: Implement Your Webhook Receiver

Create an HTTPS endpoint to receive events:

**Node.js/Express:**

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'webhook-id-from-lendry'; // Use your webhook ID

app.post('/webhooks/deals', (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-webhook-signature'];
  const eventId = req.headers['x-event-id'];
  const timestamp = req.headers['x-timestamp'];

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Verify timestamp (prevent replay attacks)
  const webhookTime = new Date(timestamp).getTime();
  const now = Date.now();
  if (Math.abs(now - webhookTime) > 5 * 60 * 1000) { // 5 minute window
    return res.status(401).json({ error: 'Request too old' });
  }

  // 3. Process the event
  const { event, data } = req.body;

  switch (event) {
    case 'deals.created':
      handleDealCreated(data);
      break;
    case 'deals.updated':
      handleDealUpdated(data);
      break;
    case 'deals.status_changed':
      handleStatusChanged(data);
      break;
  }

  // 4. Return 2xx to confirm delivery
  res.json({ received: true });
});

function handleDealCreated(deal) {
  console.log(`New deal created: ${deal.id}`);
  // Your business logic here
}

function handleDealUpdated(deal) {
  console.log(`Deal updated: ${deal.id}`);
  // Your business logic here
}

function handleStatusChanged(data) {
  console.log(`Deal ${data.id} status changed: ${data.previousStatus} → ${data.newStatus}`);
  // Your business logic here
}

app.listen(3000);
```

**Python/Flask:**

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json
from datetime import datetime, timedelta

app = Flask(__name__)

WEBHOOK_SECRET = 'webhook-id-from-lendry'

@app.route('/webhooks/deals', methods=['POST'])
def receive_webhook():
    # 1. Verify signature
    signature = request.headers.get('X-Webhook-Signature')
    event_id = request.headers.get('X-Event-Id')
    timestamp = request.headers.get('X-Timestamp')

    if not all([signature, event_id, timestamp]):
        return {'error': 'Missing required headers'}, 401

    payload = request.get_data()
    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_sig):
        return {'error': 'Invalid signature'}, 401

    # 2. Verify timestamp
    webhook_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    now = datetime.utcnow().replace(tzinfo=webhook_time.tzinfo)

    if abs((now - webhook_time).total_seconds()) > 300:
        return {'error': 'Request too old'}, 401

    # 3. Process event
    data = request.json
    event = data.get('event')

    if event == 'deals.created':
        handle_deal_created(data['data'])
    elif event == 'deals.updated':
        handle_deal_updated(data['data'])
    elif event == 'deals.status_changed':
        handle_status_changed(data['data'])

    # 4. Return 2xx
    return {'received': True}, 200

def handle_deal_created(deal):
    print(f"New deal created: {deal['id']}")
    # Your business logic here

def handle_deal_updated(deal):
    print(f"Deal updated: {deal['id']}")
    # Your business logic here

def handle_status_changed(data):
    print(f"Deal {data['id']} status: {data['previousStatus']} → {data['newStatus']}")
    # Your business logic here

if __name__ == '__main__':
    app.run(port=3000, ssl_context='adhoc')  # HTTPS required
```

### Step 3: Test Your Webhook

Send a test event:

```bash
curl -X POST https://api.lendry.io/api/webhooks/{webhook_id}/test \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

## Webhook Events Reference

### Deal Events

#### `deals.created`
Triggered when a new deal is created.

**Payload:**
```json
{
  "id": "event-123",
  "timestamp": "2026-03-03T12:00:00Z",
  "event": "deals.created",
  "data": {
    "id": "deal-456",
    "name": "Commercial Property Loan",
    "status": "pending_review",
    "loanAmount": 500000,
    "borrowerId": "borrower-789",
    "createdAt": "2026-03-03T12:00:00Z"
  }
}
```

#### `deals.updated`
Triggered when a deal is modified.

**Payload:**
```json
{
  "event": "deals.updated",
  "data": {
    "id": "deal-456",
    "loanAmount": 550000,
    "changes": {
      "loanAmount": { "old": 500000, "new": 550000 },
      "status": { "old": "pending_review", "new": "approved" }
    }
  }
}
```

#### `deals.status_changed`
Triggered when deal status changes.

**Payload:**
```json
{
  "event": "deals.status_changed",
  "data": {
    "id": "deal-456",
    "previousStatus": "pending_review",
    "newStatus": "approved",
    "changedBy": "user-789",
    "changedAt": "2026-03-03T13:30:00Z"
  }
}
```

### Document Events

#### `documents.uploaded`
Triggered when a document is uploaded.

**Payload:**
```json
{
  "event": "documents.uploaded",
  "data": {
    "id": "doc-123",
    "dealId": "deal-456",
    "fileName": "loan-agreement.pdf",
    "fileSize": 1048576,
    "uploadedBy": "user-789",
    "uploadedAt": "2026-03-03T15:00:00Z"
  }
}
```

#### `documents.signed`
Triggered when a document is e-signed.

**Payload:**
```json
{
  "event": "documents.signed",
  "data": {
    "id": "doc-123",
    "dealId": "deal-456",
    "signedBy": "user-999",
    "signatureUrl": "https://...",
    "signedAt": "2026-03-03T16:00:00Z"
  }
}
```

### Borrower Events

#### `borrowers.created`, `borrowers.updated`
Triggered when borrower information changes.

### User/Audit Events

#### `audit.pii_accessed` (Critical)
Triggered when sensitive PII is accessed. Requires admin role to subscribe.

#### `audit.api_key_revoked` (Critical)
Triggered when an API key is revoked.

---

## Event Filtering

Subscribe to multiple events with wildcards:

```bash
curl -X POST https://api.lendry.io/api/webhooks \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "All Deal Events",
    "url": "https://yourdomain.com/webhooks",
    "events": ["deals.*"],  # Matches deals.created, deals.updated, etc.
    "rateLimitPerSecond": 10
  }'
```

---

## Delivery Guarantees

### Retry Logic

Failed deliveries are automatically retried with exponential backoff:

- **Retry 1:** 1 second delay
- **Retry 2:** 2 seconds delay
- **Retry 3:** 4 seconds delay
- **Retry 4:** 8 seconds delay
- **Retry 5:** 16 seconds delay

**Success criteria:** HTTP status code 2xx (200-299)

**Failure criteria:** Non-2xx status, timeout (10 seconds), network error

### Idempotency

Events may be delivered multiple times (at least once delivery). Make your webhooks idempotent:

```javascript
// Bad: Not idempotent
app.post('/webhooks/deals', (req, res) => {
  const deal = req.body.data;
  createDeal(deal); // Will duplicate on retry!
  res.json({ received: true });
});

// Good: Idempotent (using idempotency key)
app.post('/webhooks/deals', (req, res) => {
  const eventId = req.body.id; // Unique event ID

  // Check if we've already processed this event
  if (hasProcessedEvent(eventId)) {
    return res.json({ received: true });
  }

  const deal = req.body.data;
  createDeal(deal);
  markEventAsProcessed(eventId);

  res.json({ received: true });
});
```

### Ordering

Events are delivered in order within a webhook. However:
- Different webhooks may receive events out of order
- Different integrations may process events at different speeds

Don't assume strict ordering across systems.

---

## Security

### Signature Verification

All webhooks are signed with HMAC-SHA256. Always verify signatures:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(req) {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.rawBody; // Get raw request body (not parsed)

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Timestamp Verification

Verify the webhook timestamp to prevent replay attacks:

```javascript
function verifyTimestamp(req) {
  const timestamp = req.headers['x-timestamp'];
  const webhookTime = new Date(timestamp).getTime();
  const now = Date.now();

  // Accept webhooks within 5 minute window
  const maxAge = 5 * 60 * 1000;

  return Math.abs(now - webhookTime) <= maxAge;
}
```

### HTTPS Only

Webhooks must be delivered to HTTPS endpoints. HTTP endpoints are rejected.

### IP Whitelisting

Optionally, whitelist Lendry's IP addresses:
```
157.245.x.x (to be provided by Lendry team)
```

Contact support for the specific IP range.

---

## Best Practices

### 1. Respond Quickly

Return a 2xx status code as soon as possible, even if processing takes time:

```javascript
app.post('/webhooks/deals', (req, res) => {
  // Return immediately
  res.json({ received: true });

  // Process asynchronously
  processEventAsync(req.body);
});
```

### 2. Use a Queue

For heavy processing, use a message queue:

```javascript
const queue = require('bull');
const eventQueue = new queue('webhook-events');

app.post('/webhooks/deals', (req, res) => {
  eventQueue.add(req.body);
  res.json({ received: true });
});

eventQueue.process(async (job) => {
  await processEvent(job.data);
});
```

### 3. Log Everything

Log all webhook deliveries for debugging:

```javascript
app.post('/webhooks/deals', (req, res) => {
  const eventId = req.headers['x-event-id'];
  const timestamp = new Date();

  console.log({
    type: 'webhook_received',
    eventId,
    event: req.body.event,
    timestamp,
    ip: req.ip,
  });

  try {
    processEvent(req.body);
    res.json({ received: true });
  } catch (error) {
    console.error({
      type: 'webhook_processing_error',
      eventId,
      error: error.message,
    });
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

### 4. Monitor Delivery Status

Regularly check webhook delivery status:

```bash
curl -X GET https://api.lendry.io/api/webhooks/{webhook_id}/events \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```

---

## Testing Webhooks Locally

### Using ngrok

For local development, use ngrok to expose your local server:

```bash
# Install ngrok
brew install ngrok

# Start ngrok
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io

# Create webhook with ngrok URL
curl -X POST https://api.lendry.io/api/webhooks \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local Dev Webhook",
    "url": "https://abc123.ngrok.io/webhooks/deals",
    "events": ["deals.created"]
  }'
```

### Using Webhook.site

For quick testing without local setup:

1. Visit https://webhook.site
2. Copy your unique URL
3. Create webhook with that URL
4. View all deliveries in real-time on the website

---

## Troubleshooting

### "Invalid signature" Error

- Verify you're using the correct webhook ID as secret
- Ensure you're verifying the raw request body, not the parsed JSON
- Check timestamp is within 5 minute window

### "Request too old" Error

- Webhook receiver's clock may be skewed
- Increase acceptable time window temporarily
- Run `ntpdate` to sync system clock

### Webhooks Not Being Delivered

1. Check webhook is active: `GET /api/webhooks/{id}`
2. Check event is in subscription: verify `events` array includes the event type
3. View delivery history: `GET /api/webhooks/{id}/events`
4. Test endpoint: `POST /api/webhooks/{id}/test`

### Webhook Delivery Times Out

- Increase timeout handling on your end (Lendry waits 10 seconds max)
- Move slow processing to background job
- Check webhook URL is accessible from the internet

---

## Webhook Lifecycle

```
Event Triggered (in Lendry)
    ↓
Find subscribed webhooks
    ↓
Verify webhook is active
    ↓
Attempt delivery (max 5 retries)
    ↓
Log result to audit trail
    ↓
Retry failed deliveries periodically
    ↓
Notify user of persistent failures
```

---

## API Reference

### Create Webhook
```
POST /api/webhooks
```

### List Webhooks
```
GET /api/webhooks
```

### Get Webhook Details
```
GET /api/webhooks/{id}
```

### Update Webhook
```
PATCH /api/webhooks/{id}
```

### Delete Webhook
```
DELETE /api/webhooks/{id}
```

### Send Test Event
```
POST /api/webhooks/{id}/test
```

### View Delivery History
```
GET /api/webhooks/{id}/events?limit=50
```

### Retry Failed Deliveries
```
POST /api/webhooks/{id}/retry
```

### Get Available Events
```
GET /api/webhooks-events
```

---

## Support

For help with webhooks:
- **Email:** webhooks-support@lendry.io
- **Docs:** https://docs.lendry.io/webhooks
- **Status:** https://status.lendry.io

---

*Last Updated: March 2026*
*API Version: v1*
