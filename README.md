# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.



## 2단계 저장점 — 자료를 코드 밖으로 옮깁니다

- 정적 `data.json`과 `public/data.json`에는 메모를 두지 않고 빈 `notes` 배열만 남깁니다.
- 첫 화면은 `/data.json` 대신 Vercel 서버 함수 `GET /api/notes`를 호출합니다.
- 서버 함수는 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 서버 환경변수에서만 읽어 학습용 Supabase의 가상 메모를 가져옵니다.
- 2단계에서는 아직 로그인을 붙이지 않았으므로 `/api/notes`는 비로그인 사용자도 호출할 수 있습니다. 이 접근 제어는 3단계에서 추가합니다.
- 첫 화면 응답에는 `X-Content-Type-Options: nosniff` 보안 헤더를 설정합니다.

### 2단계 설정

- 단계: `2`
- Git 저장소: `https://github.com/cjw25/choi-bujang-secret-vault`
- Production: `https://jeongwon-vault.vercel.app`
- 로그인 발급자: 없음
- 허용 경로: 아직 별도 로그인 허용 경로 없음
- 원본 API 주소: 해당 없음

Vercel Production 환경에는 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 직접 등록합니다. 실제 값은 코드, README, Git에 기록하지 않습니다.

### 다시 확인

로컬 정적 빌드는 다음 명령으로 확인합니다.

`npm run build -- --local`

배포 후에는 `/`, `/api/notes`, `/data.json`, `/aleph.json`을 확인합니다.

정상 결과:
- `/` 화면에 서버 API에서 받은 가상 메모가 표시됩니다.
- `/api/notes`는 학습용 가상 메모 JSON을 반환합니다.
- `/data.json`의 `notes`는 0건입니다.
- `/aleph.json`이 열리고 `step`이 `2`입니다.
- 첫 화면 응답에 `X-Content-Type-Options: nosniff`가 있습니다.

2단계에서는 `/api/notes`가 비로그인 요청에도 열려 있는 것이 현재 남은 약점이며, 3단계에서 로그인 검증을 추가합니다.

## 3단계 저장점 — 로그인해야 자료를 볼 수 있습니다

- Supabase Auth 이메일·비밀번호 로그인을 사용합니다.
- 로그인하지 않은 사용자가 `/api/notes`를 호출하면 `401`과 `{"error":"로그인이 필요합니다."}`를 반환합니다.
- 브라우저는 로그인 세션의 access token을 `Authorization: Bearer ...` 헤더로 서버 함수에 전달합니다.
- 로그인 사용자는 메모 목록 조회, 추가, 수정, 삭제 기능을 사용할 수 있습니다.
- 새 메모의 `owner_id`는 브라우저가 보내는 값이 아니라 서버가 검증한 로그인 사용자 ID로 저장합니다.
- 메모 목록 조회는 `owner_id = login.userId` 조건으로 로그인 사용자의 자료만 반환합니다.
- 정적 `data.json`과 `public/data.json`에는 메모를 저장하지 않습니다.
- 첫 화면 응답에는 `X-Content-Type-Options: nosniff` 보안 헤더를 유지합니다.

### 3단계 설정

- 단계: `3`
- Git 저장소: `https://github.com/cjw25/choi-bujang-secret-vault`
- Production: `https://jeongwon-vault.vercel.app`
- 로그인 발급자: `https://zjugvqxssegtpiqfncbw.supabase.co/auth/v1`
- 로그인 audience: `authenticated`
- 허용 경로:
  - `GET /api/notes`
  - `POST /api/notes`
  - `GET /api/notes/:id`
  - `PUT /api/notes/:id`
  - `DELETE /api/notes/:id`
- 원본 API 주소: 해당 없음

Vercel Production 환경에는 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 서버 환경변수로 등록합니다. 실제 값은 코드, README, Git에 기록하지 않습니다.

### 다시 확인

로컬 정적 빌드:

`npm run build -- --local`

배포 후 확인:

- `/aleph.json`이 열리고 `step`이 `3`입니다.
- 비로그인 `GET /api/notes`는 `401`을 반환합니다.
- 로그인 후 메모 목록을 볼 수 있습니다.
- 로그인 후 메모 추가·수정·삭제가 가능합니다.
- `/data.json`의 `notes`는 0건입니다.
- 첫 화면 응답에 `X-Content-Type-Options: nosniff`가 있습니다.

### 3단계에 남아 있는 약점

목록 조회와 새 메모 작성은 로그인 사용자의 `owner_id`를 사용하지만,
개별 메모 `GET /api/notes/:id`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`는 아직 `public_id`만 확인합니다.

따라서 다른 사용자의 메모 UUID를 알고 있다면 로그인한 상태에서 다른 사용자의 메모를 조회·수정·삭제할 가능성이 남아 있습니다.

이 문제는 4단계 「로그인해도 내 자료만 보이게 합니다」에서 개별 메모 요청에도
`owner_id = login.userId` 조건을 추가하여 막습니다.



## 4단계 저장점 — 로그인해도 내 자료만 보이게 합니다

- 로그인하지 않은 사용자는 `/api/notes`와 개별 메모 API를 사용할 수 없습니다.
- 메모 목록 조회는 `owner_id = login.userId` 조건으로 로그인 사용자의 메모만 반환합니다.
- 새 메모는 서버가 검증한 로그인 사용자 ID를 `owner_id`로 저장합니다.
- 개별 메모 조회·수정·삭제도 `public_id`와 `owner_id = login.userId`를 함께 확인합니다.
- 다른 사용자의 메모 UUID를 알고 있어도 조회·수정·삭제할 수 없으며 메모를 찾을 수 없는 것처럼 처리합니다.
- 정적 `data.json`과 `public/data.json`에는 메모를 저장하지 않습니다.
- 기존 로그인, 메모 추가·수정·삭제 기능과 보안 헤더를 그대로 유지합니다.

### 4단계 설정

- 단계: `4`
- Git 저장소: `https://github.com/cjw25/choi-bujang-secret-vault`
- Production: `https://jeongwon-vault.vercel.app`
- 로그인 발급자: `https://zjugvqxssegtpiqfncbw.supabase.co/auth/v1`
- 로그인 audience: `authenticated`
- 허용 경로:
  - `GET /api/notes`
  - `POST /api/notes`
  - `GET /api/notes/:id`
  - `PUT /api/notes/:id`
  - `DELETE /api/notes/:id`
- 원본 API 주소: 해당 없음

### 4단계 접근 제어

정상 요청:

- 사용자 A가 로그인하면 A 소유 메모 목록만 조회됩니다.
- A가 자신의 메모 UUID로 GET, PUT, DELETE를 요청하면 허용됩니다.
- 사용자 B도 자신의 메모만 조회·수정·삭제할 수 있습니다.

거부되어야 할 요청:

- 비로그인 사용자의 메모 API 요청은 `401`로 거부됩니다.
- A가 B 소유 메모 UUID로 GET, PUT, DELETE를 요청하면 `404`로 처리됩니다.
- B가 A 소유 메모 UUID로 요청해도 동일하게 거부됩니다.

### 다시 확인

로컬 빌드:

`npm run build -- --local`

배포 후 확인:

- `/aleph.json`의 `step`이 `4`입니다.
- 비로그인 `GET /api/notes`는 `401`입니다.
- 로그인한 사용자는 자기 메모만 목록에서 볼 수 있습니다.
- 다른 사용자의 메모 UUID를 직접 요청해도 조회·수정·삭제할 수 없습니다.
- `/data.json`의 `notes`는 0건입니다.
- 첫 화면 응답에 `X-Content-Type-Options: nosniff`가 있습니다.

## 5단계 저장점 — 자료 요청을 서버 한곳으로 모읍니다

- 브라우저의 메모 읽기·추가·수정·삭제는 모두 `/api/notes` 서버 함수로만 처리합니다.
- 브라우저에서 Supabase 공개 키와 직접 데이터 저장소 호출을 제거했습니다.
- 로그인은 `POST /api/auth/login` 서버 함수를 거쳐 처리하며 서버 전용 Supabase 설정은 브라우저에 노출하지 않습니다.
- 학습 DB의 `public.notes`에서 `PUBLIC`, `anon`, `authenticated` 직접 테이블 권한을 회수한 상태를 확인했습니다.
- 기존 서버 함수의 로그인 검증과 `owner_id` 소유자 검사는 그대로 유지합니다.
- 정적 `data.json`과 `public/data.json`에는 메모를 저장하지 않습니다.
- 첫 화면의 `X-Content-Type-Options: nosniff` 보안 헤더를 유지합니다.

### 5단계 설정

- 단계: `5`
- Git 저장소: `https://github.com/cjw25/choi-bujang-secret-vault`
- Production: `https://jeongwon-vault.vercel.app`
- 로그인 발급자: `https://zjugvqxssegtpiqfncbw.supabase.co/auth/v1`
- 로그인 audience: `authenticated`
- 원본 자료 API: `https://zjugvqxssegtpiqfncbw.supabase.co/rest/v1/notes`
- 허용 경로:
  - `POST /api/auth/login`
  - `GET /api/notes`
  - `POST /api/notes`
  - `GET /api/notes/:id`
  - `PUT /api/notes/:id`
  - `DELETE /api/notes/:id`

Vercel Production 환경의 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`는 계속 서버에서만 사용합니다. 실제 값은 코드, README, Git에 기록하지 않습니다.

### 다시 확인

로컬 빌드:

`npm run build -- --local`

배포 후 확인:

- A 계정 로그인 후 자기 메모 읽기·추가·수정·삭제가 유지됩니다.
- 비로그인 `GET /api/notes`는 JSON 오류와 함께 `401` 또는 `403`입니다.
- `/aleph.json`의 `step`은 `5`이고 `allowedRoutes`가 비어 있지 않습니다.
- 첫 화면 응답에 `X-Content-Type-Options: nosniff`가 있습니다.
- 첫 화면 소스에는 `sb_publishable_...` 또는 anon JWT가 없습니다.
- 원본 자료 HTTPS 경로는 직접 권한이 없어야 하며 운영 심판이 anon 키로 확인합니다.
