-- 11단계: 학생이 Supabase SQL Editor에서 검토 후 직접 실행하는 기기 승인 표입니다.
-- 설치형 웹앱 설치 여부와 기기 승인은 별개입니다.
-- 패스키 개인키는 브라우저 저장소나 이 DB에 저장하지 않습니다. 기기의 인증기 안에만 남습니다.
-- 서버에는 공개키, 승인 여부, 일회성 챌린지, 짧은 기기 세션의 SHA-256 지문만 저장합니다.

create table if not exists public.device_credentials (
  id text primary key,
  owner_id uuid not null,
  public_key text not null,
  counter bigint not null default 0,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists device_credentials_owner_idx
  on public.device_credentials (owner_id);

create table if not exists public.device_challenges (
  owner_id uuid not null,
  kind text not null check (kind in ('register', 'verify')),
  challenge text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists device_challenges_owner_kind_idx
  on public.device_challenges (owner_id, kind, expires_at desc);

create table if not exists public.device_sessions (
  token_sha256 char(64) primary key,
  owner_id uuid not null,
  credential_id text not null references public.device_credentials(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists device_sessions_owner_idx
  on public.device_sessions (owner_id, expires_at desc);

alter table public.device_credentials enable row level security;
alter table public.device_challenges enable row level security;
alter table public.device_sessions enable row level security;

revoke all on table public.device_credentials from public, anon, authenticated;
revoke all on table public.device_challenges from public, anon, authenticated;
revoke all on table public.device_sessions from public, anon, authenticated;

grant all on table public.device_credentials to service_role;
grant all on table public.device_challenges to service_role;
grant all on table public.device_sessions to service_role;

-- 승인 요청 API는 approved=false 행만 만듭니다. 이 SQL을 실행한 것만으로 어떤 기기도 승인되지 않습니다.
-- 실제 승인할 때는 서버 측에서 소유자와 credential id를 확인한 뒤 해당 한 건의 approved를 true로 바꿉니다.
-- 예시 값이나 실제 사용자/credential 값은 Git/README에 기록하지 마세요.
