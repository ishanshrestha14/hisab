# Hisab API Reference

**Base URL:** `http://localhost:3001` (dev) · `https://api.yourdomain.com` (prod)

All protected routes require an active session cookie set by Better Auth on login. Include `credentials: "include"` on all fetch calls.

---

## Error format

All errors return a consistent JSON shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Invoice not found"
  }
}
```

| HTTP Status | Code |
|-------------|------|
| 400 | `BAD_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 429 | Too Many Requests (rate limit) |
| 500 | `INTERNAL_ERROR` |

---

## Auth

Handled by Better Auth at `/api/auth/*`.

> **Rate limit:** Sign-in is limited to 10 requests per 15 minutes per IP.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-up/email` | Register with email + password |
| POST | `/api/auth/sign-in/email` | Sign in, sets HTTP-only session cookie |
| POST | `/api/auth/sign-out` | Sign out, clears session cookie |
| GET | `/api/auth/session` | Get current session and user |
| GET | `/api/auth/sign-in/google` | Initiate Google OAuth |

---

## Clients

All routes require authentication. Ownership is always verified — you can only access your own clients.

### List clients

```
GET /api/clients?page=1&limit=20
```

| Query param | Default | Max |
|-------------|---------|-----|
| `page` | 1 | — |
| `limit` | 20 | 100 |

**Response**
```json
{
  "data": [
    {
      "id": "clx...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "company": "Acme Inc.",
      "country": "United States",
      "defaultCurrency": "USD",
      "createdAt": "2026-03-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Create client

```
POST /api/clients
```

**Body**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme Inc.",       // optional
  "country": "United States",   // optional
  "defaultCurrency": "USD"      // USD | GBP | EUR | NPR
}
```

**Response** `201 Created` — the created client object.

### Update client

```
PUT /api/clients/:id
```

Same body as create (all fields optional). Returns `404` if client not found or not owned by user.

### Delete client

```
DELETE /api/clients/:id
```

Returns `{ "success": true }`. Returns `404` if not owned by user.

---

## Invoices

All routes require authentication.

### List invoices

```
GET /api/invoices?page=1&limit=20
```

Same pagination as clients. Returns invoices with `client.name` and `lineItems` included.

**Response**
```json
{
  "data": [
    {
      "id": "clx...",
      "number": "INV-001",
      "status": "SENT",
      "currency": "USD",
      "dueDate": "2026-04-30T00:00:00.000Z",
      "client": { "name": "Jane Doe" },
      "lineItems": [{ "description": "...", "quantity": 1, "unitPrice": 2000, "total": 2000 }]
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```

### Get invoice

```
GET /api/invoices/:id
```

Returns the full invoice with client details, line items, computed `total`, and `nprRate`/`nprTotal` if currency is not NPR.

### Create invoice

```
POST /api/invoices
```

> **Idempotency:** Include an `Idempotency-Key: <uuid>` header to safely retry without creating duplicates. Responses are cached for 24 hours per (key, user).

**Headers (optional)**
```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

**Body**
```json
{
  "clientId": "clx...",
  "currency": "USD",
  "issueDate": "2026-03-30T00:00:00.000Z",
  "dueDate": "2026-04-30T00:00:00.000Z",
  "notes": "Payment via bank transfer",
  "lineItems": [
    {
      "description": "Web development — March",
      "quantity": 1,
      "unitPrice": 2000
    }
  ]
}
```

- Invoice number is auto-generated (`INV-001`, `INV-002`…) using `MAX` to avoid race conditions
- Portal token is auto-generated — never expose the internal `id`
- Line item `total` is computed as `quantity × unitPrice`

**Response** `201 Created`

### Update invoice

```
PUT /api/invoices/:id
```

Same body as create minus `clientId`. Replaces all line items if `lineItems` is provided.

### Update invoice status

```
PATCH /api/invoices/:id/status
```

**Body**
```json
{ "status": "PAID" }
```

Valid values: `DRAFT` · `SENT` · `PAID` · `OVERDUE`

### Send invoice

```
POST /api/invoices/:id/send
```

Sets status to `SENT` and emails the client with the portal link. Email is fire-and-forget — the status update always succeeds even if email fails. Returns `400` if invoice status is `PAID`.

**Response**
```json
{ "status": "SENT" }
```

### Delete invoice

```
DELETE /api/invoices/:id
```

---

## Dashboard

### Stats

```
GET /api/dashboard/stats
```

Aggregated via SQL — does not load all invoices into memory.

**Response**
```json
{
  "totalInvoiced": 5000.00,
  "totalPaid": 3000.00,
  "totalOutstanding": 1500.00,
  "overdueCount": 1,
  "totalPaidNPR": 405000.00,
  "nprRates": { "USD": 135, "GBP": 170, "EUR": 145 },
  "recentInvoices": [...]
}
```

---

## Exchange Rates

### Latest NPR rates

```
GET /api/exchange-rates/latest
```

Returns today's NPR rates for USD, GBP, EUR. Fetched from open.er-api.com and cached in the database for the day.

**Response**
```json
{
  "USD": 135.42,
  "GBP": 171.18,
  "EUR": 146.05
}
```

---

## Public Portal

No authentication required. These endpoints are rate-limited per IP.

> **Rate limits:** `GET` — 30 req/15min · `POST mark-paid` — 5 req/hr

### View invoice

```
GET /api/portal/:token
```

Returns invoice details safe for public display. Never exposes the internal `id` — only `token` is used.

**Response**
```json
{
  "number": "INV-001",
  "status": "SENT",
  "currency": "USD",
  "issueDate": "...",
  "dueDate": "...",
  "notes": "...",
  "total": 2000.00,
  "nprRate": 135.42,
  "nprTotal": 270840.00,
  "client": { "name": "Jane Doe", "email": "jane@example.com", "company": "Acme", "country": "US" },
  "freelancer": { "name": "Ram Sharma", "email": "ram@example.com" },
  "lineItems": [...]
}
```

### Mark as paid

```
POST /api/portal/:token/mark-paid
```

Sets invoice status to `PAID` and emails the freelancer a paid notification. Returns `400` if invoice is not in `SENT` status.

**Response**
```json
{ "status": "PAID" }
```

---

## Health

```
GET /health
```

Verifies database connectivity.

**Response (healthy)**
```json
{ "status": "ok", "db": "ok" }
```

**Response (degraded)** `503`
```json
{ "status": "degraded", "db": "unreachable" }
```
