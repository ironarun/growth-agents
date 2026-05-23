# API Sources

This document lists planned external sources for the GTM research engine.

No external source should be called until the local workflow and Supabase tables are working with manual inputs.

## Serper

Purpose:

- Search discovery.
- Page-one SERP collection.
- Querying phrases around consultant AI risk, hallucination, overconfidence, and client deliverables.

Planned use:

- Store requests and responses in `raw_source_events`.
- Normalize useful results into `source_documents`.

## Exa

Purpose:

- Content retrieval.
- Semantic search.
- Finding essays, posts, and pages that match pain patterns rather than exact keywords.

Planned use:

- Discover high-quality sources for audience language and objections.
- Feed normalized source text into `source_documents`.

## Firecrawl

Purpose:

- Page extraction.
- Converting URLs into readable text.

Planned use:

- Extract pages found through Serper, Exa, or manual collection.
- Store raw payloads and extracted text for pain-point extraction.

## Keywords Everywhere

Purpose:

- Keyword volume.
- CPC.
- Competition.

Planned use:

- Validate whether phrases around AI hallucination, client risk, AI confidence, and consulting deliverables have search or paid intent.
- Use only as a research signal, not as the sole source of creative direction.

## Meta

Purpose:

- Paid ads execution and later performance retrieval.

Current boundary:

- Manual upload first.
- Meta API later.

Planned use:

- Eventually connect approved `ad_variants` to Meta creative and campaign records.
- Later pull performance data back into the warehouse.

## Supabase

Purpose:

- Warehouse.
- Durable GTM memory.
- Shared source of truth for agents.

Current use:

- Store workflow runs, raw source events, source documents, pain points, ad angles, ad variants, and human review items.

## Strapi

Purpose:

- Later publishing workflow.

Current boundary:

- Not needed for the consultant ads test.

Planned use:

- Possible future publishing layer for organic content, essays, or landing-page support material.
