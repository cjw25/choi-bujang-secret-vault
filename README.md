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

## 보너스 xdr-01 저장점 — 무차별 로그인 공격을 잡아 냅니다

- `xdr/fixtures/brute-force.json`의 가상 Wazuh 경보 28건을 읽고 시각·출발 주소·계정·규칙 수준·설명 5개 필드만 추출합니다. 비밀번호·토큰·키처럼 보이는 값은 설명에서 마스킹합니다.
- `xdr/brute-force/patterns.json`은 MITRE ATT&CK T1110을 근거로 단시간 반복 로그인 실패와 여러 계정 대상 password spraying을 포함한 패턴과 한 줄 근거를 기록합니다.
- `xdr/brute-force/decide.mjs`의 `decide(alert)`는 외부 호출이나 import 없이 명확한 패턴을 `block`, 애매한 실패를 `alert`, 정상 이벤트를 `record`로 나눕니다.
- 차단 후보는 기존 `src/decider.mjs`의 `RULE_IDS`를 고치지 않고 `xdr/brute-force/deny-rules.json`에 별도 추가 규칙 후보로 기록합니다. 각 후보에는 만료 시각과 근거 경보 번호가 있습니다.
- 알림은 `xdr/alerts.log`에 비밀값 없이 한 줄 JSON으로 누적합니다. 서버가 검증한 출발 주소·계정 문맥이 없으면 추가 거부 규칙을 적용하지 않습니다.
- 시험 결과는 `block 10`, `alert 9`, `record 9`이며 정상 이벤트 9건은 모두 `record`이고 차단된 정상 이벤트는 없습니다.

다시 실행:

`npm run xdr:run -- brute-force`

정상 결과:

`block=10 alert=9 record=9`

## 6단계 — 등록한 기기만 자료실에 들어옵니다

- 판정 요청의 `subjectId`는 운영 엔진이 확인해 만든 가명 사용자 식별자입니다.
- 판정 요청의 `deviceRegistered`는 운영 엔진이 확인한 기기 등록 여부입니다.
- `src/decider.mjs`의 `device_registered` 규칙은 `deviceRegistered === true`일 때만 요청을 허용합니다.
- `deviceRegistered`가 `false`이거나 값이 없으면 `deny`와 `device_not_registered`로 거부합니다.
- 인증서·CA·서명 키를 새로 만들거나 Git에 저장하지 않습니다.

### 다시 확인

1. `npm run decider:test`를 실행합니다.
2. `등록 기기의 정상 요청`이 `통과`인지 확인합니다.
3. `미등록 기기의 가상 요청`이 `통과`인지 확인합니다. 이 항목은 내부적으로 `deny`와 `device_not_registered` 응답을 검사합니다.
4. 이 명령은 로컬 가상 요청 연습이며 실제 심판 판정이나 미등록 기기 공격 결과가 아닙니다.

정상 출력:

`통과 · 등록 기기의 정상 요청`

`통과 · 미등록 기기의 가상 요청`

## 7단계 저장점 — 평소와 다른 접속은 다시 확인합니다

- 판정기는 계약에 있는 `signals`, `recentEvents`, `stepUp`만 읽고 출처가 없거나 불명확한 값을 정상값으로 채우지 않습니다.
- `judge_fixture`는 로컬·심판 가상 사건의 출처 표시일 뿐 실제 위치 증거로 취급하지 않습니다.
- 기존 `device_registered` 규칙을 유지하고 `step_up_required` 규칙을 추가했습니다.
- 이른 시각, 처음 보는 네트워크, 최근 대량 읽기 행동이 함께 나타나는 가상 복합 사건만 `step_up`으로 보냅니다. 지역 하나만으로 영구 차단하지 않습니다.
- `stepUp.verified === true`이고 계약 범위의 최근 추가 확인 요청이면 다시 판정해 `allow`합니다.
- 토큰 원문이나 기기 개인키는 판정 입력·로그·Git에 기록하지 않습니다.

### 7단계 설정

- 단계: `7`
- Git 저장소: `https://github.com/cjw25/choi-bujang-secret-vault`
- Production: `https://jeongwon-vault.vercel.app`
- 로그인 발급자: `https://zjugvqxssegtpiqfncbw.supabase.co/auth/v1`
- 로그인 audience: `authenticated`
- 원본 자료 API: `https://zjugvqxssegtpiqfncbw.supabase.co/rest/v1/notes`
- 판정 규칙: `device_registered`, `step_up_required`

### 다시 확인

`npm run decider:test && npm run fixture:7`

정상 결과:

- 등록 기기의 정상 요청: `allow`
- 미등록 기기의 가상 요청: `deny / device_not_registered`
- 복합 이상 접속: `step_up / step_up_required`
- 다시 확인한 복합 이상 접속: `allow`
- `fixture:7`의 정상 사건은 `allow`, 복합 이상 사건은 `step_up`

이 검사는 로컬 가상 사건 연습이며 실제 심판 판정이나 운영 자료 차단 성공을 의미하지 않습니다.

## 8단계 저장점 — 자료마다 갈 수 있는 구역을 나눕니다

- 기존 메모의 UUID와 주소는 유지하면서 API 응답에 `note:<UUID>` 자원 ID를 추가했습니다.
- 강사 공지는 `instructor_notice:<UUID>` 자원 ID 네임스페이스로 분리해 메모와 충돌하지 않게 했습니다.
- `src/decider.mjs`의 기존 `device_registered`, `step_up_required` 규칙을 유지하고 `resource_zone` 규칙을 추가했습니다.
- 판정기는 계약의 `service`, `method`, `path`, `route`와 빈 쿼리 여부로 알려진 자원 구역만 허용하고 나머지는 기본 거부합니다.
- 메모는 ID가 있는 단건 `GET`, `PUT`, `DELETE`만 허용하고 메모 생성·전체 목록은 판정기에서 거부합니다.
- 정상 자기 메모 `GET`은 `queryLength === 0`이면 빈 쿼리 지문의 표현 차이 때문에 막지 않습니다.
- 반 공지는 단건 `GET`만 허용하며 쓰기 요청은 판정기에서 모두 거부합니다. 강사 공지 수정은 별도 서버 관리 API가 저장된 강사 권한을 다시 확인합니다.
- 강사 자료는 판정기에서 모두 거부하고, 쿼리 기능 선택·`/export`·알 수 없는 경로도 거부합니다.
- 자료 API는 요청 본문의 `role`, `owner_id`, `ownerId`, `resourceId` 같은 권한 주장을 믿지 않으며, 메모 단건 API는 저장된 `owner_id`와 검증된 로그인 사용자를 다시 대조합니다.
- 화면 메뉴와 기존 메모 CRUD 화면은 변경하지 않았습니다.

### 8단계 설정

- 단계: `8`
- Git 저장소: `https://github.com/cjw25/choi-bujang-secret-vault`
- Production: `https://jeongwon-vault.vercel.app`
- 로그인 발급자: `https://zjugvqxssegtpiqfncbw.supabase.co/auth/v1`
- 로그인 audience: `authenticated`
- 원본 자료 API: `https://zjugvqxssegtpiqfncbw.supabase.co/rest/v1/notes`
- 판정 규칙: `device_registered`, `step_up_required`, `resource_zone`
- 허용 경로:
  - `GET /api/notes/:id`
  - `PUT /api/notes/:id`
  - `DELETE /api/notes/:id`
  - `GET /api/announcements/:id`

### 다시 확인

`npm run fixture:8-api && npm run fixture:8 && npm run decider:test && npm run fixture:7 && npm run build -- --local`

정상 결과:

- 자기 메모 단건 읽기·수정·삭제: `allow`
- 메모 생성·전체 목록: `deny`
- 공지 단건 읽기: `allow`, 공지 쓰기: `deny`
- 강사 자료와 알 수 없는 기능 경로: `deny`
- 직접 API 가상 검사에서 다른 사용자 메모와 권한 위조 요청은 거부됩니다.
- 기존 7단계 등록 기기·미등록 기기·복합 이상 접속·재확인 흐름이 그대로 통과해야 합니다.
- 공개 `data.json`의 메모는 계속 비어 있어야 합니다.

`fixture:8`과 `fixture:8-api`는 로컬 가상 요청·가상 DB 연습이며 실제 운영 엔진이나 Production DB의 심판 결과를 뜻하지 않습니다.

## 9단계 저장점 — 도플갱어를 찾고 권한을 거둡니다

- `src/detect.mjs`는 가상 사건에서 시각, 가명 사용자, 확인된 가상 기기, 요청 종류, 판정, 네트워크만 정규화합니다. 메모 내용·토큰·실명 같은 값은 저장하거나 결과에 복사하지 않습니다.
- 같은 가명 사용자와 같은 기기에서 `allow`된 읽기 요청이 10분 안에 120건을 **초과**하고 네트워크가 `unusual`일 때만 복합 의심 사건으로 탐지합니다.
- 원래 9단계 계약의 `{ at, method: 'GET', identity: { sub } }` 형식도 호환하며, 같은 가명 사용자의 GET이 10분 안에 120건을 초과하면 `propose_revocation / burst_read` 제안을 냅니다. 이 호환 결과에는 검증된 기기 값이 없으므로 `deviceId`를 만들어 넣지 않습니다.
- 지역 하나만 다르거나 평소 네트워크의 대량 조회, 정확히 120건, 거부된 조회, 서로 다른 기기에 나뉜 조회, 10분 밖의 조회는 정상 `observe`를 유지합니다.
- 복합 의심 사건은 `{ action: 'propose_revocation', reasonCode: 'burst_read', subject, deviceId }` 제안만 반환하며 확인된 가상 기기 한 개만 대상으로 합니다.
- 실제 회수 API를 만들거나 기기 등록 상태·기존 접근 판정 응답을 바꾸지 않습니다. 실제 회수와 회수 시간은 운영 심판의 별도 확인 대상입니다.

### 9단계 설정

- 단계: `9`
- Git 저장소: `https://github.com/cjw25/choi-bujang-secret-vault`
- Production: `https://jeongwon-vault.vercel.app`
- 로그인 발급자: `https://zjugvqxssegtpiqfncbw.supabase.co/auth/v1`
- 로그인 audience: `authenticated`
- 원본 자료 API: `https://zjugvqxssegtpiqfncbw.supabase.co/rest/v1/notes`
- 기존 판정 규칙: `device_registered`, `step_up_required`, `resource_zone`
- 허용 경로는 8단계와 동일하게 유지합니다.

### 다시 확인

`npm run detect:test && npm run decider:test && npm run fixture:7 && npm run fixture:8 && npm run fixture:8-api && npm run build -- --local`

정상 결과:

- 정상 조회 30건: `observe`
- 평소 네트워크의 121건: `observe`
- 다른 네트워크지만 정확히 120건: `observe`
- 다른 네트워크의 121건: `propose_revocation / burst_read`이며 가명 사용자와 가상 기기 하나가 포함됩니다.
- 기존 9단계 계약의 GET 121건도 `propose_revocation / burst_read`입니다.
- 지역만 다른 대량 조회, 거부된 대량 조회, 두 기기에 나뉜 조회, 10분 밖 조회는 `observe`입니다.
- 입력에 비밀값처럼 보이는 추가 필드가 있어도 탐지 결과에 노출되지 않습니다.
- 6~8단계 판정기와 API 가상 검사는 기존 결과를 유지해야 합니다.

`npm run detect:test`는 가상 사건 연습이며 실제 기기 회수, 운영 반 엔진 연결, 심판 통과를 증명하지 않습니다.

## 10단계 저장점 — 백업에서 자료실을 되살립니다

### 제작 1·2: 검증된 안전 정책 사본과 시험 정책 복원

- 안전 정책 사본은 `restore/safe-policy.json`이며 9단계 최종 저장점 `2cc8dfd3897afde5a37eaee7c26bff05944a5181`의 `notes`, `detect`, `xdr-brute-force`, `xdr-web-injection` 정책 파일 Git 객체와 규칙·허용 경로를 기록합니다.
- `npm run restore:preview`는 사본 형식, 사본 SHA-256, 사본 커밋이 현재 HEAD의 조상인지, 해당 커밋의 Git 정책 객체가 사본과 다시 일치하는지 모두 검증한 뒤에만 복원할 버전과 변경 범위를 보여 줍니다. 사본이 없거나 검증이 실패하면 차이를 보여 주지 않고 중단합니다.
- `npm run restore:apply -- notes`는 기본적으로 미리보기만 합니다. 실제 파일 쓰기는 미리보기에 표시된 `--apply --confirm=restore-notes-<안전커밋>`을 함께 넣었을 때만 수행합니다.
- 정책 복원은 지정한 서비스 파일만 되돌리고, `notes` 서비스에서는 안전 사본의 기존 허용 경로와 10단계 복구 경로를 함께 유지합니다. 다른 서비스 정책과 `xdr/alerts.log` 감사 이력의 해시가 바뀌면 오류로 중단합니다.
- 이 도구는 로컬 개발 폴더의 시험 정책 파일만 다루며 커밋·푸시·배포·운영 DB 변경을 자동으로 하지 않습니다.

정상 확인 순서:

1. `npm run restore:preview` — 복원할 안전 버전과 서비스별 변경 범위를 먼저 확인합니다.
2. `npm run restore:apply -- notes` — 실제 변경 없이 notes 복원 계획과 확인 문구를 확인합니다.
3. 실제 침해 시험 정책을 되돌릴 때만 표시된 확인 문구를 넣어 적용합니다.
4. 적용 직후 `git diff`로 바뀐 파일이 대상 서비스에 한정됐는지 확인합니다.
5. `npm run fixture:8-api`로 A의 정상 자기 메모 요청이 유지되고 B의 A 메모 요청이 다시 거부되는지 확인합니다.

현재 저장점에서는 실제 정책을 일부러 약하게 만든 뒤 복원하는 시험은 **미실행**입니다. 결과를 통과로 기록하지 않습니다.

### 제작 3: 비공개 가상 메모 한 건 복원

- 서비스: `notes`
- 복구 경로: `POST /api/restore/notes/:id`
- 설정: `aleph.config.json`의 `step`은 `10`, `restoreRoute`는 `POST /api/restore/notes/:id`이며 같은 값이 `allowedRoutes`에도 있습니다.
- 서버는 기존 로그인 검증 뒤 비공개 `notes_backup` 사본에서 **로그인 사용자가 소유한 지정 ID 한 건만** 읽습니다. 백업 테이블은 브라우저 역할이 직접 읽을 수 없도록 준비해야 하며 서버 전용 키에서만 접근합니다.
- 복구 전에 `public_id`, `owner_id`, `content_hash`를 모두 대조합니다. 내용 해시는 `sha256(UTF-8(제목 + "\n" + 본문))`의 64자리 소문자 16진수입니다.
- 현재 메모가 이미 사본과 같으면 쓰지 않고 `restored: false`를 반환합니다. 다르면 그 한 건만 갱신하고, 삭제된 경우에는 같은 ID·소유자·제목·내용으로 한 건만 다시 넣은 뒤 ID·소유자·내용 해시를 다시 확인합니다.
- 응답은 `{ id, restored, contentHash }`만 반환하며 메모 제목·본문·소유자·토큰을 내보내지 않습니다. 다른 메모와 `xdr/alerts.log`는 수정하지 않습니다.
- `npm run fixture:10`은 가상 시험 계정 B의 메모만 사용해 B 소유 사본 검증, A의 B 사본 사용 거부, 변조 해시 거부, 복구 결과 ID·소유자·내용 해시 일치를 확인합니다. 실제 Supabase 복구나 심판 판정은 아닙니다.

비공개 `notes_backup` 준비는 실제 DB 변경이므로 자동 실행하지 않습니다. Supabase에서 안전한 시점의 `notes`를 별도 비공개 사본으로 만들고 `public_id`, `owner_id`, `title`, `content`, 위 해시식으로 계산한 `content_hash`를 보관한 뒤, `anon`·`authenticated` 직접 권한이 없는지 확인해야 합니다. 이 실제 백업 준비와 배포된 주소에서 B 계정으로 복구 요청을 보내는 시험은 **미실행**입니다. 비밀번호나 토큰 값은 README·Git·로그에 적지 않습니다.

### 제작 4: 복구 뒤 1~9단계 재확인 순서

아래 결과 칸은 실제 복구 후 학생이 실행한 결과를 적는 자리입니다. 현재는 전부 **미실행**이며 임의로 통과 처리하지 않습니다.

| 순서 | 확인 명령/요청 | 기대 결과 | 복구 뒤 결과 |
|---|---|---|---|
| 1 | `npm run restore:preview` | 안전 사본 검증 후 복원 버전과 남은 정책 차이 표시 | 미실행 |
| 2 | `npm run decider:test` | 등록 기기 정상 요청 허용, 미등록 요청 거부 | 미실행 |
| 3 | `npm run fixture:7` | 정상 요청 허용, 복합 이상 접속은 `step_up` | 미실행 |
| 4 | `npm run fixture:8` | 메모 단건 허용 구역 유지, 목록·생성·미지 경로 거부 | 미실행 |
| 5 | `npm run fixture:8-api` | A 자기 메모 정상, B의 A 메모 요청과 권한 위조 거부 | 미실행 |
| 6 | `npm run detect:test` | 정상 사건 `observe`, 의심 사건만 `propose_revocation` | 미실행 |
| 7 | `npm run xdr:run -- brute-force` | 기존 XDR 분류와 감사 흐름 유지 | 미실행 |
| 8 | `npm run fixture:10` | B 복구 사본 ID·소유자·내용 해시 검증, A 사용 거부 | 미실행 |
| 9 | `npm run build -- --local` | 공개 `data.json`은 계속 빈 메모 배열 | 미실행 |
| 10 | 배포 뒤 비로그인 `POST /api/restore/notes/<가상 UUID>` | `401` 또는 `403` JSON 오류 | 미실행 |
| 11 | 배포 뒤 B 본인 메모 한 건 복구 | 응답 ID·내용 해시가 B의 비공개 사본과 일치 | 미실행 |

10단계 로컬 가상 시험이 통과해도 실제 DB 백업, 실제 정책 복구, Production 복구 성공이나 심판 통과를 의미하지 않습니다.

## 11단계 저장점 — 나만의 접속 앱을 완성합니다

### 제작 1: 설치형 웹앱과 기기 상태 표시

- 같은 Production 자료실에 `public/manifest.webmanifest`를 연결해 앱 이름을 **BYTE BACK 내 자료실**로 표시합니다. 별도 접속 프로그램을 만들거나 설치하지 않습니다.
- `public/sw.js`는 `/offline.html`과 아이콘만 캐시합니다. `/api/` 요청, 로그인 응답, 기기 승인 응답, 메모 내용은 가로채거나 저장하지 않습니다.
- 오프라인 화면은 네트워크가 끊겼다는 안내와 다시 연결하는 방법만 보여 줍니다. 보호 자료는 오프라인에서 열지 않습니다.
- 설치 가능/설치형 화면 표시는 UI에 보여 주지만 **설치 여부는 기기 승인 증거가 아니며 설치만으로 권한이 생기지 않는다**고 함께 표시합니다.
- `aleph.config.json`의 단계는 `11`이고 기존 보호 `allowedRoutes`, `restoreRoute`, 로그인 발급자와 원본 API 주소는 유지합니다.

### 제작 2: 서버가 확인하는 기기 승인

- 로그인 뒤 `이 기기 승인 요청`은 WebAuthn/패스키 등록을 시작하고 서버 DB의 `device_credentials`에 `approved=false`인 승인 대기 기록만 만듭니다. 버튼을 누른 것만으로 권한을 주지 않습니다.
- 패스키 **개인키는 기기의 인증기 안에만 남고** 브라우저 저장소, 서버 DB, Git에 저장하지 않습니다. 서버에는 공개키와 서명 카운터, 승인 여부만 둡니다.
- 실제 승인은 `policy/device-approval.sql`로 준비한 비공개 서버 표에서 운영자가 정확한 대기 기기를 확인한 뒤 `approved=true`로 바꿔야 합니다. `anon`과 `authenticated` 역할은 이 표들을 직접 읽거나 쓸 수 없습니다.
- `승인 결과 확인`은 패스키 서명을 검증한 뒤 서버의 `approved=true`를 다시 확인합니다. 둘 다 맞을 때만 30분짜리 임시 기기 세션을 발급합니다.
- 브라우저 `sessionStorage`에는 패스키나 기기 개인키가 아니라 이 짧은 **기기 세션 토큰**만 보관합니다. 서버 DB에는 토큰 원문이 아니라 SHA-256 지문만 저장합니다.
- 학생의 메모 목록/생성/단건 읽기·수정·삭제와 10단계 복구는 유효한 기기 세션이 없으면 `403 / device_not_registered`로 거부합니다. 승인 전에 화면도 메모와 편집기를 비워 둡니다.
- 승인된 기기 세션이 있어도 기존 로그인, 소유자, 강사 권한, 자원 구역 검사는 그대로 이어집니다. 운영 심판의 기존 가상 보호 요청 검증 경로도 유지합니다.

### DB 준비와 실제 승인

`policy/device-approval.sql`은 **자동 실행하지 않습니다.** Supabase SQL Editor에서 내용을 검토한 뒤 직접 실행해야 `device_credentials`, `device_challenges`, `device_sessions` 표와 권한이 준비됩니다. 실제 사용자 UUID, credential ID, 비밀번호, 토큰, 서버 키는 README나 Git에 적지 않습니다.

DB 준비 후 실제 확인 순서는 다음과 같습니다.

1. Production 화면에서 로그인합니다.
2. `이 기기 승인 요청`을 눌러 패스키 등록을 마치고 화면이 `승인 대기`인지 확인합니다. 이 시점에는 메모가 보이면 안 됩니다.
3. 서버 측에서 정확한 대기 기기를 확인하고 그 한 건만 승인합니다.
4. 화면의 `승인 결과 확인`을 눌러 같은 패스키로 서명합니다.
5. 서버가 `승인됨`으로 확인한 뒤에만 기존 메모 목록과 편집기가 나타나는지 확인합니다.

현재 저장점에서는 **DB 준비 SQL 실행, 실제 기기 승인, Production에서 승인된 기기의 메모 표시 확인은 미실행**입니다. 설치형 웹앱 표시나 로컬 가상 시험만으로 실제 기기 승인이 끝났다고 기록하지 않습니다.

### 다시 확인

로컬 코드·회귀 확인:

`npm install && npm run fixture:11 && npm run decider:test && npm run fixture:7 && npm run fixture:8 && npm run fixture:8-api && npm run fixture:10 && npm run detect:test && npm run restore:preview && npm run build -- --local`

기대 결과:

- `fixture:11`: 세션 없음, 승인 대기, 만료 세션은 거부되고 서버 승인+유효 세션만 허용됩니다.
- 기존 6~10단계 로컬 판정·탐지·소유자·복구 검사는 이전 결과를 유지해야 합니다.
- `restore:preview`는 기존 안전 정책과 11단계 보호 경로를 침해 변경으로 오인하지 않아야 합니다.
- 공개 `data.json`은 계속 빈 메모 배열이어야 합니다.
- 배포 뒤 비로그인 메모/복구/기기 승인 요청은 계속 거부되어야 합니다.
- 실제 학생 계정에서는 승인 전 자료가 없고, 서버가 승인한 기기에서만 기존 자료실이 정상 표시되어야 합니다.

`fixture:11`과 기존 fixture들은 가상 연습입니다. 실제 패스키 등록, 서버 승인, Production 보호 성공이나 심판 통과를 증명하지 않습니다.
