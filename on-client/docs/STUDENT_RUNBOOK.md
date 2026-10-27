# ARGUS-X: 학생 실행 설명서 및 시스템 구성도 (21단계)

> 목적: 다른 사람이 실제 파일 위치·실행 명령·상태를 대조해 학생용 보안 Agent를 실행할 수 있도록 기록한다. 이 문서는 **새 학생 문서**이다. 제공된 README, 서버, 판정 코드, 인증 설정 및 이전 단계 학생 함수는 변경하지 않는다.
>
> **명칭 구분**: 개인 Agent 이름은 **ARGUS-X**이다. 기존 제공 시작 틀의 앱 패키지는 `alekov-client-starter`, 실행 도구와 기본 화면의 표기는 **케셰브**이다. 명칭이 다르다는 이유로 경로·파일명·버튼 이름을 바꾸지 않는다.

## 1. 목적과 구성

ARGUS-X는 본인 범위의 현재 로그인·기기·세션, 업무 앱 접근 판정, 접속 기록·XDR 경보, AI 연결 점검·사건 설명, 사람 확인 후 원천 조치 결과, 공개 OSV 패키지 취약점 조회 **상태를 표시하는** 학생 보안 Agent이다. 회사 전체의 관리자·자동 차단 도구가 아니다.

- **브라우저 화면**: `public/index.html`과 `public/app.js`(제공), `student/extension.mjs`(학생 표시)
- **로컬 서버**: `src/server.mjs`(제공), `127.0.0.1:5189`
- **SDP·XDR 원천 연결**: `src/engine.mjs`의 기본값은 `disconnected`. `student/engine-adapter.mjs` / `src/engine/sdp-host.mjs`는 운영자가 별도 연결을 제공할 때 사용
- **AI 게이트웨이**: `src/ai/service.mjs` 등 제공 서비스에서 CLCO와 통신. 권한·연결 성공은 별도 확인 필요
- **OSV**: `src/vulnerabilities/project-scan.mjs`에서 지정된 프로젝트의 lock/설치 메타데이터와 승인된 공개 패키지를 확인한 뒤 공개 OSV 조회
- **조치**: `src/actions/service.mjs`의 제공 확인·집행 경계. 학생 렌더러는 실행을 대신하지 않음

## 2. 환경·버전: 코드 기준과 PC 실측 구분

| 대상 | 현재 원문에서 직접 확인한 값 | 실측 상태 |
| --- | --- | --- |
| 앱 패키지 | `on-client/package.json`: `alekov-client-starter` **0.2.11** | GitHub 원문 확인 |
| Node.js | 앱 `engines.node`는 **24.19.0**. 제공 PowerShell 실행 스크립트는 **22~24**를 검사·허용하고 24.19.0을 권장 | **사용자 PC의 정확한 버전 미확인**. 아래 `node --version`으로 확인 |
| 운영체제 | 제공 `tools/start-alekov.ps1`는 Windows PowerShell 실행 도구 | 사용자 Windows PowerShell에서 이전 실행 확인. macOS/Linux 미시험 |
| Git | 저장소에 기존 Git 기록 존재, `git status`와 `git pull --ff-only origin main` 실행 기록 확인 | Git 실행 가능, 세부 버전 미확인 |
| npm | `npm start`, `npm run demo`, `npm run check`가 `on-client/package.json`에 정의됨 | npm 버전과 이 명령들의 21단계 새 실행 결과는 미확인 |
| 앱 외부 의존성 | `on-client/package.json`에 외부 `dependencies`가 없음 | `on-client`에 `npm install`을 요구하는 근거 없음. 21단계에서 임의 설치 안 함 |
| 최상위 프로젝트 | 최상위 별도 `package.json`(Node.js `>=22`)와 `package-lock.json`(`lockfileVersion: 3`) 존재 | 앱 실행 패키지와 혼동하지 않음 |
| 설정 견본 | 제공 README에는 `.env.example`이 언급되지만 확인한 현재 GitHub의 `on-client/.env.example`은 **존재 확인 실패** | 파일을 만들거나 비밀값을 적지 않음 |

필요 프로그램은 **Windows PowerShell, Node.js, 로컬 브라우저**이고 기존 Git 프로젝트를 동기화하려면 Git이 필요하다. Node.js 설치가 필요하다면 https://nodejs.org/ 의 공식 배포를 사용하고 **새 PowerShell 창**에서 버전을 확인한다. 이 문서를 작성하면서 새 설치를 실행한 것은 아니다.

## 3. 실제 작업 위치와 파일 구조

현재 사용자 PC에서 확인된 Git 최상위: `C:\github\aleph-defense-starter`

실행 위치(앱 폴더): `C:\github\aleph-defense-starter\on-client`

~~~text
C:\github\aleph-defense-starter\
├─ README.md, package.json, package-lock.json   # 이전 단계 포함 저장소 최상위
└─ on-client\
   ├─ README.md                                  # 제공 문서: 유지
   ├─ package.json                               # 앱 0.2.11, 실행 스크립트
   ├─ tools\start-alekov.ps1                     # PowerShell 실행 도구
   ├─ src\server.mjs                             # 제공 HTTP 앱 서버
   ├─ src\engine.mjs                             # 미연결/예제 엔진
   ├─ src\engine\sdp-host.mjs                    # 조건부 SDP 연결
   ├─ src\ai\service.mjs                         # 조건부 AI 연결
   ├─ src\vulnerabilities\project-scan.mjs       # 조건부 OSV 스캔
   ├─ src\actions\service.mjs                    # 조건부 원천 조치
   ├─ student\engine-adapter.mjs                 # 제공 연결 경계
   ├─ student\extension.mjs                      # 학생 render* 함수
   ├─ public\index.html                          # 기본 화면/버튼
   ├─ public\app.js                              # 요청/취소/학생 렌더러 호출
   ├─ public\vulnerabilities-view.mjs             # 응답 검증/기본 표
   └─ docs\STUDENT_RUNBOOK.md                    # 신규 학생 문서(현재 파일)
~~~

`on-client/package-lock.json`은 현재 GitHub에 없는 것으로 확인했다. OSV 서버는 **운영자가 지정한 프로젝트 위치**에서 해당 프로젝트의 `package-lock.json`과 설치된 `node_modules` 메타데이터를 비교한다. 학생이 조회를 만들려고 경로·승인 공개 패키지 목록·의존성 버전을 임의 변경하지 않는다.

## 4. Windows PowerShell 실행·종료·재실행

이 절차는 제공된 `on-client/README.md`, `docs/STUDENT_LAUNCH_GUIDE.md`, 실제 실행 스크립트와 **이 사용자의 과거 실행 기록**을 대조해 작성했다. **새 PowerShell 창에서 문서를 처음부터 그대로 재현하는 21단계 검사는 아직 미실시**이다.

### 시작

1. 기존 앱이 이미 `5189` 포트를 사용 중인지 먼저 확인한다. 기존 프로세스를 무단 종료하지 않는다.
2. 파일 탐색기에서 `C:\github\aleph-defense-starter\on-client`을 열고 주소창에 `powershell`을 입력해 **새 PowerShell 창**을 연다. 또는 새 PowerShell에서 아래대로 이동한다.
3. 아래 검증 명령은 코드나 비밀 설정을 변경하지 않는다.

~~~powershell
Set-Location "C:\github\aleph-defense-starter\on-client"
Get-Location
node --version
Get-Content .\package.json
~~~

`Get-Location`은 `on-client`을 가리켜야 한다. **이 문서가 사용자 PC의 Node.js 버전을 확인한 것은 아니므로 `node --version` 출력을 직접 기록한다.**

4. 같은 `on-client` PowerShell 창에서, 이전 사용자 실행 기록과 실제 도구 파일에 있는 다음 명령을 입력한다.

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
~~~

5. 이 도구가 실제 HTTP 200 응답을 확인하면 다음 안내를 출력하도록 구현돼 있다.

~~~text
케셰브가 켜졌습니다. 브라우저에서 http://127.0.0.1:5189/ 을 여세요.
서버가 응답한 것만 확인했습니다. AI 연결 상태는 화면에서 따로 확인해 주세요.
끄려면 이 창에서 Ctrl+C 를 누르세요.
~~~

`src/server.mjs`의 자체 로그에도 `케셰브 연결 확인: http://127.0.0.1:5189`가 나올 수 있다. **서버가 시작되었다고 SDP/AI 연결·접근 승인·OSV 조회·ALEPH 통과가 완료된 것은 아니다.**

6. 로컬 브라우저에서 **http://127.0.0.1:5189/** 을 연다. 제공 메뉴의 정확한 명칭 **「보호 현황」**, **「업무 앱」**, **「보안 기록」**을 확인한다. 학생 구현을 새로 가져온 경우 `Ctrl+F5`로 최신 화면을 확인한다.
7. **「보호 현황」**의 **「설치 패키지 조회」**를 직접 누른 뒤 제공 **「설치 패키지와 취약점 정보」**와 학생 **「학생 패키지 조회 표시」**의 상태를 비교한다. 이 사용자의 실제 화면에서는 `PROJECT_NOT_CONFIGURED`/`not_configured`가 표시되었다. 이것은 조회 대상 미설정이지 '취약점 없음'이 아니다.

### 종료·재실행 및 대체 방법

- **종료**: 실행했던 PowerShell 창에서 `Ctrl+C`. 동일 브라우저 주소가 더 이상 응답하지 않는지 직접 확인한다. 이번 새 창 종료 실측은 **미확인**.
- **재실행**: 위 `Set-Location`과 실행 명령을 같은 앱 폴더에서 반복한다. 파일을 지우거나 Git을 초기화하지 않는다.
- **포트 충돌**: 기존 포트 프로세스를 함부로 종료하지 않는다. 실행 도구의 코드상 대체 옵션은 `-Port 5190`이고 그때 주소는 `http://127.0.0.1:5190/`이다. **대체 포트 실행은 미시험**.
- `npm start`는 `node src/server.mjs`를 실행하는 코드상 대체 경로이다. `npm run demo`는 예제 엔진이며 실제 기업 원천 연결이 아니다. `npm run check`는 `student/extension.mjs` 문법만 확인한다. **21단계 재실행으로 검증한 명령은 아니다.**
- 기본 학생 앱은 Node.js 기본 모듈로 실행된다. `on-client`에서 임의로 `npm install`하거나 전체 프로젝트 `package-lock.json`을 변경하지 않는다.

## 5. 텍스트 구성도와 Mermaid

### 글로 쓴 시스템 흐름

~~~text
브라우저: http://127.0.0.1:5189/
  public/index.html + public/app.js + student/extension.mjs
    │ HTTP /api/... (동일 로컬 서버)
    ▼
로컬 앱 서버: on-client/src/server.mjs (127.0.0.1:5189)
    ├─ 기본 src/engine.mjs: disconnected (실원천 미연결)
    ├─ 조건부: student/engine-adapter.mjs + src/engine/sdp-host.mjs
    │          → 기존 접근 제어/SDP·XDR 원천 (운영자 설정 필요)
    ├─ 조건부: src/ai/service.mjs → CLCO AI 게이트웨이 (권한 필요)
    ├─ 조건부: src/vulnerabilities/project-scan.mjs
    │          → OSV 공개 API (승인된 공개 패키지만, 현재 not_configured)
    └─ 조건부: src/actions/service.mjs → 사람 확인/원천 조치 결과
              (실제 집행 및 원천 효과 미확인)
~~~

~~~mermaid
flowchart LR
    B["브라우저 · public/index.html, public/app.js · http://127.0.0.1:5189/"]
    U["학생 표시 · student/extension.mjs"]
    S["로컬 서버 · src/server.mjs · 127.0.0.1:5189"]
    E["접근 제어/XDR 원천 · src/engine/sdp-host.mjs · 연결 미확인"]
    A["AI 게이트웨이/CLCO · src/ai/service.mjs · 승인 미확인"]
    V["OSV · src/vulnerabilities/project-scan.mjs · 승인 공개 패키지만"]
    X["조치 원천 · src/actions/service.mjs · 집행 미확인"]
    B -->|"화면 모듈"| U
    B -->|"HTTP /api/..."| S
    S -.->|"운영자 SDP 연결 시"| E
    S -.->|"앱 AI 권한 승인 시"| A
    S -.->|"프로젝트·공개 패키지 승인 시"| V
    S -.->|"사람 확인·실행 구성 시"| X
~~~

**점선은 코드가 지원하는 조건부 경로**이지, 현재 사용자 계정의 실제 연결 성공을 뜻하지 않는다. 브라우저와 학생 렌더러에는 백엔드 인증 자료를 넣지 않는다. 코드상 OSV 공개 조회 주소는 `https://api.osv.dev/v1/querybatch`이다. SDP 원천과 CLCO의 실제 운영 주소는 확인하지 않았으므로 문서에 쓰지 않는다.

## 6. 제공 코드와 학생 작성 기능의 경계

| 파일 / 함수 | 구분 | 기능 및 확인 수준 |
| --- | --- | --- |
| `public/index.html`, `public/app.js` | 제공 | 메뉴·버튼·HTTP 요청·취소·갱신·학생 함수 호출. 취소 후 응답 세대 검사 코드 확인, 실제 네트워크 지연 재현 미확인 |
| `src/server.mjs`, `src/engine.mjs` | 제공 | 로컬 HTTP와 미연결/예제 엔진. 실제 SDP 연결은 미확인 |
| `student/engine-adapter.mjs`, `src/engine/sdp-host.mjs` | 제공 | 운영자 설정 시 본인 범위 접근·XDR 원천 연결. 실운영 미확인 |
| `src/ai/service.mjs` 및 `src/connection/` | 제공 | AI·계정 승인. 실제 모델 응답 미확인 |
| `src/vulnerabilities/project-scan.mjs`, `public/vulnerabilities-view.mjs` | 제공 | lock/설치 정보 대조, 승인 공개 OSV 조회, 응답 계약 검증. 실제 조회 상태 `not_configured` 확인 |
| `src/actions/service.mjs` | 제공 | 사람 확인 및 원천 집행 처리. 실제 집행 미확인 |
| `student/extension.mjs → renderIdentity()` | 학생 | 로그인 사용자·기기·세션을 서버 증거 기준으로 표시. 소스 구현 확인 |
| `renderDecision()` | 학생 | 앱 접근 판정 `allow`/`deny`/`challenge`/`unknown` 구분. 원천 실측 미확인 |
| `renderEvents()` | 학생 | 보안 기록·XDR 사건·근거 표시. 실원천 기록 미확인 |
| `renderStatus()` | 학생 | 보호 상태 및 오류·알림 표시. 소스 구현 확인 |
| `renderAiConnection()` | 학생 | 앱 AI 권한·점검 상태 표시. 실제 성공 미확인 |
| `renderExplanation()` | 학생 | 사건 근거에 묶인 AI 설명 또는 오류 표시. 실제 설명 응답 미확인 |
| `renderAction()` | 학생 | `idle/prepared/pending/succeeded/unknown/expired` 등 상태와 현재 요청·증거·실제 효과의 구분. 19단계 모의 검사/`idle` 실제 화면 확인. `data-student-action-event`, `data-student-action-request` |
| `renderVulnerabilities()` | 학생 | `idle/loading/error/ok`와 `complete/partial/not_checked/not_configured/unverifiable` 구분; 정확한 버전, 출처, 시각, ID, 부분 실패 보존. 20단계 실제 `not_configured` 화면과 모의 표시 검사 확인. `data-student-package-name`, `data-student-package-version` |

학생 DOM은 `createElement` 및 `textContent`로 표시한다. 제공 함수의 버튼 이름과 `data-*` 속성, 서버 상태값은 변경하지 않는다. 학생 표시부에서 OSV 직접 조회·실제 보안 조치·인증을 새로 실행하지 않는다.

## 7. 장애 상황별 확인·복구 순서

| 화면·오류 | 올바른 해석 | 직접 확인 및 복구 |
| --- | --- | --- |
| `Node.js 가 없습니다` / Node 버전 오류 | 실행 환경 미준비 | `Get-Location` → `node --version` → 필요하면 수업 기준 버전을 설치하고 새 창에서 재시작. 설치 자체 미실시 |
| `포트 5189 를 다른 프로그램이 쓰고 있습니다` | 이미 실행 중이거나 포트 충돌 | 기존 앱 창 확인 → 무단 종료 금지 → 제공 `-Port 5190` 옵션으로 별도 시작 가능(실행 미검증) |
| `앱 폴더가 아닙니다` | 위치 오류 | `on-client`로 이동 후 `tools/start-alekov.ps1`, `src/server.mjs`, `package.json`이 실제 있는지 확인 |
| `연결 없음`, `ENGINE_NOT_CONNECTED` | SDP 원천 미연결 | 로컬 서버부터 확인 → **「도움정보 불러오기」** 확인 → 운영자에게 연결 설정 요청. 정상 접근으로 간주 금지 |
| `ON_AI_PROVISIONING_PENDING`, AI 권한 준비 중 | AI 사용 권한/앱 승인 미완료 | **「연결 도움정보 보기」**와 앱 승인 상태를 확인 → 담당자에게 문의. 비밀 자료를 입력하지 않음 |
| `AI_REQUEST_UNVERIFIED`, AI 점검 실패 | 모델 응답·연결 증거 부족 | **「AI 연결 점검」**과 오류 코드를 확인 → 필요 시 사용자가 직접 다시 확인. 자동 성공 간주 금지 |
| `PROJECT_NOT_CONFIGURED` / `not_configured` | OSV 조회 대상 프로젝트가 설정되지 않음 | **「설치 패키지 조회」**의 제공·학생 영역 비교 → 담당자가 설정하도록 요청. **실제 화면 확인됨** |
| `NO_APPROVED_PACKAGES` / `not_checked` | 승인된 공개 패키지 없음 | 미조회 상태로 표시 → 운영자에게 승인 목록 준비 요청. **모의 표시 확인** |
| `LOCKFILE_UNVERIFIABLE` / `unverifiable` | lock/설치 증거 확인 불가 | 운영자에게 대상 경로 확인 요청. 버전을 추측하거나 패키지를 낮추지 않음 |
| `partial` 및 패키지 `unverifiable` | 일부 결과만 확인 | 받은 취약점 `id`와 `modified`를 유지하고 전체 결과가 불명확함을 명시. **모의 표시 확인** |
| `none_found` | 승인된 조회 범위와 시각 안에서 알려진 항목 없음 | 정확한 설치 버전/출처/시각 대조. 전체 앱이 안전하다는 보장은 아님 |
| 조회 중 **「패키지 조회 취소」** | 현재 요청 중지, 이전 응답 재표시 금지 | 화면에서 현재 값이 사라지는지 확인 → 필요 시 직접 **「설치 패키지 조회」**. 실제 지연 응답 차단 실험 **미실시** |
| 조회 오류/`TIMEOUT` | 네트워크/서버 요청 실패 | 오류 코드 확인 → 사용자가 직접 **「설치 패키지 조회」** → 네트워크 탭에서 새 요청 확인. 실제 재시도 검증 미실시 |
| 조치 `pending`/`unknown`/`expired` | ACK만 받았거나 결과 미확인/확인 기한 만료 | 집행 효과로 표시 금지 → 지원되는 경우에만 제공 **「원천 결과만 재조회」** 사용. 실집행 미확인 |

오류 정보를 전달할 때는 **「도움정보 불러오기」**로 확인한 공개 가능 상태·코드만 공유하고, 인증 자료·키·토큰·개인 자격 파일이나 비공개 패키지 이름을 문서·Git에 남기지 않는다.

## 8. 실제 확인/미확인 현황과 21단계 직접 시험

| 구분 | 현재 결과 |
| --- | --- |
| 이전 단계 로컬 실행 | Windows PowerShell에서 시작했던 기록과 `127.0.0.1:5189/` 실제 브라우저 캡처 존재 |
| 실제 화면 | 조치 `idle`, 패키지 `idle`와 `PROJECT_NOT_CONFIGURED`/`not_configured` 표시 확인 |
| 모의 데이터 | 조치 상태별 분리·신규 데이터 교체, 패키지 `not_checked`·`partial`·취약점 ID 보존 및 정확 버전 표시 검사 |
| 소스에서만 확인 | 로컬 서버 실행 스크립트·기본 미연결 엔진·취소 세대 검사·외부 권한 조건 |
| 미확인 | 새 PowerShell 창에서의 21단계 **전체 재현**, 실제 Node 버전 출력, 종료/재시작 확인, 다른 PC, 실 SDP/XDR 연결, 실 AI 추론, 실제 보안 조치, 승인된 패키지 OSV 조회 성공, 실제 lock 버전 대조, ALEPH 21단계 공식 판정 |

**21단계 첫 번째 직접 확인**: 다른 기존 작업을 보존한 상태로 **새 PowerShell 창**에서 4절의 위치·Node 버전·실행 명령을 그대로 수행하고 터미널의 정확한 출력과 브라우저 표시를 확인한다. 이미 5189가 사용 중인 경우 기존 서버를 강제 종료하지 않는다.

**두 번째 직접 확인**: 제공 버튼 **「보호 현황」**, **「업무 앱」**, **「보안 기록」**, **「설치 패키지 조회」**, **「패키지 조회 취소」**와 실제 파일·경로를 문서와 비교한다. 수행하지 않은 시험은 미확인으로 유지한다.

## 9. 커밋과 21단계 원문 제출의 경계

- Git 최상위는 `C:\github\aleph-defense-starter`, 앱 실행 폴더는 `on-client`이다. 기존 변경이 있다면 먼저 Git 상태를 확인하고 그 내용을 보존한다.
- 공식 21단계는 **GitHub 저장소 주소와 해당 문서가 포함된 실제 40자리 커밋 SHA를 과제 화면에 직접 입력**한다. 저장소 주소는 `https://github.com/cjw25/choi-bujang-secret-vault`이다. 제출용 SHA는 제출 직전에 실제 Git 결과로 확인해야 하므로 이 문서에서 예측하지 않는다.
- 공식 안내에 따르면 워크벤치의 **「포털 제출 준비」는 13~20단계 지원**, 21·22단계는 과제 화면 직접 입력이다. 기존 제공 실행 안내의 21·22단계 방식 미정 표기보다 **현재 공식 과제 안내**를 우선한다.
- 비공개 커밋은 단계 화면 **「비공개 저장소 원문 준비 방법」**에서 **「원문 전달 도구 받기」**를 이용한다. ZIP과 출력 JSON은 **프로젝트 밖**에 두고, 제출 대상 Git 최상위에서 그 화면이 실제로 제공한 `student-source-cli.mjs` 명령을 사용한다. `--commit` 뒤에는 **검증한 40자리 SHA**를 넣는다. **도구의 정확한 옵션·실제 다운로드/출력 경로를 아직 보지 못했으므로 예시 명령을 만들지 않는다.**
- 생성된 JSON을 같은 단계의 **「비공개 저장소 원문 묶음」**에서 지정한 뒤 저장소/커밋/단계를 대조하여 사용자 본인이 제출한다. **원문 전달 완료 ≠ 공식 AI 검토 통과**이다. 원문만 실패했다면 제공 안내의 **「원문만 다시 보내기」**를 사용한다.
- 학생 코드를 실행하거나 실 유료 AI 요청·보안 집행을 하거나 단계 제출하는 작업은 **21단계 문서 작성에 포함되지 않는다**. 비밀 설정은 Git/문서/제출물에 넣지 않는다.

## 제공 원문 (수정하지 않음)

- [앱 README](../README.md): 목적·버전·시작 방법
- [학생 시작 안내](GETTING_STARTED_STUDENT.md), [실행 안내](STUDENT_LAUNCH_GUIDE.md)
- [학생 단계별 지침](STUDENT_PROMPTS.md), [구현 계약](IMPLEMENTATION_CONTRACT.md)
- [제품 개요](PRODUCT_OVERVIEW.md), [오류 안내](CONNECTION_TROUBLESHOOT.md)
- [AI 연결 안내](AI_SETUP_GUIDE.md), [SDP 연결 안내](SDP_HOST_CONNECTION.md)
