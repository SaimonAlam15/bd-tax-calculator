# Bangladesh Income Tax Calculator — Specification v1

Status: final, 29 Oct 2026. Rules follow NBR Income Tax Paripatra 2026–2027; remaining items to verify are in §4.8.

## 1. Purpose

A free, no-login website where a resident individual in Bangladesh enters their income, investments and tax already paid, and sees how much income tax they owe for the year, with a slab-by-slab explanation. Results download as an `.xlsx` file. All calculation happens in the browser; no financial data is sent anywhere.

Primary target: **income year 2025–26 (1 Jul 2025 – 30 Jun 2026), assessment year 2026–27**, return normally due 30 Nov 2026.

Year labels: people say "fiscal year 2025–26" for the income year, while NBR labels the return by tax year (করবর্ষ 2026–27). NBR's acknowledgement slips print "Assessment Year". The UI and the export always show both labels, e.g. "Income earned 1 Jul 2025 – 30 Jun 2026 (assessment year 2026–27)", so no one picks the wrong year.

## 2. Scope

### In scope (v1)
- Resident individual taxpayers only.
- One tax year (above). Tax rules live in a versioned config file so more years can be added without code changes.
- Taxpayer categories that change the tax-free threshold: general; woman; aged 65+; person with disability; third-gender; gazetted war-wounded freedom fighter / wounded July fighter; plus the extra allowance for a parent/guardian of a person with a disability.
- Income heads:
  - **Salary**: itemised components (basic, house rent, medical, conveyance, festival bonus, other allowances, employer PF contribution, etc.), with a "simple mode" toggle for gross salary only. Exemption of 1/3 of salary capped at a fixed amount.
  - **Rental income** from house property, with allowable deductions (repairs allowance, municipal tax, mortgage interest, etc.).
  - **Business / profession**: one net-profit figure.
  - **Interest / savings income**: FDR, bank savings, savings certificates (Sanchaypatra), each with the tax deducted at source (TDS).
  - **Dividends**, with TDS.
  - **Income from abroad / remittances**: captured as its own section. Amounts brought in through legal banking channels are exempt (§4.8); they appear in the inputs and the export but are excluded from taxable income, with an explanatory note. Income kept abroad is not covered.
- **Investment tax rebate**: itemised eligible investments (DPS, Sanchaypatra purchases, life insurance premium, PF contributions, listed shares, approved donations, etc.) with per-item caps, then the overall rebate formula.
- **Tax already paid**: TDS by source, advance tax paid, giving a final **payable / refundable** figure.
- **Minimum tax** rule.
- **Filing-time incentive or extra tax**, based on the planned filing date (§4.7).
- **Wealth surcharge** as an optional, collapsed section (user enters net wealth).

### Out of scope (v1)
Non-residents, firms, companies; capital gains; agricultural income; car/environmental surcharge; wealth statement (IT-10B; assets helper planned for v2, §10) and living-expense statement; filing the return itself; turnover tax; late-payment interest and penalties beyond §4.7.

## 3. User experience

- **Bilingual**: Bangla and English with a toggle in the header; option to show numbers in Bangla numerals. Language preference remembered in `localStorage`. The Bangla version also has its own address, `/bn/`, so search engines index it: the build writes `bn/index.html` with Bangla title, description and link-preview tags, both pages carry `hreflang` links to each other, and the sitemap lists both. Opening `/bn/` always shows Bangla; switching language updates the address without a page load.
- **Mobile first**. Must work well at 360px width.
- **Single page**: collapsible input sections (Profile → Salary → Rent → Business → Interest & dividends → Income from abroad → Investments → Tax paid → Wealth), with a results panel that updates live. On mobile the panel becomes a sticky bottom bar showing "Tax payable" that expands into the full breakdown.
- **Results show**: gross income by head, exemptions, taxable income, tax by slab (each slab's range, rate, amount), gross tax, rebate (showing which of the three limits applied), minimum-tax check, surcharge, tax paid, **net payable/refundable**.
- Every number field shows a short help text explaining what to enter.
- **Disclaimer** visible near the results: estimate only, not tax advice; link to the NBR e-return site (etaxnbr.gov.bd).
- Footer states the rule-set version and the date it was last checked.

### 3.1 Online filing help (v1)
The site never submits returns or asks for e-return credentials (NBR has no public filing API, and nothing leaves the browser). These features cut the work of filing yourself:

1. **E-return link**: a prominent "File online at etaxnbr.gov.bd" button in the header and in the results.
2. **E-return copy view**: a results layout that follows the order of the e-return screens, with a one-tap copy button beside each figure (plain digits, no commas, so it pastes cleanly). Mapped from screenshots of the assessment year 2026–27 portal (4 Nov 2026): Assessment, IT10B Requirements, Tax Exempted Income (Foreign Remittance), Expenditure (IT10BB), Assets & Liabilities (IT10B) and Tax & Payment. The salary, rent, business and financial-asset screens are not mapped yet, so those figures are listed by head. Where the portal adds the late-filing extra tax has not been seen yet.
3. **Personal document checklist**, built from the user's inputs. Each item says what the document is and where to get it, for example:
   - salary → salary certificate showing TDS (from employer)
   - bank or FDR interest → TDS certificate from each bank
   - Sanchaypatra → profit and TDS certificate
   - DPS, life insurance, shares, PF → investment proofs
   - remittances from abroad → encashment certificate or bank statement showing the inward remittance (proof for the Sixth Schedule Part 1 para 17 exemption)
   - always: e-TIN certificate and NID
   
   The checklist can be ticked off. Ticks are kept in the same 3-hour cache.
4. **"Do you have to file online?" check**, based on Profile answers. Paper filing is allowed for people aged 65+, people with disabilities (with a certificate), Bangladeshis living abroad, people filing for a deceased taxpayer, and foreign nationals working in Bangladesh. Anyone else needs prior approval from their Additional or Joint Commissioner. Everyone else sees "You need to file online".
5. **Registration guide**: a short step-by-step for signing up on the e-return portal, plus common problems (e.g. the mobile number must be registered to the user's own NID). It links to the NBR call centre (09643717171).
6. **Deadline and filing-window banner**: days left until the 30 Nov deadline, and whether filing today earns the early rebate, has no effect, or adds extra tax (§4.7), with the amount.
7. **Payment guidance**: the amount payable, a reminder that the return is only complete once paid and submitted, and how the portal's Pay Now and Proceed to online return buttons work. The payment methods behind Pay Now are not listed until they are confirmed from the portal.
8. **After filing**: a reminder to download the acknowledgement slip and the `.xlsx` export, and to keep both for next year.

All guide text is bilingual and kept in a content file, so the wording can be updated without code changes. Each guide shows the date it was last checked.

## 4. Tax rules (config: `rules/2025-26.json`)

The engine reads these values from config; nothing is hard-coded.

**Governing source: NBR Income Tax Paripatra 2026–2027** (dated 2 Sep 2026; nbr.gov.bd/uploads/paripatra/Aykor_Poripothro_2026-2027_BG_Press_Modify_Copy.pdf), which explains the Finance Act 2026. Its rates apply from **tax year (করবর্ষ) 2026–27**, i.e. the return for income year 2025–26 that people are filing now. Its worked example 29 (tax year 2026–27: income ৳9,00,000, tax ৳60,000) only works with the ৳4 lakh threshold. This **supersedes** the Finance Ordinance 2025 figures in the 2025–2026 Paripatra for this year.

### 4.1 Tax-free threshold (BDT), Paripatra 2026–27 §1.1
| Category | Threshold |
|---|---|
| General | 400,000 |
| Woman / 65+ | 450,000 |
| Person with disability | 525,000 |
| Third-gender | 525,000 |
| Gazetted war-wounded freedom fighter / July fighter | 550,000 |
| Parent/guardian of person with disability | +50,000 per child (only one parent claims it) |

### 4.2 Slabs (after threshold)
Next 300,000 @ 10% · next 400,000 @ 15% · next 500,000 @ 20% · next 2,000,000 @ 25% · remainder @ 30%. Not applicable to income from tobacco manufacturing (out of scope).

### 4.3 Minimum tax
BDT 5,000 if income exceeds the threshold; BDT 1,000 for a first-time taxpayer (ask in Profile). Payable even when tax after the rebate is lower, zero or negative.

### 4.4 Salary exemption
Lower of 1/3 of salary income and **BDT 500,000**. The 2026–27 Paripatra (§11) changes only what counts as salary (group-insurance premiums and reimbursed medical costs are excluded). It does not change this cap.

### 4.5 Investment rebate, Paripatra 2026–27 §32 (s.78)
Lowest of: 3% of total income (excluding exempt income, reduced-rate income, firm/AOP share income and final-tax income) · **10%** of eligible investment · **BDT 750,000**. Applies from tax year 2026–27.

### 4.6 Sanchaypatra and other tax deducted at source, Paripatra 2026–27 §61 (s.163 replaced)
From tax year 2026–27, tax deducted or collected under Part 7, **including Sanchaypatra profit TDS under s.105**, is **advance tax**. It is no longer final tax. Any amount above the assessed tax is **refundable**, or the taxpayer can carry it forward to a later year. This replaces the 2025–26 rule (s.163(11)) under which Sanchaypatra TDS was final. Only tax under s.138/139 (commercial vehicles and vessels, out of scope) stays final, along with the TDS of people exempt from filing a return.
- Sanchaypatra profit is added to total income and taxed at slab rates like bank or FDR interest. Its TDS (10%) is credited against the bill and can produce a refund.
- Because it's no longer final-tax income, it stays **inside** the 3% rebate base.
- Inputs: certificate profit received and TDS deducted (default 10%, editable). New Sanchaypatra purchases go in the investment section.
- Turnover tax (new in s.163) affects business income only when gross receipts exceed ৳2 crore. v1 shows a notice for business users and doesn't calculate it.

### 4.7 Filing-time incentive or extra tax, Paripatra 2026–27 §67.1 (s.170)
Applies from tax year 2026–27, based on the tax payable with the return (s.173):
| Return filed | Effect |
|---|---|
| 1 Jul – 30 Sep | Rebate of 5% of payable tax, max ৳25,000 |
| 1 Oct – 31 Dec | None |
| 1 Jan – 31 Mar | Extra 2% of payable tax, min ৳3,000 |
| 1 Apr – 30 Jun | Extra 5% of payable tax, min ৳5,000 |

Profile asks for the planned filing date (default: today). Filing in Oct–Dec 2026 means no adjustment.

### 4.8 Rule decisions (checked 1 Nov 2026)
No professional has signed off. Each rule was checked against the Authentic English Text of the Income Tax Act 2023 (SRO 404-Law/2025, which predates the Finance Act 2026) and Paripatra 2026–27. Where the text is unclear, the owner made the call below; revisit if better information turns up.
1. **Income from abroad.** Remittances brought in through legal channels are exempt with no ceiling (Sixth Schedule Part 1 para 17; Bangladeshi citizens). Income kept abroad is left out of the calculation entirely (owner's decision); the form only asks for remittances.
2. ~~Wealth surcharge slabs.~~ Resolved from Paripatra 2026–27 §1.6. The rate applies to tax payable: nil up to ৳4 crore (but 10% for more than one car or house property over 8,000 sq ft), 10% for ৳4–10 crore, 20% for ৳10–20 crore, 30% for ৳20–50 crore, 35% above ৳50 crore. No minimum surcharge is stated.
3. **Late-filing extra tax with nothing left to pay.** Paripatra §67.1 says "2% (or 5%) of the s.173 amount, or ৳3,000 (or ৳5,000), whichever is higher". Read literally (owner's decision): the minimum applies even when the s.173 amount is zero. No adjustment is shown on an empty form.
4. **Rent repairs allowance.** s.38(1)(e): 30% commercial, 25% other, of the rental value. Best guess: it is not applied to the 10% deposit special rent, and advance rent adjusted against future rent is not a security deposit. The s.37 formula and the deposit rule are from Paripatra §14–15.
5. **Investment limits** (Sixth Schedule Part 3 para 2, yearly totals per kind): DPS ৳1,20,000; life insurance premium 10% of sum assured; government securities including Sanchaypatra ৳5,00,000; mutual fund / unit certificates ৳5,00,000; listed shares, provident fund and approved donations uncapped. Paripatra §127 removes the mutual fund cap only from 1 Jul 2026.
6. Any dividend exemption for individuals: none (Sixth Schedule Part 1 has none; Paripatra §127 adds none).

A qualified person should still review the config when one is available. Paripatra 2026–27 examples 23, 24, 27, 29 and 30 are unit tests in `src/engine/calculate.test.ts`.

## 5. Export (.xlsx only)

A single "Download results (.xlsx)" button. Values only, no live formulas. File name: `bd-tax-AY2026-27-<yyyymmdd>.xlsx`. Language follows the current UI language.

| Sheet | Contents |
|---|---|
| Summary | Tax year, category, taxable income, gross tax, rebate, surcharge, filing-time adjustment, tax paid, net payable/refundable, rule-set version, generated date, disclaimer |
| Income | Every input, grouped by head, with exempt/taxable split (income from abroad included and marked exempt) |
| Tax calculation | Slab-by-slab table, rebate working (all three limits, which one applied), minimum-tax check, surcharge working |
| Investments & tax paid | Each investment item with its eligible amount, each TDS/advance-tax entry |
| Inputs (hidden) | Every raw input with a schema version, so v2 can prefill the form from this file (§10) |
| Return form lines | Our figures mapped to the numbered lines of NBR return form IT-11GA (2023): lines 1–11 income by head, 12–19 tax computation, 20–25 tax paid and excess payment, 26 tax-exempt income. NBR's e-return asks for the same items, so users can copy the figures across. |

The results panel uses the same IT-11GA line names and order where possible, e.g. "Income from Financial Assets" for interest, dividends and Sanchaypatra profit. Line 10, "Taxable Income from Abroad", is a separate input from exempt remittances, which go to line 26.

Formatting: bold headers, BDT number format with thousands separators, frozen header rows, sensible column widths.

## 6. Data and privacy

- No backend, no accounts. Inputs never leave the browser.
- Inputs are cached in `localStorage` with a timestamp and **expire after 3 hours**. Expired data is deleted on load. All reads and writes are wrapped in try/catch, so the site works without storage.
- A visible "Clear my data" button wipes the cache immediately.
- Analytics record page views only and never record form contents (see §7).
- Ads (§7) use Google cookies, so the page says so next to the privacy note and links to `privacy.html`, a static English and Bangla privacy policy. Visitors from the EEA, UK and Switzerland get Google's consent message, switched on in AdSense under Privacy & messaging; there is no consent code in the site.

## 7. Analytics

**GoatCounter** (cookie-free, no personal data, so no consent banner is needed). Track page views plus two custom events with no payload: `calculate-viewed` and `xlsx-downloaded`. GoatCounter is free only for non-commercial use, so once the site shows ads it needs a paid plan, or it is replaced by **Cloudflare Web Analytics** (free, cookie-free, page views only, no custom events). Each is on only when its code is set in the deploy variables.

**Ads**: Google AdSense, added from November 2026. The build adds the AdSense script and `ads.txt` only when `ADSENSE_CLIENT` is set; each ad unit also needs its slot ID. There are two manual units, no Auto ads:
- below the calculator, before the filing guide;
- below the filing guide, before the footer.

No ads inside the form, the results panel, the mobile results sheet or near the copy buttons, where accidental clicks would break AdSense policy. Each unit reserves 250px of height so the page doesn't shift when it fills.

## 8. Technical

- **Stack**: Vite + React + TypeScript, Tailwind CSS, ExcelJS (loaded lazily on first download), i18n via a small JSON dictionary per language.
- **Tax engine**: pure TypeScript functions, `calculate(inputs, rules) → result`, with no UI dependencies. All money is kept in whole taka (integers); rounding rules come from the config.
- **Tests**: Vitest unit tests for the engine, including worked examples from the NBR guide (once sourced) and edge cases: exactly at a threshold, minimum tax kicking in, rebate cap binding, zero income, refund case.
- **Hosting**: GitHub Pages, deployed by a GitHub Actions workflow on push to `main`. Vite `base` set to the repo path; switching to a custom domain later only needs a `CNAME` file and a base change.
- **Quality bar**: Lighthouse ≥ 90 on mobile for performance and accessibility; full keyboard navigation; labelled inputs.

## 9. Milestones
1. Project setup, rules config, tax engine + tests.
2. Input form and live results (English).
3. Bangla translation and numerals.
4. XLSX export.
5. Online filing help (§3.1).
6. Caching, analytics, GitHub Pages deploy.
7. Rule verification sign-off (§4.8), then public launch.

## 10. Planned for v2
1. **Prefill from last year's file**: the user picks last year's `.xlsx` export, which is read in the browser (never uploaded), and its inputs fill the form, with figures marked "from last year — please update". The export therefore includes a hidden, versioned "inputs" sheet from v1 onwards, so that v1 files can be imported later.
2. **Assets and liabilities helper**: a guided statement of assets and liabilities (as asked for in the e-return), exported in the same `.xlsx` file. This was out of scope in v1.
3. **Exact e-return field mapping**: most screens are mapped (§3.1 item 2). Still needed: screenshots of the salary, rent, business and financial-asset screens and the payment page (personal details hidden), so the copy view can follow their field names and order exactly.
