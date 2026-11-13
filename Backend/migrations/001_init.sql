-- Genesis GRH — schéma PostgreSQL initial
-- Chaque donnée métier appartient à un utilisateur (owner_id) : isolation stricte des comptes.

CREATE TABLE users (
  id               SERIAL PRIMARY KEY,
  email            TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  full_name        TEXT NOT NULL DEFAULT '',
  avatar_path      TEXT,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  failed_logins    INTEGER NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  token_version    INTEGER NOT NULL DEFAULT 0,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_len CHECK (char_length(email) BETWEEN 3 AND 254),
  CONSTRAINT users_name_len CHECK (char_length(full_name) <= 120)
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));

CREATE TABLE user_settings (
  user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_target   INTEGER NOT NULL DEFAULT 50 CHECK (monthly_target BETWEEN 1 AND 100000),
  default_threshold INTEGER NOT NULL DEFAULT 60 CHECK (default_threshold BETWEEN 0 AND 100),
  retention_months INTEGER NOT NULL DEFAULT 24 CHECK (retention_months BETWEEN 1 AND 120)
);

CREATE TABLE offers (
  id                   SERIAL PRIMARY KEY,
  owner_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description          TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 20000),
  required_skills      JSONB NOT NULL DEFAULT '[]'::jsonb,
  nice_skills          JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages            JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_experience_years NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (min_experience_years BETWEEN 0 AND 60),
  min_education_level  INTEGER NOT NULL DEFAULT 0 CHECK (min_education_level BETWEEN 0 AND 8),
  location             TEXT NOT NULL DEFAULT '' CHECK (char_length(location) <= 200),
  contract_type        TEXT NOT NULL DEFAULT '' CHECK (char_length(contract_type) <= 50),
  threshold            INTEGER NOT NULL DEFAULT 60 CHECK (threshold BETWEEN 0 AND 100),
  deadline             DATE,
  status               TEXT NOT NULL DEFAULT 'ouverte'
                       CHECK (status IN ('brouillon','ouverte','pourvue','annulee')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX offers_owner_created_idx ON offers (owner_id, created_at DESC);
CREATE INDEX offers_owner_status_idx ON offers (owner_id, status);

CREATE TABLE criteria_templates (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  criteria    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, name)
);

CREATE TABLE analysis_runs (
  id             SERIAL PRIMARY KEY,
  owner_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id       INTEGER REFERENCES offers(id) ON DELETE SET NULL,
  criteria       JSONB NOT NULL DEFAULT '{}'::jsonb,
  engine         TEXT NOT NULL DEFAULT '',
  file_count     INTEGER NOT NULL DEFAULT 0,
  retained_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  error_count    INTEGER NOT NULL DEFAULT 0,
  duration_ms    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analysis_runs_owner_created_idx ON analysis_runs (owner_id, created_at DESC);

CREATE TABLE candidates (
  id                SERIAL PRIMARY KEY,
  owner_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id            INTEGER REFERENCES analysis_runs(id) ON DELETE SET NULL,
  offer_id          INTEGER REFERENCES offers(id) ON DELETE SET NULL,
  full_name         TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  location          TEXT NOT NULL DEFAULT '',
  headline          TEXT NOT NULL DEFAULT '',
  links             JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills            JSONB NOT NULL DEFAULT '[]'::jsonb,
  organizations     JSONB NOT NULL DEFAULT '[]'::jsonb,
  education         JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages         JSONB NOT NULL DEFAULT '[]'::jsonb,
  education_level   INTEGER NOT NULL DEFAULT 0,
  experience_years  NUMERIC(4,1) NOT NULL DEFAULT 0,
  score             INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  score_breakdown   JSONB NOT NULL DEFAULT '{}'::jsonb,
  retained          BOOLEAN NOT NULL DEFAULT FALSE,
  improvement_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings          JSONB NOT NULL DEFAULT '[]'::jsonb,
  recruiter_notes   TEXT NOT NULL DEFAULT '' CHECK (char_length(recruiter_notes) <= 20000),
  status            TEXT NOT NULL DEFAULT 'Nouveau'
                    CHECK (status IN ('Nouveau','Présélectionné','Entretien','Proposition','Embauché','Refusé')),
  filename          TEXT NOT NULL DEFAULT '',
  file_mime         TEXT NOT NULL DEFAULT '',
  file_sha256       TEXT NOT NULL DEFAULT '',
  cv_path           TEXT,
  text_excerpt      TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  search            TSVECTOR GENERATED ALWAYS AS (
                      to_tsvector('simple',
                        coalesce(full_name,'') || ' ' || coalesce(email,'') || ' ' ||
                        coalesce(headline,'') || ' ' || coalesce(recruiter_notes,'') || ' ' ||
                        coalesce(skills::text,''))
                    ) STORED
);
CREATE INDEX candidates_owner_created_idx ON candidates (owner_id, created_at DESC);
CREATE INDEX candidates_owner_status_idx ON candidates (owner_id, status);
CREATE INDEX candidates_owner_offer_idx ON candidates (owner_id, offer_id);
CREATE INDEX candidates_owner_score_idx ON candidates (owner_id, score DESC);
CREATE INDEX candidates_owner_sha_idx ON candidates (owner_id, file_sha256);
CREATE INDEX candidates_run_idx ON candidates (run_id);
CREATE INDEX candidates_search_idx ON candidates USING GIN (search);
CREATE INDEX candidates_updated_idx ON candidates (updated_at);

CREATE TABLE candidate_history (
  id            SERIAL PRIMARY KEY,
  candidate_id  INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  old_status    TEXT,
  new_status    TEXT,
  comment       TEXT NOT NULL DEFAULT '' CHECK (char_length(comment) <= 2000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX candidate_history_cid_idx ON candidate_history (candidate_id, created_at DESC);

CREATE TABLE interviews (
  id            SERIAL PRIMARY KEY,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id  INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  starts_at     TIMESTAMPTZ NOT NULL,
  duration_min  INTEGER NOT NULL DEFAULT 45 CHECK (duration_min BETWEEN 5 AND 600),
  kind          TEXT NOT NULL DEFAULT 'visio' CHECK (kind IN ('telephone','visio','presentiel')),
  location      TEXT NOT NULL DEFAULT '' CHECK (char_length(location) <= 500),
  notes         TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 5000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX interviews_owner_starts_idx ON interviews (owner_id, starts_at);
CREATE INDEX interviews_candidate_idx ON interviews (candidate_id);

CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL DEFAULT '',
  entity_id    INTEGER,
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip           TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_user_created_idx ON audit_log (user_id, created_at DESC);
CREATE INDEX audit_log_created_idx ON audit_log (created_at);
