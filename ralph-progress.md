# Group Scholar Opportunity Radar Progress

## Iteration 1
- Bootstrapped the project directory and established the progress log.
- Defined the initial intent: scholarship opportunity intelligence aggregation.

## Iteration 2
- Built the Opportunity Radar scoring engine with weighted criteria and deadline urgency.
- Added sample opportunity data plus criteria configuration for focus alignment.
- Generated a markdown briefing report and JSON export for downstream tooling.

## Iteration 2
- Built the Opportunity Radar single-page app with filtering, scoring, and saved board views.
- Added intake form and local persistence for custom signals.
- Seeded initial opportunity dataset for search and prioritization.

## Iteration 3
- Rebuilt the Opportunity Radar client logic to match the current UI and data model.
- Added metrics, signals, pipeline health summaries, and save/export actions.
- Wired filtering, sorting, reset controls, and custom opportunity intake end-to-end.
- Redeployed the Opportunity Radar site to the production alias.
- Deployed to Vercel: https://groupscholar-opportunity-radar.vercel.app

## Iteration 4
- Added a briefing builder that generates a weekly summary from current filters.
- Enabled one-click copy to clipboard for sharing with leadership teams.
- Improved CSV export quoting and watchlist cleanup on deletes.

## Iteration 5
- Added calendar export for filtered opportunities with all-day deadline events.
- Included owner, focus, fit, funding, and link details in the calendar notes.
- Redeployed to Vercel: https://groupscholar-opportunity-radar.vercel.app

## Iteration 6
- Wired the Action Queue with deadline-ranked recommendations and owner-ready next steps.
- Added action summary chips to show overdue and near-term workload counts.
- Prioritized the queue using deadline urgency, fit, and funding signals.

## Iteration 7
- Added a Submission Readiness panel that turns filtered opportunities into prep tasks.
- Summarized readiness with task, owner, next-due, and overdue chips.
- Ranked the top readiness tasks with owner visibility and soonest-due timing.

## Iteration 8
- Added a Radar Score signal that blends fit, funding, and deadline urgency into one priority number.
- Exposed Radar Score in the opportunity cards and added a sort option for it.
- Styled the score chip to visually separate priority from categorical tags.

## Iteration 42
- Added Postgres-backed live sync with serverless API routes for opportunities and watchlist.
- Implemented client-side remote loading, status indicators, and fallback-to-local behavior.
- Created database schema + seed data and populated the production database.

## Iteration 8
- Added a live data status badge to the UI to clarify sync state.
- Updated the Postgres helper to support DATABASE_URL and SSL disable flags.
- Added a seed script wired to the schema/seed SQL and seeded production data.
- Attempted Vercel production deploy but hit daily deployment quota ("api-deployments-free-per-day").

## Iteration 9
- Added Deadline Horizon and Owner Load panels for at-a-glance workload distribution.
- Refined deadline buckets and owner workload rollups for the current filter set.
- Updated styling to support the new radar panels and empty states.

## Iteration 78
- Implemented the Deadline Horizon panel with deadline buckets and scaled bar chart.
- Added Owner Load insights by owner with totals, due-soon, overdue, avg fit, and next due timing.
- Styled the new horizon and owner workload components to match the side-panel cards.

## Iteration 79
- Added Coverage Mix panel to surface region and opportunity type distribution.
- Introduced coverage gap signal to flag thin areas in the filtered pipeline.
- Styled coverage bars to align with existing side-panel visuals.

## Iteration 80
- Added a Funding Mix panel with award bucket distribution, totals, and averages.
- Rendered funding summaries from filtered opportunities and highlighted unknown awards.
- Styled the new funding insight card to match the radar side-panel visuals.
- Attempted Vercel production deploy but hit deployment quota limit.

## Iteration 80
- Added a Data Hygiene panel with missing-field and overdue counts plus top cleanup targets.
- Included hygiene stats in the briefing output for quicker follow-up.
- Styled the hygiene summary and issue list to match the side-panel system.
