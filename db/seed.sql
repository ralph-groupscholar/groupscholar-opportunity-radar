insert into opportunity_radar.opportunities
  (id, name, deadline, region, type, stage, owner, funding, fit, focus, link)
values
  ('gs-001', 'Aurora STEM Scholars', '2026-03-14', 'North America', 'STEM Scholarship', 'Drafting', 'Mila', 45000, 5, 'Women in engineering + mentorship requirement', 'https://example.org/aurora'),
  ('gs-002', 'Global Creative Futures', '2026-02-28', 'Global', 'Arts & Design', 'Ready', 'Kofi', 30000, 4, 'Portfolio-based review, requires community impact plan', 'https://example.org/creative'),
  ('gs-003', 'NextGen Public Service Fellowship', '2026-04-05', 'US', 'Public Service', 'Discovery', 'Shreya', 25000, 3, 'Policy internships, leadership narrative required', 'https://example.org/public'),
  ('gs-004', 'BrightPath Community College Fund', '2026-03-01', 'US', 'Access Scholarship', 'Drafting', 'Luis', 15000, 4, 'Community college transfer pipeline', 'https://example.org/brightpath'),
  ('gs-005', 'EcoFrontier Climate Innovators', '2026-05-12', 'Global', 'Climate & Sustainability', 'Watchlist', 'Ava', 60000, 5, 'Climate innovation, requires team project evidence', 'https://example.org/ecofrontier'),
  ('gs-006', 'Catalyst Health Leaders', '2026-02-21', 'US', 'Health', 'Ready', 'Maya', 20000, 4, 'Community health leadership program with site visits', 'https://example.org/catalyst'),
  ('gs-007', 'Blue Meridian Tech Equity', '2026-03-22', 'North America', 'Tech Equity', 'Drafting', 'Noah', 50000, 4, 'Tech access and equity, mentorship requirement', 'https://example.org/meridian'),
  ('gs-008', 'Lighthouse First-Gen Network', '2026-02-18', 'US', 'First-Gen', 'Ready', 'Zara', 18000, 5, 'First-gen support, requires cohort narrative', 'https://example.org/lighthouse'),
  ('gs-009', 'Equinox Global Scholars', '2026-06-10', 'Global', 'International Study', 'Discovery', 'Ravi', 75000, 3, 'Study abroad + service requirement', 'https://example.org/equinox'),
  ('gs-010', 'Momentum Rural Access', '2026-03-08', 'US', 'Rural Access', 'Drafting', 'Priya', 22000, 4, 'Rural student support with local partner approvals', 'https://example.org/momentum')
on conflict (id) do update set
  name = excluded.name,
  deadline = excluded.deadline,
  region = excluded.region,
  type = excluded.type,
  stage = excluded.stage,
  owner = excluded.owner,
  funding = excluded.funding,
  fit = excluded.fit,
  focus = excluded.focus,
  link = excluded.link;
