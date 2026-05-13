ALTER TABLE "brands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shoe_releases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shoe_specs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shoe_spec_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review_authors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review_tag_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crawl_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crawl_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "raw_documents" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "brands" FROM anon, authenticated;
REVOKE ALL ON TABLE "shoes" FROM anon, authenticated;
REVOKE ALL ON TABLE "shoe_releases" FROM anon, authenticated;
REVOKE ALL ON TABLE "shoe_specs" FROM anon, authenticated;
REVOKE ALL ON TABLE "shoe_spec_variants" FROM anon, authenticated;
REVOKE ALL ON TABLE "review_sources" FROM anon, authenticated;
REVOKE ALL ON TABLE "review_authors" FROM anon, authenticated;
REVOKE ALL ON TABLE "reviews" FROM anon, authenticated;
REVOKE ALL ON TABLE "review_tags" FROM anon, authenticated;
REVOKE ALL ON TABLE "review_tag_assignments" FROM anon, authenticated;
REVOKE ALL ON TABLE "crawl_sources" FROM anon, authenticated;
REVOKE ALL ON TABLE "crawl_runs" FROM anon, authenticated;
REVOKE ALL ON TABLE "raw_documents" FROM anon, authenticated;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
