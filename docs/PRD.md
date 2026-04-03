Absolutely — here are your refined, production-ready documents with the AI-first experience preserved and cost controls built into the architecture from day one.
I’ve tightened these to reflect:
AI as the core product (not compromised)


low-cost infrastructure strategy


controlled ingestion + caching model


realistic MVP execution



📄 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)
Product Name (Working)
30A Insider
An AI-powered local guide that helps you discover the best of 30A through conversation.

🎯 Objective
Build a hyperlocal discovery platform where users can:
ask natural language questions about 30A


receive curated, high-quality recommendations


explore and share local businesses


The product differentiates through:
conversational AI as the primary interface


curated recommendations instead of long lists


shareable outputs that drive organic growth



🧠 Core Product Concept
This is not a directory.
This is:
👉 An AI local influencer powered by structured data
Users interact through:
questions


intent


context


And receive:
3–5 curated recommendations


reasoning (“why this fits”)


actions (save, share, view)



👤 Target Users
Primary
Tourists visiting 30A


Families planning trips


Couples/groups looking for curated experiences


Secondary
Local residents


Business owners (later monetization)



💡 Core Features (MVP)
1. Conversational Search (Primary Experience)
Natural language input


AI parses intent:


category


location


constraints (dietary, vibe, etc.)


Returns curated recommendations



2. AI Recommendation Output
Each response includes:
3–5 businesses


short explanation per business


tags (GF, kid-friendly, etc.)


actions:


save


share


open map



3. Business Listings
Structured pages for each business


Data includes:


name, location


category


AI summary


tags


external links



4. Save System
Users can save businesses


Simple saved list (MVP)



5. Shareable Results (Growth Engine)
Each query generates:


shareable URL


Future:


social preview cards



6. Admin Panel
Trigger ingestion jobs


Review/merge duplicates


Edit businesses


Monitor coverage



7. Data Ingestion System
Category-driven ingestion


Slow, scheduled discovery


AI enrichment pipeline



🤖 AI Scope (Critical Design Principle)
AI is used for:
conversational interface


recommendation selection


explanation generation


tagging + summaries (precomputed)


AI is NOT:
the primary data source


used for every backend operation


repeatedly recomputing static data



⚡ AI Cost Strategy (Product-Level Requirement)
To preserve AI quality without excessive cost:
1. Precompute where possible
tags


summaries


“best for” use cases


2. Cache query responses
normalize queries


reuse results


3. Limit runtime AI scope
only send top 10–15 candidates


not full dataset


4. Pre-generate popular queries
“best brunch 30A”


“kid-friendly restaurants”



📈 Success Metrics
Early
% of queries returning useful results


share rate per query


saved businesses per session


Mid
repeat usage


query → engagement rate


Long-term
business claims


sponsorship revenue


organic traffic growth



🚀 Phases
Phase 1 (MVP)
conversational search


ingestion pipeline


business listings


save + share


admin tools


Phase 2
AI ranking improvements


collections


business claims


Phase 3
sponsorships


personalization


expansion to new markets



⚙️ 2. TECHNICAL FEASIBILITY
✅ Overall Feasibility: HIGH
This system is very achievable with:
modern APIs


serverless infrastructure


controlled AI usage



🔑 Key Technical Risks & Mitigation
1. AI cost scaling
Risk: excessive API usage
Mitigation:
caching layer


precomputed queries


limited candidate sets



2. Data quality
Risk: duplicates, inconsistent records
Mitigation:
canonical business model


place_id usage


admin review queue



3. Google Places usage limits
Risk: exceeding free tier
Mitigation:
slow cron ingestion


IDs-first discovery


long refresh cadences



4. AI accuracy / hallucination
Risk: incorrect recommendations
Mitigation:
AI only selects from DB


no open-ended generation


structured prompts



💸 Cost Feasibility
Expected MVP Cost Profile
Likely FREE:
hosting (Vercel Hobby)


database (Supabase Free)


cron jobs (Cloudflare/Vercel)


Low cost:
Google Places (if controlled)


OpenAI (primary variable cost)



🧠 AI Cost Control Summary
Strategy
Impact
Query caching
major reduction
Precomputed summaries
major reduction
Limit candidates
major reduction
Pre-generated queries
medium reduction


⏱ Timeline
Weeks 1–2
DB schema


ingestion pipeline


base UI


Weeks 3–4
conversational search


AI integration


admin tools


Weeks 5–6
caching


share features


polish



🏗 3. TECHNICAL DESIGN
🧱 Architecture Overview
Frontend
Next.js (Vercel)


Backend
Supabase (Postgres + Auth)


AI Layer
OpenAI API


Jobs
Vercel Cron or Cloudflare Workers


Data Sources
Google Places API



🗃 Database Schema
businesses
id


place_id


name


address


lat


lng


town


category


created_at


discovered_at


last_refreshed_at


next_refresh_at


refresh_cadence_days


confidence_score



business_tags
business_id


tag



business_ai_data
business_id


summary


vibe


best_for



search_jobs
id


category


town


last_run_at


next_run_at


cadence_days



saved_businesses
user_id


business_id



query_cache
normalized_query


response_json


created_at


expires_at



🔄 Data Pipeline
Discovery Flow
cron selects 1–2 search_jobs


query Google Places


collect place_ids


compare with DB


insert new businesses


queue enrichment



Enrichment Flow
fetch business details


run AI:


tags


summary


use cases


store results



Refresh Flow
select businesses where:


next_refresh_at < now


refresh details


update timestamps



🤖 Conversational Query Flow
Step 1: Input
User query:
“best gluten free breakfast seaside”

Step 2: AI parsing
Extract:
category


filters


location



Step 3: DB query
filter businesses


return top 10–15



Step 4: AI synthesis
Generate:
top 3–5 picks


explanations



Step 5: Cache result
Store normalized query → response

⚡ AI Optimization Design
1. Query normalization
Convert:
“best coffee rosemary”


“good coffee rosemary beach”


→ same key

2. Cache system
TTL: 7–30 days


reuse responses



3. Pre-generated queries
stored responses


no runtime AI call



4. Candidate limit
max 15 businesses sent to AI



🔁 Cron Strategy
Nightly limits
2 discovery jobs


5–10 enrichment jobs


5 refresh jobs



Cadence
restaurants: 60 days


services: 120 days



🔐 Auth
Supabase Auth


magic link login



📲 Share System
each query generates unique URL


stored in query_cache



💳 Future (Monetization)
Stripe


sponsored placement


featured in AI responses



🧭 Final Recommendation
This product succeeds if:
👉 AI feels premium and human-like
👉 data is clean and structured
👉 costs are controlled through architecture, not feature cuts

The key principle
AI is the experience layer, not the data layer.

If you want next, I can:
write the actual AI prompts


design the homepage + interaction UX


or turn this into build tickets aligned to your Cursor/Claude workflow


This is a really strong, very buildable product.

