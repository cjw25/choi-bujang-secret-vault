# ARGUS-X 22단계 — 동일 커밋 새 폴더 재현 기록 및 릴리스 상태

> **판정 범위:** 원본 소스를 다른 PC에 설치한 운영 검증이 아니라, **동일 Windows PC의 별도 Git 복제 폴더**에서 사용자 PowerShell 출력과 브라우저 캡처로 확인한 재현 기록(학생 진술)이다. 공식 22단계 서버 AI는 제출 원문을 읽을 뿐 이 명령을 직접 실행하지 않는다. 미관찰 사항을 성공으로 처리하지 않는다.
>
> **릴리스 표시:** **0.2.11 / 검증 중 / v1.0 아님**. 기존 앱 `on-client/package.json`의 `version`은 `0.2.11`로 유지한다. 최종 수료·운영 인증·실집행 확인 전에는 1.0으로 올리지 않는다.

## 1. 고정 기준과 저장소 경계

| 항목 | 실제 확인·범위 |
| --- | --- |
| 앱 이름 | ARGUS-X (제공된 로컬 화면 표시는 케셰브) |
| 저장소 URL | https://github.com/cjw25/choi-bujang-secret-vault |
| 브랜치 | `main` |
| **실제 새 폴더에서 테스트한 기반 커밋** | `d6a2c2e4a70ccd17ebe5f4c8c438e3690e59e130` |
| 원래 Git 폴더 | `C:\github\aleph-defense-starter` (이번 새 환경 검증에서 파일 수정 안 함) |
| 재현 Git 폴더 | `C:\github\ARGUS-X-22-repro` |
| 재현 앱 시작 폴더 | `C:\github\ARGUS-X-22-repro\on-client` |
| 실행 진입점 | `on-client/tools/start-alekov.ps1` → `on-client/src/server.mjs` |
| 앱/Node | `alekov-client-starter 0.2.11`, 사용자 `node --version` = `v24.19.0` |
| 확인일 | **2026-10-27 (KST)**. 사용자 캡처의 상태 갱신 표기 **17:37:50**, OSV 조회 응답 `2026-10-27T08:43:34.991Z`(한국시간 **17:43:34.991**). 그 외 각 동작의 개별 초 단위 시각은 미기록 |
| 문서 자체의 커밋 | **이 문서를 추가한 Git 커밋은 위 기반 커밋과 다르다.** 작성 후 Git HEAD를 확인해야 하며, 최종 제출할 SHA 기준 재현 완료로 자동 간주하지 않는다. |

**중요:** 다른 커밋에서 과거에 수행한 개별 모의 검사·화면 검사는 이 기반 커밋의 누적 성공으로 합산하지 않는다. 아래 표에서 **이번 새 폴더에서 확인된 화면**과 **미확인 실제 동작**을 분리한다. 이 문서를 담는 후속 커밋에서는 소스/실행 파일이 기반 커밋과 같더라도 해당 SHA를 확인하고 필요 시 재실행한 뒤 결과를 추가해야 한다.

## 2. 재현 절차 (실제 수행 결과)

| 순서 | 사용자 수행·기록 | 판단 |
| --- | --- | --- |
| 원본 보존 | 원본 `git rev-parse HEAD` = `d6a2c2e4a70ccd17ebe5f4c8c438e3690e59e130`, `git status --porcelain` 항목 0개, 신규 폴더 `Test-Path` = `False` | **실제 PowerShell 확인** |
| 새 Git 복제 | `git clone --branch main --single-branch https://github.com/cjw25/choi-bujang-secret-vault.git "C:\github\ARGUS-X-22-repro"`. Git 출력: 889 objects 수신, 502 deltas 처리 | **실제 PowerShell 확인** |
| 복제본 동일성 | `git -C "C:\github\ARGUS-X-22-repro" rev-parse HEAD`가 위 40자리 기반 커밋과 정확히 일치 | **실제 PowerShell 확인** |
| 런타임 | `Set-Location "C:\github\ARGUS-X-22-repro\on-client"` 후 `node --version` → `v24.19.0` | **실제 PowerShell 확인** |
| 설치 | `on-client/package.json`에 외부 npm `dependencies` 없음. 기존 `on-client`에서 자동 설치나 `npm install`은 **실행하지 않았다**. 전체 저장소 루트 `package.json`/`package-lock.json`은 별도 프로젝트 | **코드 검토 / 설치 실행 미실시** |
| 첫 실행 | 앱 폴더에서 `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1` → `케셰브 연결 확인: http://127.0.0.1:5189` 및 `케셰브가 켜졌습니다...` | **실제 PowerShell 확인** |
| 브라우저 | `http://127.0.0.1:5189/`에서 보호 현황, 업무 앱, 보안 기록, 조치 초기 상태, OSV 조회 미설정 상태 확인 | **실제 화면 캡처**. 서버 연결 실패는 별도 기재 |
| 종료 뒤 HTTP | 실행 명령이 프롬프트로 돌아온 뒤 `Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:5189/" -TimeoutSec 3` 시도 결과 `연결 실패: 로컬 서버 응답 없음` | **실제 PowerShell 확인**. `Ctrl+C`를 눌렀는지 직접 확인 안 됨 |
| 재실행 | 같은 복제본 `on-client`에서 같은 PowerShell 실행 명령을 다시 수행해 동일 정상 시작 출력 및 HTTP 응답 확인 안내 | **실제 PowerShell 확인** |
| 재실행 후 브라우저 | **2026-10-28 오전 9:09:10(KST)** 화면 확인 시각의 사용자 스크린샷에서 `보호 현황`, 학생 `renderIdentity()` 및 `연결 없음` 안내가 동일하게 표시됨. 당시 복제본 HEAD는 `721b377c3ea924b95503422e175638788ed3e87b`로 앞서 확인했고, 그 커밋에서 기존 실행 코드와의 diff가 **이 문서의 추가 1개뿐임**도 확인함. | **실제 화면 재확인: PASS** / 실제 원천 연결은 여전히 미확인 |

실행 도구·명령의 상세 계약은 [STUDENT_RUNBOOK.md](STUDENT_RUNBOOK.md)와 [제공 실행 안내](STUDENT_LAUNCH_GUIDE.md)를 따른다. **원본 PC의 인증 파일·설정 파일을 새 폴더로 복사하지 않았다.** 복제에 실제 비밀을 포함하지 않도록 운영자 자격 자료는 Git 밖에 둔다.

### 다른 사람 PC에서 재현하기 (경로 의존성 제거)

제공 코드는 Windows PowerShell 및 Node.js 24.19.0을 기준으로 한다. **다른 PC 실측은 미확인**이다. 다른 PC에서는 새 빈 작업 위치를 선택하고 다음 순서로 진행한다.

~~~powershell
# Git을 설치했고 빈 위치를 선택한 Windows PowerShell에서
git clone --branch main --single-branch https://github.com/cjw25/choi-bujang-secret-vault.git ARGUS-X-22-repro
Set-Location .\ARGUS-X-22-repro
git rev-parse HEAD
# 아래 입력하는 실제 확정된 커밋과 위 출력이 일치하는지 먼저 확인한다.
Set-Location .\on-client
node --version
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
~~~

이 명령은 **재현 방법 설명**이며 다른 PC에서 실제로 실행했다고 주장하지 않는다. 원본 `main`이 후속 문서 커밋으로 이동하면 위 복제본의 HEAD는 기반 커밋과 다를 수 있다. 따라서 **최종 제출 커밋 40자리**를 복제 뒤 직접 대조하며, 다르면 복제 위치에서 해당 커밋을 **명시적으로 체크아웃한 뒤** 실행 기록을 새로 남긴다. 22단계의 재현 기준 커밋과 제출 커밋을 혼동하지 않는다.

### 2026-10-28 추가 증거 — 새 문서 커밋 기준 브라우저 재확인

사용자가 새 복제본 `git pull --ff-only origin main` 후 `d6a2c2e..721b377` Fast-forward, `git diff --name-status <기반 SHA> HEAD`에서 `A on-client/docs/STUDENT_REPRODUCTION_22.md`만 확인하고, `git rev-parse HEAD`에서 **`721b377c3ea924b95503422e175638788ed3e87b`**를 확인했다. 이후 동일 복제본을 재실행했고 **2026-10-28 오전 9:09:10(KST)** 확인 시각이 표시된 브라우저의 `보호 현황` 및 학생 `renderIdentity()`·원천 `연결 없음` 상태 캡처를 제출했다. 이는 **최초 문서 커밋에 대해 브라우저가 다시 열린 증거**이며, 13~20단계 모든 하위 동작의 전체 재시험은 아니다. **이 추가 증거를 기록하기 위한 이번 후속 문서 커밋의 SHA는 별도 확인이 필요하다.** 후속 변경은 문서로 제한하며 코드는 바꾸지 않는다.

## 3. 13~21단계별 재현 기록 (같은 복제 커밋)

**결과 용어:** `재현됨` = 해당 **표시/초기 상태만** 실제 브라우저에서 다시 보임; `연결 없음` = 외부 원천 미연결로 그 기능의 실제 결과를 재현하지 못함; `확인 불가` = 해당 동작을 이번 복제본에서 검증하지 않음. 각 행에 **재현된 범위와 미검증 범위를 함께 명시**한다. 전체 기능을 PASS로 의미 확장하지 않는다.

| 단계 | 확인 기능 | 결과 | 확인 시각(근거) | 증거·비고 / 미확인 원인 |
| --- | --- | --- | --- | --- |
| 13 | `renderIdentity()` 로그인·기기·세션 및 3개 메뉴 | **재현됨: UI 표시** / **연결 없음: 실제 로그인** | 2026-10-27 KST, 상태 갱신 표기 **17:37:50** | 복제본 `보호 현황` 캡처. 사용자·기기·세션은 `확인 불가(요청 실패)`, 학생 UI는 `연결 없음` |
| 14 | `renderDecision()` 제공 `접속 요청`·`판정 결과`, 학생 대기 상태 | **재현됨: UI 표시** / **연결 없음: 실제 판정** | 2026-10-27 KST (업무 앱 캡처, 개별 조작 시각 미기록) | `업무 앱을 선택하고 접속을 요청하세요.` 표시. 앱 목록 원천 미연결이라 `allow/deny/challenge/unknown` 실제 판정 미시험 |
| 15 | `renderEvents()` 접속·XDR 기록 | **재현됨: 연결 실패 안내** / **연결 없음: 실제 기록** | 2026-10-27 KST (보안 기록 캡처, 개별 시각 미기록) | `서버 연결 없음(disconnected)`, 기록을 불러오지 못했다는 이유 표시. 실제 XDR 사건·시간·필터·상세는 미검증 |
| 16 | `renderStatus()` 보호 알림과 기기·세션 오류 | **재현됨: 연결 실패 안내** / **확인 불가: 기타 상태 변화** | 2026-10-27 KST (보호 현황 캡처) | 기존 서버·에이전트 미연결 오류와 기기/세션 확인 불가가 보임. 새 데이터/빈 목록/시간 초과→회복은 이번 복제본 미시험 |
| 17 | `renderAiConnection()` AI 연결 점검 초기 상태 | **재현됨: 점검 전 UI** / **확인 불가: 실제 AI** | 2026-10-27 KST (OSV와 함께 찍은 보호 현황 캡처) | `AI 연결 점검 전`, 모델 응답 미확인. AI 점검 버튼을 누르지 않았으므로 실제 게이트웨이/모델 응답 미시험 |
| 18 | `renderExplanation()` AI 사건 설명 초기 상태 | **재현됨: 기록 선택 전 UI** / **확인 불가: 실제 설명** | 2026-10-27 KST (보안 기록 캡처) | `보안 기록에서 기록을 먼저 고르세요.`, `AI 설명 취소` 비활성화. 사건 선택·모델 호출·근거 대조 미시험 |
| 19 | `renderAction()` 조치 준비·원천 결과와 학생 `idle` | **재현됨: 미실행 UI** / **확인 불가: 원천 집행** | 2026-10-27 KST (조치 영역 캡처) | `조치 미실행(idle): 아직 실행을 요청하지 않았습니다.`, 집행 버튼 비활성. 사람 확인·실제 조치 연결이 준비되지 않았으며 실집행 미시험 |
| 20 | `renderVulnerabilities()` 공개 패키지 조회 | **재현됨: 미설정 상태** / **확인 불가: 실제 OSV 결과** | **2026-10-27 17:43:34.991 KST** (제공·학생 checkedAt 일치) | `설치 패키지 조회` 실제 클릭. 제공 `PROJECT_NOT_CONFIGURED`, 학생 `not_configured`. 취약점 없음과 구분; 실제 lock 설치 버전 및 OSV 결과 미확인 |
| 21 | `STUDENT_RUNBOOK.md`, 실행·시스템 구성도 | **재현됨: 문서 포함·실행 절차 일부** / **확인 불가: 범용 환경** | 2026-10-27 KST (복제 HEAD 및 21단계 문서 원문 대조) | 문서가 동일 커밋에 있고 앱 폴더의 실행 명령으로 서버 시작. 전체 환경·버튼·재시작 브라우저 검증은 위에서 범위를 분리. 다른 PC 미시험 |

**예제(demo) 결과:** 이번 22단계 새 환경에서는 `npm run demo`를 실행하지 않았다. 이전 별도 모의 데이터 DOM 검사(19·20단계)는 코드 표시 기능에 대한 참고 결과일 뿐 **복제본의 실제 연결 성공·22단계 전체 재현으로 합치지 않는다**.

## 4. 데이터 보존·백업·복원 계획 — 실행 가능한 운영 절차 (22단계 보완)

> **성격:** 2026-10-28 09:16 KST 공식 원문 검토에서 `data_preservation_plan`만 실패해 **실행·검증 가능한 절차**로 보완한 **계획/운영 지침**이다. 실제 Supabase/SQLite DB에 접속하거나 덤프·복원한 결과가 아니다. 담당 권한 및 암호화 저장소가 없는 경우 **실행 중단하고 미완료**로 표시한다. 기본 `on-client` 미연결 화면의 출력을 데이터 백업 성공과 혼동하지 않는다.

### 4.1 보존할 자료와 책임 경계

| 분류 | 원본과 포함 범위 | 공식/권장 백업 방법 | 복구 목적/한계 |
| --- | --- | --- | --- |
| **A. 학생 소스·문서·정책** | GitHub 원격, `on-client/student/extension.mjs`, `on-client/docs`, 루트 `src/decider.mjs`, `src/detect.mjs`, `xdr` | Git 태그/40자리 커밋 기록 + 별도 새 `git clone`. 백업 스냅샷 `restore/safe-policy.json`은 정책용만 | 소스/정책 버전 복구. Git만으로 **DB 레코드·권한·원천 조치 이력** 복원 불가 |
| **B. 학습용 메모·계정 데이터** | 원격 Supabase PostgreSQL. 실제 API `api/notes.mjs`는 `public.notes`의 `public_id/owner_id/title/content` 읽기·쓰기. Auth 사용자 등 별도 관리 스키마도 존재 가능 | **Supabase 공식 CLI `db dump` (roles/schema/data 세 파일)** + 이용 가능한 경우 Dashboard `Database > Backups`. 관계형 데이터 백업; Storage **파일 객체는 별도** | 별도 테스트 Supabase 프로젝트에서 SQL 복원 후 원본과 메모 건수·중복키·인증 경계 비교. 비밀키/Storage 객체는 덤프만으로 복원 불가 |
| **C. 조건부 조치·감사 DB** | `on-client/src/actions/store.mjs`는 **명시적으로 제공된 기존 외부 SQLite 절대경로**를 요구. `alekov_action_intents/state/audit`는 서비스가 구성된 경우에만 | SQLite 공식 온라인 `.backup` + `PRAGMA integrity_check`. DB 전체 1개 파일을 일관된 스냅샷으로 받음 | 별도 **시험용 새 DB 파일**에 `.restore`하고 테이블별 건수 검증. 현재 조치 미구성이므로 DB 경로·실제 테이블 존재는 미확인 |
| **D. XDR 감사 로그·화면 검증 기록** | 루트 `xdr/alerts.log`(존재하는 경우), 로컬 진단/캡처(민감 필드 제거) | 로그 기록기를 정지/회전하고 독립 저장소에 복제, SHA-256 비교. 캡처 원본은 비밀 제거 뒤 별도 보관 | 감사 이력 복구 및 이벤트 순서·행 수 확인. `restore:apply`는 로그 전체 복원 도구가 아님 |
| **E. SDP/AI/DB 접속 자격** | 프로젝트 밖의 관리자 SDK/Vault/인증서/토큰, Supabase 비밀값, 환경변수 | **Git 또는 일반 백업 폴더에 넣지 않는다.** 소유 관리자가 별도 비밀관리/재발급·회수 절차로 처리 | 자격·기기 승인은 독립적으로 재설정. 파일 복제로 타인 권한 재현 금지 |

**운영 역할:** 백업 실행·SQL 복원 승인 = 해당 원본 DB에 합법적 접근 권한을 가진 프로젝트 소유자/DB 관리자. 학생 = 소스/문서 재현 및 **비밀값 없는 결과만 기록**. 다른 프로젝트나 본 운영 DB에 복원하는 권한은 이 문서 자체로 부여되지 않는다.

**목표 정책(아직 자동 등록 안 함):** 매일 **21:00 KST**에 B·C·D 중 **실제 구성된 데이터** 백업, **배포/스키마/보안 정책 변경 직전 추가 백업**, 매주 일요일 **시험용 격리 환경 복원 검사** 및 매월 마지막 일요일 복원 절차 전체 점검. 일별 **14일**, 주간 **8주**, 월간 **3개월** 스냅샷 보관(단, 관련 법령·과제 요구사항이 더 길면 그 요구 우선). 작업 담당자가 각 실행 시각·백업 ID·성공/실패를 기록한다. **Windows 작업 스케줄러 등록, 실제 자동 실행, 보관 기간 만료본 삭제는 아직 실시하지 않았다.** 백업 작업 실패 시 이전 백업을 지우지 말고 담당자에게 알린다.

### 4.2 저장 위치·접근 권한·사전 점검 (Windows PowerShell)

- **1차 보관 경로:** `$env:LOCALAPPDATA\ARGUS-X-private-backups\<UTC 시간>` (예: `20261028T030000Z`). **프로젝트 `C:\github\...` 밖**이며 브라우저/정적 자산 경로가 아니다.
- **2차 독립 보관 경로:** 접근 통제된 **BitLocker 암호화 별도 매체 `E:\ARGUS-X-offsite`**, 또는 운영 승인된 **암호화·접근제한 별도 백업 서버/보관함**. `E:`는 예시 백업 전용 매체 문자로, 실제로 존재하고 암호화가 켜졌는지 확인한 경우에만 사용한다. **2차 매체가 없으면 백업 계획의 2중 보관은 미완료**이다.
- 접근 권한: 1차 폴더/복사본에 **현재 백업 담당 Windows 계정 + SYSTEM만 전체 접근**. 다른 사용자·공개 링크·`Everyone` 공유 불허. **OS 디스크 자체 암호화(BitLocker/장치 암호화) 여부도 확인**한다. 암호화가 활성화되지 않았다면 민감 원문 덤프를 로컬에 쓰지 않고 중단한다. 2차 매체는 BitLocker 잠금 또는 승인된 동등한 서버 측 암호화와 독립 권한을 사용한다.
- CLI 선행 설치: Git, PowerShell, Node.js(앱), **Supabase CLI + Docker Desktop(운영 중)**, **PostgreSQL 클라이언트 `psql`**, **SQLite 공식 CLI `sqlite3.exe`(조건부 C)**. 필요 도구를 공식 배포 경로에서 받는다. 해당 도구가 없는 환경은 지침만 읽고 **실행 성공 처리하지 않는다**.

아래 **백업 실행 시에만** PowerShell에서 수행한다. 암호화·접근 권한 사전 확인은 담당자가 수행하며, `Get-BitLockerVolume`이 사용 불가한 장치는 조직 암호화 설정 화면에서 확인한다.

~~~powershell
# PowerShell 5.1+ / 예시. 실제 암호화된 PC와 승인된 계정일 때만 진행.
$BackupRoot = Join-Path $env:LOCALAPPDATA 'ARGUS-X-private-backups'
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $BackupRoot /inheritance:r /grant:r "$($me):(OI)(CI)F" 'SYSTEM:(OI)(CI)F'
if ($LASTEXITCODE -ne 0) { throw '백업 폴더 ACL 설정 실패. 중단' }
& icacls.exe $BackupRoot
# 사람이 출력에서 담당 계정/SYSTEM 외 허용 ACE가 없는지 직접 확인한다.
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$BackupDir = Join-Path $BackupRoot $stamp
if (Test-Path -LiteralPath $BackupDir) { throw '동일 시각 폴더가 이미 있음. 중단' }
New-Item -ItemType Directory -Path $BackupDir | Out-Null
Get-Date -Format o
~~~

**주의:** 위 디렉터리 생성은 **실제 백업 수행 이력이 아니다**. 실행하지 않은 경우 `$BackupDir`도 존재한다고 가정하지 않는다. 다른 PC에서는 반드시 **자기 계정과 실제 암호화된 경로**를 사용한다. 백업을 수행할 때마다 새 타임스탬프 폴더를 만들고 기존 자료를 덮어쓰지 않는다.

### 4.3 Supabase 메모 데이터: 공식 전체 SQL 백업 → 격리 프로젝트 복원

**원본 지정:** Supabase Dashboard에서 **해당 학습 프로젝트를 열고** 상단 프로젝트 참조 ID와 `Connect`의 **Session pooler** 연결 URI(IPv4 환경 기본)를 확인한다. 데이터베이스 암호는 프로젝트의 **기존 관리자 권한**으로 확보한다. `SUPABASE_URL`이나 `SUPABASE_SECRET_KEY`는 **PostgreSQL 연결 문자열의 대체물이 아니므로** 이를 `db dump` 인수로 쓰지 않는다. **소스 프로젝트 ref와 복원용 새 프로젝트 ref를 각각 기록**한다. 백업은 실사용자가 아닌 승인된 관리자 유지보수 시간에 수행하고 가능하면 변경 요청을 잠시 멈춰 기준 시점을 고정한다.

**백업 도구:** Supabase 공식 `supabase db dump`(Docker 필요). 아래 코드는 공식 **roles / schema / data 분리 덤프**에 따른 PowerShell 명령이다. DB URI는 **`Read-Host -AsSecureString`으로 입력**하여 콘솔 출력과 명령 이력에 평문 URI를 남기지 않는다. CLI 실행 중에는 프로세스 인수/메모리로 URI가 전달될 수 있으므로 **신뢰된 개인·관리자 PC에서만** 수행한다. 콘솔 로그와 오류 화면에 URI/비밀번호를 기록하지 않는다.

~~~powershell
# 앞 4.2절을 거쳐 $BackupDir이 실제로 존재할 때. Git 프로젝트 내부에서 하지 않는다.
supabase --version
docker version
# 관리자가 Dashboard > Connect에서 선택한 원본 PostgreSQL Session pooler URI 입력 (화면 에코 없음).
$SourceRef = Read-Host '원본 Supabase 프로젝트 ref (비밀 아님)'
$SourceUriSecure = Read-Host '원본 DB 연결 URI (비밀번호 포함, 비표시 입력)' -AsSecureString
$SourceUri = [System.Net.NetworkCredential]::new('', $SourceUriSecure).Password
if (-not $SourceUri.Contains($SourceRef)) { throw '연결 URI와 원본 프로젝트 ref 불일치' }
Push-Location $BackupDir
try {
    & supabase db dump --db-url $SourceUri -f roles.sql --role-only
    if ($LASTEXITCODE -ne 0) { throw 'roles 백업 실패' }
    & supabase db dump --db-url $SourceUri -f schema.sql
    if ($LASTEXITCODE -ne 0) { throw 'schema 백업 실패' }
    & supabase db dump --db-url $SourceUri -f data.sql --use-copy --data-only -x 'storage.buckets_vectors' -x 'storage.vector_indexes'
    if ($LASTEXITCODE -ne 0) { throw 'data 백업 실패' }
    $names = @('roles.sql','schema.sql','data.sql')
    foreach ($name in $names) {
        if (-not (Test-Path -LiteralPath $name -PathType Leaf) -or (Get-Item -LiteralPath $name).Length -eq 0) { throw "누락 또는 빈 백업: $name" }
    }
    $manifest = foreach ($name in $names) {
        $hash = (Get-FileHash -LiteralPath $name -Algorithm SHA256).Hash
        "$hash $name"
    }
    $manifest | Set-Content -LiteralPath 'SHA256SUMS.txt' -Encoding ascii
    Get-Item roles.sql,schema.sql,data.sql,SHA256SUMS.txt | Select-Object Name,Length
} finally {
    Pop-Location
    Remove-Variable SourceUri,SourceUriSecure -ErrorAction SilentlyContinue
}
~~~

- 데이터 덤프를 **메모 전용 임시 파일**로 축소하지 않고 공식 프로젝트 SQL 세 종류로 만드는 이유: 실제 API는 `public.notes`를 사용하지만 권한·계정·마이그레이션 의존성이 있어 데이터만 내보내면 전체 복구를 보증할 수 없기 때문이다. `public.notes` 복구 시에도 **원본 스키마/권한/사용자 관련 제약을 검증**한다.
- Supabase **유료 요금제의** Dashboard `Database > Backups` 백업 현황도 확인한다. **Free 요금제에는 자동 일간 백업을 전제하지 않는다**. Dashboard 물리 백업을 SQL 파일로 직접 다운로드할 수 있다고 가정하지 않는다. 공식 지침: https://supabase.com/docs/guides/platform/backups , https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore .
- **Supabase Storage의 실제 파일 객체는 DB 백업에 포함되지 않는다.** Storage를 실제 사용한다면 별도 관리 권한으로 **버킷 이름·객체 키·파일 크기·해시(가능한 경우)를 목록화하고 파일 자체를 별도 승인된 암호화 저장소에 백업**한다. 원본 백업과 동일 시점의 버킷 목록/객체 수를 기록한다. 현재 이 프로젝트에서 Storage 사용 여부 및 객체 목록은 **미확인**이며 미확인을 '없음'으로 처리하지 않는다.
- 인증서·Supabase 비밀번호·토큰·Vault 암호화 키는 이 `*.sql` 3종과 **같은 폴더에 저장하지 않는다**. 별도 관리자용 비밀관리에서 복구 가능성 및 재발급을 확인한다. 플랫폼 관리 스키마/암호화 복원에는 별도 호환성 작업이 필요할 수 있다.

**복원은 반드시 격리된 새 Supabase 테스트 프로젝트에서만** 한다. 실제 서비스 프로젝트를 덮어쓰거나 Dashboard에서 원본 DB를 복구 지점으로 되돌리는 명령은 이 지침에 포함하지 않는다.

1. 관리자 계정으로 **새 테스트 Supabase 프로젝트**를 생성한 뒤, **원본 프로젝트 ref와 다른 테스트 프로젝트 ref**를 확보한다. 필요한 Database Extensions·Webhooks를 **원본과 동일하게** 사전 설정한다. 앱 API/정적 사이트를 이 시험 DB에 연결하지 않는다. 새 프로젝트의 `Connect`에서 대상 DB URI를 확보한다.
2. `SHA256SUMS.txt`의 **세 파일 해시**를 복원 전 다시 계산해 비교한다. 하나라도 다르거나 파일이 없으면 중단한다.
3. 아래처럼 공식 `psql` 단일 트랜잭션/오류 즉시 중단 절차를 실행한다. **신뢰하지 못하는 SQL을 원문 확인 없이 실행하지 않는다.** 스키마/역할 관련 권한 오류가 나면 원본 수정·우회 없이 중단하고 Supabase 공식 오류별 안내를 확인한다.
4. 완료 뒤 `public.notes`의 **행 수·중복 `public_id` 건수·필수 필드·RLS 설정·소유자 경계**를 원본에서 기록한 값과 비교하고, 시험 사용자·시험 기기 자격만으로 `GET /api/notes`가 자기 메모만 반환하는지 확인한다. 실제 사용자의 메모 본문/자격은 증거 문서에 쓰지 않는다. **보존된 복구 가능 상태**와 **실서비스 인증/보안 통과**는 다르다.

~~~powershell
# $BackupDir = 정확히 복원할 이전 스냅샷 절대경로. $SourceRef는 백업 당시 원본 ref.
$TargetRef = Read-Host '새 복원 시험 프로젝트 ref'
if ([string]::IsNullOrWhiteSpace($TargetRef) -or $TargetRef -eq $SourceRef) {
    throw '새 프로젝트가 아니거나 ref가 원본과 같습니다. 복원 금지'
}
Push-Location $BackupDir
try {
    foreach ($line in (Get-Content -LiteralPath 'SHA256SUMS.txt')) {
        $pair = $line.Trim() -split '\s+',2
        if ($pair.Count -ne 2 -or $pair[1] -notin @('roles.sql','schema.sql','data.sql')) { throw '무효한 해시 목록' }
        if ((Get-FileHash -LiteralPath $pair[1] -Algorithm SHA256).Hash -ne $pair[0]) { throw "SHA256 불일치: $($pair[1])" }
    }
    $TargetUriSecure = Read-Host '새 시험 DB 연결 URI (비밀번호 포함, 비표시 입력)' -AsSecureString
    $TargetUri = [System.Net.NetworkCredential]::new('', $TargetUriSecure).Password
    if (-not $TargetUri.Contains($TargetRef) -or $TargetUri.Contains($SourceRef)) { throw '시험 DB URI와 프로젝트 ref 불일치. 복원 금지' }
    # Supabase 공식 3파일 논리 복원. 원본 아닌 신규 프로젝트로만 실행.
    & psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql --dbname $TargetUri
    if ($LASTEXITCODE -ne 0) { throw '복원 실패: 변경 내용 검증 전 완료로 표시 금지' }
    & psql --dbname $TargetUri --variable ON_ERROR_STOP=1 --command 'SELECT COUNT(*) AS notes_count,COUNT(DISTINCT public_id) AS distinct_ids FROM public.notes;'
    if ($LASTEXITCODE -ne 0) { throw '복원 데이터 점검 실패' }
    & psql --dbname $TargetUri --variable ON_ERROR_STOP=1 --command "SELECT relrowsecurity FROM pg_class WHERE oid='public.notes'::regclass;"
    if ($LASTEXITCODE -ne 0) { throw 'RLS 상태 점검 실패' }
} finally {
    Pop-Location
    Remove-Variable TargetUri,TargetUriSecure -ErrorAction SilentlyContinue
}
~~~

**완료 판정:** 백업·복원 두 명령 집합 모두 exit code 0, `SHA256` 동일, 원본/격리본 `public.notes` 건수와 서로 다른 `public_id` 개수 일치, 원본과 동일한 RLS/기기 정책 보존 및 테스트 계정 권한 검사 통과. **하나라도 확인하지 않으면 '복원 미검증'**. 데이터 변경 중 백업했다면 원본 건수는 기준 시점이 달라질 수 있으므로 **변경 정지 시간 또는 일관된 스냅샷의 기준 시점**을 명시한다.

### 4.4 외부 SQLite 조치 이력 — 설정된 경우에만 백업·시험 복원

**사전 조건:** 제공 `on-client/src/actions/action-startup-config.mjs`가 요구하는 **실제로 존재하는 단일 링크·비심볼릭 SQLite DB 파일 경로**를 관리자에게 확인한다. 기본 화면 `idle`인 지금은 조치 DB가 구성됐다는 증거가 없으므로 **경로를 임의 추정·생성하거나 빈 파일을 운영 DB로 대체하지 않는다**. 별도 SQLite 공식 CLI: https://www.sqlite.org/cli.html .

~~~powershell
# 실제 외부 DB 경로·권한을 확인하고 4.2절 $BackupDir이 준비됐을 때만 실행.
$SourceDb = Read-Host '관리자가 확인한 기존 SQLite DB 절대 경로'
if (-not [IO.Path]::IsPathRooted($SourceDb) -or -not (Test-Path -LiteralPath $SourceDb -PathType Leaf)) {
    throw '운영 SQLite 경로 미확인: 백업 대상 아님'
}
$SqliteBackup = Join-Path $BackupDir 'actions.sqlite3'
$SqliteRestoreTest = Join-Path $BackupDir 'actions-RESTORE-TEST.sqlite3'
if ((Test-Path $SqliteBackup) -or (Test-Path $SqliteRestoreTest)) { throw '기존 백업/시험 DB가 존재함: 덮어쓰기 금지' }
# 열린 WAL 등을 무시하는 파일 단순 복사 대신 SQLite 공식 온라인 백업을 사용한다.
& sqlite3.exe -readonly $SourceDb ".backup '$($SqliteBackup.Replace('\','/'))'"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $SqliteBackup -PathType Leaf)) { throw 'SQLite 백업 실패' }
$check = & sqlite3.exe -readonly $SqliteBackup 'PRAGMA integrity_check;'
if ($LASTEXITCODE -ne 0 -or $check -ne 'ok') { throw "SQLite 백업 무결성 실패: $check" }
# 복원은 반드시 기존 DB 아닌 새 시험 파일로 한다.
& sqlite3.exe $SqliteRestoreTest ".restore '$($SqliteBackup.Replace('\','/'))'"
if ($LASTEXITCODE -ne 0) { throw 'SQLite 격리 복원 실패' }
$restoreCheck = & sqlite3.exe -readonly $SqliteRestoreTest 'PRAGMA integrity_check;'
if ($LASTEXITCODE -ne 0 -or $restoreCheck -ne 'ok') { throw 'SQLite 시험 복원 무결성 실패' }
# 테이블이 있는 경우 아래 3종을 원본·격리본 각각 조사하고 같은 건수인지 비교한다.
$sql = 'SELECT name FROM sqlite_master WHERE type=''table'' AND name IN (''alekov_action_intents'',''alekov_action_state'',''alekov_action_audit'') ORDER BY name;'
& sqlite3.exe -readonly $SourceDb $sql
& sqlite3.exe -readonly $SqliteRestoreTest $sql
Get-FileHash -LiteralPath $SqliteBackup -Algorithm SHA256
~~~

실제 테이블이 있는 경우 `SELECT COUNT(*) FROM alekov_action_intents;`, `...state;`, `...audit;`를 **원본과 복원 시험 DB에서 각각 실행**해 세 건수를 비교한다. 없는 테이블은 `0건`으로 치환하지 말고 **미구성**이라 기록한다. **원본 파일을 `.restore` 대상으로 절대 선택하지 않는다.** 조치 이력은 불변 감사 자료이므로 기존 로그나 상태를 덮어쓰지 않는다. 사용자가 승인하지 않은 실제 차단·세션 철회·grant 제거 명령을 실행하지 않는다.

### 4.5 Git 정책·XDR 로그·오프사이트 보관 및 검증

**Git 소스:** GitHub 복구 대상은 **40자리 SHA**로 지정하고 별도 폴더에 `git clone` 후 `git rev-parse HEAD`로 확인한다. 저장소 루트 `npm run restore:snapshot`/`restore:preview`/`restore:apply`는 `scripts/restore-lib.mjs`에서 정의한 `notes/detect/xdr-brute-force/xdr-web-injection` 정책 파일 전용이다. **`restore:apply`는 실제 변경 명령이며 본 단계에서는 호출하지 않는다**. DB/Supabase/권한/Vault를 이 도구로 복원할 수 있다는 주장은 금지한다.

**감사 로그:** 원본에 `xdr/alerts.log`가 있는 경우 관리자 승인 유지보수 창에 기록기를 **일시 정지/회전**한 뒤 백업 폴더에 `alerts.log`라는 이름으로 **복사본**을 만든다. 재개 전후 로그 크기·끝의 사건 시각·SHA256을 기록하고 원본을 삭제하지 않는다. 감사 이력이 로컬 외부 서비스에만 있으면 관리자에게 해당 서비스의 공식 export·복원 절차를 확인하고 **미확인**으로 기록한다. 전송/기록 중인 파일을 `Copy-Item`으로 복사해 **원자적 스냅샷**이라고 주장하지 않는다.

**독립 복제와 검사:**

~~~powershell
# 4.2~4.4절의 성공한 $BackupDir 폴더에서만. E:는 실제 BitLocker 암호화 매체일 때 사용.
$OffsiteRoot = 'E:\ARGUS-X-offsite'
if (-not (Test-Path -LiteralPath 'E:\' -PathType Container)) { throw '2차 백업 매체 없음: 완료 처리 금지' }
# 관리자와 BitLocker/접근권한 상태를 확인한 뒤에만 진행. 실패 시 민감 자료 복사 금지.
if (-not (Test-Path -LiteralPath $OffsiteRoot)) {
    New-Item -ItemType Directory -Path $OffsiteRoot | Out-Null
}
$OffsiteDir = Join-Path $OffsiteRoot (Split-Path -Path $BackupDir -Leaf)
if (Test-Path -LiteralPath $OffsiteDir) { throw '동일 이름의 2차 백업 존재: 덮어쓰기 금지' }
Copy-Item -LiteralPath $BackupDir -Destination $OffsiteDir -Recurse -ErrorAction Stop
foreach ($f in (Get-ChildItem -LiteralPath $BackupDir -File)) {
    $copy = Join-Path $OffsiteDir $f.Name
    if (-not (Test-Path -LiteralPath $copy -PathType Leaf) -or
        (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash -ne
        (Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash) {
        throw "2차 백업 해시 검증 실패: $($f.Name)"
    }
}
'2차 복사 파일 SHA256 검사 통과. 실제 DB 복원 검증은 별도 필요.'
~~~

**매체 `E:`가 없으면** 실제 승인된 보안 백업 서버/암호화 볼륨의 경로로 `$OffsiteRoot`를 바꾸고, 권한과 암호화 설정을 확인한 뒤 동일 과정을 시행한다. 원본과 동일한 디스크의 다른 폴더는 **독립 백업으로 인정하지 않는다**. 일반 메신저·개인 공개 클라우드·Git·정적 `public`에 SQL/SQLite/로그 원문을 올리지 않는다.

**보관 만료 절차:** 매일 21:00 최신 타임스탬프 폴더 생성 → 누락/비정상 크기/SQL·SQLite 무결성 실패 확인 → 2차 저장 후 **같은 SHA256 확인** → 일일 로그에 `timestamp / 종류 / SHA256 / 담당자 / 비밀 제외 오류 / 격리 복원 결과` 남김 → 일별 14일·주별 8주·월별 3개월 보존표와 대조 → **주간 격리 복원 검증까지 끝난 정상 스냅샷을 최소 1개 이상 남긴 상태에서만** 초과본 삭제 승인. 자동 삭제 스크립트는 두지 않는다. 실패했으면 이전 스냅샷 유지 및 관리자로 에스컬레이션한다.

### 4.6 복구 완료 판정표와 실제 실시 여부

| 필수 증거 | 성공 기준 | 2026-10-28 현황 |
| --- | --- | --- |
| 소스 | 원본·복원본 40자리 커밋 동일; 작동 화면과 미연결 상태를 구분 | **일부 확인**: 복제·화면·서버 재실행 실측, 22단계 문서 SHA 별도 기록 |
| 원격 Supabase | 관리자 연결 승인, `roles.sql/schema.sql/data.sql` 3종 존재, 종료 코드 0, 세 파일 SHA256과 오프사이트 해시 일치 | **미실행** |
| Supabase 복원 | **원본 아닌** 새 테스트 ref + SQL 무오류 + `public.notes` 건수/중복 UUID/권한·RLS 대조 | **미실행** |
| SQLite | 운영 파일 위치 확인, 공식 `.backup`, `integrity_check=ok`, 독립 `.restore`, 감사 테이블/건수 확인 | **미구성 여부 미확인 / 미실행** |
| XDR 로그 | 원본 존재 여부/회전 방식 확인, 안전 복제 및 해시·기간 대조 | **미실행** |
| 보관/접근권한 | 접근 제한 ACL, 로컬/2차 암호화 확인, 일·주·월 보관, 주간 복원 리허설 | **절차만 정의 / 실행 미확인** |

**학생 제출 기록 예시(실행 후에만 값 채움):** `2026-__-__ __:__ KST; 담당자: [승인된 역할]; 원본 프로젝트 참조: [비밀 아닌 ref]; 보관 위치 식별자: [비공개 경로 ID]; 데이터: [Supabase/SQLite/감사]; 덤프 파일 개수: [ ]; SHA256 비교: [PASS/FAIL]; 격리 복원 ref/DB: [ ]; 건수·권한 비교: [PASS/FAIL]; 실행: [실행됨/미실행]; 비고: [비밀 제외]`. **미실행 상태에서 임의의 통과 시각·해시·레코드 수를 만들어 적지 않는다.**

**이 보완의 의미:** 복구 주체·저장 위치·접근 권한·보관 주기·백업 명령·대상 격리·무결성/권한 검증을 구체적으로 정했다. **실제 고객/훈련 데이터의 백업·복원, SDP 인증 자격 이전, 실제 보안 조치는 전혀 수행하지 않았다.** 

## 5. 코드 일관성, 이동성 및 설정 경계

- 기본 실행의 제공 `tools/start-alekov.ps1` → `src/server.mjs`, `student/extension.mjs`, 화면 HTML·JS가 **같은 Git 커밋 복제본**에 존재한다. 로컬 브라우저가 동작한 범위에서만 일치성을 확인했다.
- 앱 `on-client/package.json`은 버전 `0.2.11`이고 `engines.node`는 `24.19.0`. 실행 도구는 22~24를 검사하지만 **다른 버전 실측은 하지 않았다**.
- 앱 `on-client/package.json`에 외부 `dependencies`가 없고 `on-client/package-lock.json`은 현 저장소에서 확인되지 않았다. 저장소 최상위 `package-lock.json`과 혼동하지 않는다.
- 제공 문서에는 `on-client/.env.example`을 언급하지만 현 GitHub에서 해당 파일은 확인되지 않았다. **없는 설정 예시를 있다고 주장하거나 생성하지 않는다.** 기존 운영자용 개별 자격은 Git·복제본 안에 넣지 않는다.
- 다른 PC의 운영자 SDP/AI 인증은 별도 연결/승인 없이는 재현할 수 없다. 공개 가능한 원격은 저장소 URL·OSV 공개 API이고 원천의 비공개 서버 주소는 문서에 적지 않는다.

## 6. 미완료 항목(UNV) 및 릴리스 판단

| 미확인 항목 | 현재 사유 / 후속 조치 |
| --- | --- |
| 실제 13~16단계 신원·접근 판정·XDR 기록·상태 갱신 | 기본 SDP 원천 `disconnected`. 운영자 승인 연결 시 별도 검증 필요 |
| 17~18단계 AI 모델 목록/실제 사건 설명 | AI 이용 권한·모델 응답 미시험. 수업용 AI 사용이나 모의 결과로 대체 불가 |
| 19단계 사람 확인 후 실제 집행/원천 효과 | 제공 실집행 연결 미준비. **v1.0 불가** |
| 20단계 정확한 설치 버전/OSV 조회 성공 | `PROJECT_NOT_CONFIGURED`. 실제 승인 패키지 검증 미실시 |
| 동일 PC 재실행 이후 브라우저 화면 | **2026-10-28 09:09:10 KST** 캡처로 초기 `보호 현황` 재표시 확인. 실제 서버/에이전트 연결은 `연결 없음`. 나머지 메뉴·하위 동작은 이 재기동 시점에 다시 누르지 않았음 |
| 다른 PC/OS, 운영 자격 이전, 실제 DB 백업·복원 | 모두 미실시. 파일을 무작정 복사하지 않음 |
| 21·22단계 공식 접수/AI 검토 | 사용자가 ALEPH 포털에서 별도 제출·원문 전달 및 판정 확인해야 함. **이 문서 작성은 제출이나 합격 증거가 아님** |
| 문서 추가 후 새 **최종** 커밋 기준 전체 동작 | 최초 문서 커밋 `721b377c3ea924b95503422e175638788ed3e87b`의 HEAD와 문서-only diff를 사용자 출력으로 확인하고, **재실행 후 `보호 현황` 캡처까지 확인**. 다른 하위 동작의 전부 재시험은 하지 않음. 본 후속 문서 수정 커밋의 SHA는 다시 확인·동기화해야 함 |

**버전 결론:** `ARGUS-X / alekov-client-starter 0.2.11 / 검증 중`. 22단계 AI 원문 검토에서 통과하더라도 운영 인증·실제 집행 확인 또는 `v1.0` 인증으로 자동 바꾸지 않는다. 같은 최종 커밋의 기능과 기록을 대조한 공식 결과가 나오기 전에는 '전체 성공'을 주장하지 않는다.

## 7. 최종 커밋과 22단계 제출 순서 (아직 미진행)

1. 현재 Git의 다른 변경사항을 먼저 확인하고 기존 작업을 보존한다. 문서 변경에 따른 새 SHA를 **실제 출력으로** 확인한다.
2. 새 기준 커밋을 복제 환경에 안전하게 동기화하고 `git rev-parse HEAD`를 대조한다. **문서 추가 전 기반 커밋의 검사 결과를 새 최종 SHA의 모든 기능 검사 통과로 옮겨 적지 않는다.**
3. 직접 실행한 테스트의 기록·시각·결과만 본 문서에 반영한다. 수행 안 한 테스트는 미확인.
4. 22단계 과제 화면에 GitHub 저장소 URL·실제 40자리 SHA를 **직접 입력**한다. 워크벤치 `포털 제출 준비`의 13~20단계 경로를 대신 쓰지 않는다.
5. 비공개 저장소일 때 해당 22단계의 **비공개 저장소 원문 준비 방법**에서 **원문 전달 도구 받기**. ZIP과 JSON 출력은 프로젝트 밖에 둔다. **정확한 `student-source-cli.mjs` 명령은 실제 화면을 확인한 뒤에만** 사용한다. 묶음 선택·원문 전달과 AI 판정 통과는 서로 다르다.

문서 작성 시점에는 **ALEPH 제출, 실 보안 조치, 유료 AI 요청, 데이터 백업/복원, 운영 연결 설정을 실행하지 않았다.**
