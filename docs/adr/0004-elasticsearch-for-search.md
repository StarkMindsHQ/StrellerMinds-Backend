# ADR 0004: Elasticsearch for Search

## Status
Accepted

## Context
As the project grows, PostgreSQL's `LIKE` operator and basic indexing will become insufficient for real-time, complex search queries across large datasets (e.g., searching millions of course titles and descriptions with fuzzy matching, facets, and ranking).

## Decision
We chose **Elasticsearch** as a dedicated search engine for performance-critical search operations, implemented in the `SearchModule`.

### Strategy
- Data is primarily stored in PostgreSQL.
- The `SearchService` handles indexing data into Elasticsearch when entities are created or updated.
- Search queries are routed through the `SearchService` to Elasticsearch.

## Consequences
- **Positive**:
  - Blazing fast search performance.
  - Advanced search features (fuzzy match, synonym handling, ranking, highlights).
  - Offloaded search traffic from the primary PostgreSQL database.
- **Negative**:
  - Increased architectural complexity (another system to maintain).
  - Data eventually consistent between Postgres and Elasticsearch.
  - Requires more RAM in staging/production environments.
