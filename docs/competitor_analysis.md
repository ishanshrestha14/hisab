# Hisab — Competitor & Gap Analysis

> Reference document for product decisions during development.  
> Last updated: April 2026

---

## 1. The Real Competition

Before looking at software, understand what Hisab is actually replacing:

**The current Nepali freelancer workflow:**
- Create invoice in Google Docs or a Word template
- Export/screenshot and send over WhatsApp or email
- Track payments in an Excel sheet or in their head
- Manually calculate NPR equivalent using Google currency converter
- Chase clients over WhatsApp for payment confirmation

This is the baseline. Hisab is not competing with FreshBooks — it is competing with Google Docs and mental arithmetic. That is both the opportunity and the message.

---

## 2. Competitor Profiles

### 2.1 FreshBooks
**Type:** Commercial SaaS  
**Pricing:** From $19/month (no meaningful free tier — 5 invoice limit on trial)  
**Self-host:** No  
**Open source:** No

**What it does well:**
- Polished UI, professional invoice templates
- Time tracking + project management built in
- Strong client portal with online payment acceptance
- Good mobile app

**Why it fails for Nepali freelancers:**
- $19/month is ~2,600 NPR — steep for someone earning 15–50k NPR/month
- No NPR currency support or local payment context
- No Payoneer/Wise integration or awareness
- Assumes you can receive Stripe or PayPal — neither works properly in Nepal
- Vendor lock-in, no data portability

**Positioning gap for Hisab:** Price + local context

---

### 2.2 Wave
**Type:** Commercial SaaS (free core, paid add-ons)  
**Pricing:** Free invoicing, paid payments processing  
**Self-host:** No  
**Open source:** No

**What it does well:**
- Genuinely free for invoicing and accounting basics
- Clean, easy to use interface
- Unlimited invoices and clients on free tier
- Expense tracking included

**Why it fails for Nepali freelancers:**
- No NPR support
- No client portal — clients just receive a PDF by email
- Payment processing (the paid feature) is US/Canada only — completely useless in Nepal
- Cloud-only — no self-host option for privacy-conscious users
- No Payoneer/Wise context

**Positioning gap for Hisab:** Client portal + Nepal payment context

---

### 2.3 Zoho Invoice
**Type:** Commercial SaaS  
**Pricing:** Free up to 1,000 invoices/year  
**Self-host:** No  
**Open source:** No

**What it does well:**
- Genuinely usable free tier
- Multi-currency support (NPR is technically available)
- Decent client portal
- Strong mobile app
- Part of Zoho ecosystem — integrates with Zoho CRM, Books, etc.

**Why it fails for Nepali freelancers:**
- NPR is listed but the tool doesn't understand the *context* — no Payoneer/Wise awareness, no NPR equivalent sidebar
- Client portal exists but is buried and not shareable as a clean public link
- Zoho ecosystem lock-in feels heavy for a solo freelancer
- Complex feature set with a learning curve
- Indian-market-focused support and documentation

**Positioning gap for Hisab:** Simplicity + shareable portal link + Nepal-first UX

---

### 2.4 Invoice Ninja
**Type:** Open source / Freemium  
**Pricing:** Free self-hosted, $8/month hosted  
**Self-host:** Yes  
**Open source:** Yes (source on GitHub)

**What it does well:**
- Comprehensive feature set: invoices, quotes, expenses, time tracking, recurring billing
- Proper self-host support with Docker
- Active community and regular updates
- Multi-currency and multi-language
- Client portal exists
- White-label support on paid plan

**Why it fails for Nepali freelancers:**
- Complex to set up — requires technical knowledge most freelancers don't have
- UI feels dated and dense — overwhelming for a first-time user
- Client portal works but is not designed to impress a foreign client
- Zero Nepal-specific context (NPR equivalent, Payoneer/Wise, local payment guidance)
- Self-host setup requires more than just `docker-compose up`

**This is Hisab's closest technical competitor.** The gap is: simplicity, design quality, and Nepal context.

**Positioning gap for Hisab:** Beautiful design + one-command self-host + local context

---

### 2.5 InvoicePlane
**Type:** Open source (completely free)  
**Pricing:** Free  
**Self-host:** Yes  
**Open source:** Yes

**What it does well:**
- Completely free, no paid tier
- Self-hostable, good for privacy
- Simple, no bloat — does invoicing and nothing else
- 12,000+ users across 150+ countries

**Why it fails for Nepali freelancers:**
- No client portal — clients get a PDF, nothing interactive
- UI looks like 2014 — sends the wrong signal to foreign clients
- No NPR support or local payment context
- Setup is more complex than it should be
- Essentially unmaintained — slow release cadence
- No mobile responsiveness to speak of

**Positioning gap for Hisab:** Modern design + client portal + active development

---

### 2.6 Akaunting
**Type:** Open source / Freemium  
**Pricing:** Free self-hosted, paid apps/extensions  
**Self-host:** Yes  
**Open source:** Yes (Laravel + Vue — similar stack to what you know)

**What it does well:**
- Full accounting suite, not just invoicing
- Beautiful modern UI
- Multi-currency, multi-company
- Strong plugin ecosystem

**Why it fails for Nepali freelancers:**
- Overkill for a solo freelancer — full accounting is intimidating
- Plugin model means the best features cost extra
- No Nepal-specific context
- Designed for small businesses, not individual freelancers
- No simple public client portal link

**Positioning gap for Hisab:** Focused scope (freelancer, not SME) + simplicity

---

### 2.7 Local Nepal tools (Swastik, FinPOS, etc.)
**Type:** Desktop/local accounting software  
**Pricing:** Paid, local licensing  
**Self-host:** N/A  
**Open source:** No

**What they do well:**
- VAT/TDS compliance for Nepal
- Nepali language support
- Built for local business regulations

**Why they fail for Nepali freelancers:**
- Built for brick-and-mortar businesses, not remote freelancers
- No concept of foreign currency invoicing
- No client portal — designed for in-person transactions
- No email delivery, no online presence
- Desktop-only, no mobile

**Positioning gap for Hisab:** Completely different category — these don't overlap meaningfully

---

## 3. Feature Comparison Matrix

| Feature | FreshBooks | Wave | Zoho Invoice | Invoice Ninja | InvoicePlane | **Hisab** |
|---|---|---|---|---|---|---|
| Free tier | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Self-hostable | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Open source | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| NPR currency | ❌ | ❌ | ⚠️ partial | ⚠️ partial | ❌ | ✅ |
| NPR equivalent display | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Public client portal | ✅ | ❌ | ⚠️ partial | ✅ | ❌ | ✅ |
| No-login portal link | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Payoneer/Wise context | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| One-command Docker | ❌ | ❌ | ❌ | ⚠️ complex | ⚠️ complex | ✅ |
| Modern UI | ✅ | ✅ | ✅ | ⚠️ dated | ❌ | ✅ |
| Mobile responsive | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Nepal-first context | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| PDF export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email reminders | ✅ | ✅ | ✅ | ✅ | ⚠️ basic | ✅ |
| Dark mode | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

---

## 4. Key Gaps Hisab Exploits

### Gap 1: Nobody understands the Nepal payout problem
Every competitor assumes you can receive Stripe or PayPal. Nepali freelancers can't. They use Payoneer or Wise, receive USD/GBP, and manually convert to NPR to understand their earnings. No tool surfaces this. Hisab should show the NPR equivalent on every invoice automatically using a live exchange rate, cached daily.

**Product implication:** Add an NPR sidebar/footer on every invoice view. Show "≈ NPR 67,500" next to the USD total. This single feature will make Hisab feel like it was built specifically for them — because it was.

---

### Gap 2: Open source tools have ugly, dated UIs
InvoicePlane and Invoice Ninja work but they look like 2014 enterprise software. A Nepali freelancer sending an invoice to a client at a UK startup is judged by what that client sees. If the invoice portal looks dated and clunky, it undermines the freelancer's credibility.

**Product implication:** Treat the `/portal/:token` page as the most important page in the entire app. The freelancer's dashboard can be functional-first. The client portal must be beautiful-first. This is the page that gets shared, screenshotted, and talked about.

---

### Gap 3: The direct client graduation moment
Most Nepali freelancers start on Upwork or Fiverr where the platform handles invoicing. As they grow — getting direct clients, building relationships — they suddenly need their own invoicing solution and have nothing. No tool targets this specific transition.

**Product implication:** The onboarding copy should speak directly to this: "Moved from Upwork to direct clients? Hisab handles the invoicing." This is the key acquisition moment.

---

### Gap 4: SaaS tools priced for western incomes
FreshBooks at $19/month is 2,600 NPR. For a freelancer earning 15k–50k NPR/month, that is a meaningful cost. Wave is free but lacks the portal. Zoho is free but complex.

**Product implication:** Hisab's hosted tier should be $5/month max (roughly 680 NPR). Self-host is always free. Price is a genuine competitive moat in this market, not just a nice-to-have.

---

### Gap 5: No tool has a simple public client portal link
This is the single most impactful missing feature across competitors. Wave has no portal at all. InvoicePlane has no portal. Invoice Ninja has one but it requires client login in many configurations. Zoho's portal is not a clean shareable link.

Hisab's `/portal/:token` — a beautiful, zero-login page the freelancer can share over WhatsApp or email — is a unique feature at this price point.

**Product implication:** Make the "Copy portal link" button prominent immediately after invoice creation. The share action should feel like the climax of the invoice creation flow.

---

### Gap 6: No competitor has a content/community angle
Every existing tool is a product first, community never. Hisab is being built in public, documented as short-form video, by a Nepali developer solving his own problem. That narrative is content-native. No competitor can replicate the authenticity of "I built this because I needed it."

**Product implication:** The README, landing page, and social content should all lead with the story, not the features. Features are table stakes. The story is the moat.

---

## 5. Positioning Statement

**For:** Nepali freelancers earning in USD/GBP/EUR through direct client relationships

**Who are frustrated by:** Cobbling together Google Docs, WhatsApp, and manual currency conversion to invoice foreign clients professionally

**Hisab is:** An open-source invoicing and client portal tool built specifically for the Nepal-to-world freelance workflow

**Unlike:** Generic SaaS invoicing tools (FreshBooks, Wave, Zoho) that assume western payment infrastructure, or open source tools (InvoicePlane, Invoice Ninja) that are powerful but complex and context-unaware

**Hisab:** Gives every Nepali freelancer a professional invoice, a beautiful client-facing portal link, and NPR equivalent clarity — for free, self-hostable in one command

---

## 6. Risks & Honest Assessment

### Risk 1: Small initial addressable market
Nepal's direct-client freelancer population is real but not enormous today. Mitigate by: making the product generic enough to work for any South Asian freelancer (India, Bangladesh, Sri Lanka) while keeping the Nepal story as the launch narrative.

### Risk 2: Invoice Ninja already exists and is good
Invoice Ninja is genuinely capable. Users who are technical and willing to invest setup time may prefer it. Hisab wins on: simplicity, design, Nepal context, and the portal UX. Do not try to out-feature Invoice Ninja — out-design and out-simplify it.

### Risk 3: PayPal arriving in Nepal could reduce friction
If PayPal fully launches in Nepal, some of the payment friction Hisab addresses decreases. However: invoicing workflow, client portals, status tracking, and professional presentation are all still needed regardless of how payment is received. PayPal is a payment rail. Hisab is the workflow around getting paid.

### Risk 4: Sustainability of open source
Open source without monetization leads to burnout. The hosted tier ($5/month) is important — even 30 users covers hosting costs and validates the product. Add the paid tier by month 3 post-launch, not later.

---

## 7. Competitive Intelligence Sources

- FreshBooks pricing: freshbooks.com/pricing
- Wave features: waveapps.com
- Zoho Invoice: zoho.com/invoice
- Invoice Ninja: invoiceninja.com + github.com/invoiceninja/invoiceninja
- InvoicePlane: invoiceplane.com + github.com/InvoicePlane/InvoicePlane
- Nepal freelancer payment landscape: gurkhatech.com/navigating-international-payments
- Nepal billing software overview: jisort.com/blog/billing-software-in-nepal