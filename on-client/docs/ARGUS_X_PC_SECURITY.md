# ARGUS-X Windows 네트워크·방화벽·이벤트 기록 (0.2.11 유지)

## 근거·범위
- **현재 작업 브랜치 그대로**: `argus-x-pc-timeline-0211`.
- 기준 커밋: `a977d10d7497ebad5857ebf99c9b4fdb7c618aef`.
- 기존 원본 `C:\github\aleph-defense-starter`, `main`, 이미 제출한 22단계 커밋 `fb6488afeb3bc3d2ebf574cf55e646eb91fd513e`은 변경하지 않는다.
- `package.json`은 계속 **0.2.11**. 0.2.21 업데이트, 앱 포장·설치·드라이버 작업 없음.

## 제공 기능과 추가 기능 구별
| 구분 | 내용 |
| --- | --- |
| 기존 제공 기능 | 보호 현황/업무 앱/접속·XDR 기록/AI·SDP 상태 및 기존 서버의 Host 확인·요청 한도 |
| 기존 학생 구현 | `student/extension.mjs`의 상태 표시/사건·조치 기능 — 변경 없음 |
| 기존 추가 PC 실측 기능 | `src/pc-status.mjs`로 CPU(%), 메모리(GiB), 프로젝트 디스크 여유(GiB) 측정 및 기록 타임라인 — 변경 없음 |
| 이번 추가 수집 | `src/pc-security.mjs`에서 Windows PowerShell의 읽기 전용 명령으로 네트워크, 방화벽, System, Application 집계 |
| 이번 통합 | `src/server.mjs`의 `GET /api/pc-security`, `public/index.html` + `public/app.js` + `public/style.css`의 별도 기록 타임라인 |

## 항목별 조회 방법
- **네트워크**: `Get-NetIPConfiguration`으로 연결된 어댑터 12개 이하의 별칭, IPv4/IPv6, 게이트웨이 및 DNS를 요약한다. 외부 접속 시험이나 스캔은 수행하지 않는다. 네트워크 주소는 민감할 수 있으므로 응답을 외부에 공유하지 않는다.
- **방화벽**: `Get-NetFirewallProfile -PolicyStore ActiveStore`의 Domain/Private/Public 프로필 활성화 상태(True/False/NotConfigured/Unknown), 기본 수신/송신 정책을 읽는다. **설정을 바꾸지 않는다**. 관리 권한이 없어 읽을 수 없는 항목은 `확인 불가`로 표시한다.
- **Windows System/Application**: 각 로그에서 `Get-WinEvent -FilterHashtable`을 사용해 마지막 24시간의 오류(Level=2)와 경고(Level=3)를 센다. 단위는 **건**. 이벤트 메시지·계정·개별 레코드는 응답하지 않는다. 20,000건 근처에서 상한 초과로 **확인 불가**, 7초 실행 시간 초과도 **확인 불가**로 처리한다.
- 권한 부족, 명령 미지원, 시간 초과, 출력 형식 오류, 비-Windows 환경 등은 **확인 불가 + 이유**. 권한 상승, UAC, 보안 정책 수정, 공격·침투 시뮬레이션 없음.
- Windows 이벤트 **경고·오류 건수는 침해·공격 탐지 건수가 아니다**. 기록이 0건이어도 보안 사고 없음이나 안전성 증명으로 해석하지 않는다.

## SDP와 로컬 PC 조회 분리
- 서버 어댑터 모드가 `disconnected`면 화면에 **SDP 미연결**, `demo`면 **SDP 예제 모드**, 기타는 **SDP 실제 연결 확인 불가**. 모드 자체를 실제 SDP 세션 성공 증명으로 사용하지 않는다.
- 로컬 네트워크/방화벽/로그 성공 4/4는 오직 **PC 조회 성공**이다. SDP/XDR/AI 연결 성공이라고 표시하지 않는다.

## 표시와 측정 시각
- 항목마다 `checkedAt` ISO 8601 시각, 단위(네트워크/방화벽: 개, 이벤트: 건), 출처 `windows-powershell-readonly`가 기록된다.
- 타임라인은 조회 시각 내림차순, 전체/네트워크/방화벽/System/Application 필터. 최근 80개 항목만 **브라우저 메모리**에 보관하며 새로고침하면 초기화된다.
- 실제 성공 조회 시각 외에 임의의 값이나 시각을 만들지 않는다. 서버 조회 자체가 실패하면 새 측정값을 생성하지 않고 오류만 표시한다. 이전 값은 과거 기록이며 현재 정상 상태를 의미하지 않는다.
- 앱 실행 폴더에서만 실행하고 **포장 명령은 사용하지 않는다**.

## Windows PowerShell 재현 순서
현재 앱 실행 중이면 실행 PowerShell에서 Ctrl+C로 종료. **기존 작업 폴더는 그대로 두고 현재 브랜치만 갱신**한다. 서버 실행 중 변경 파일이 반영되었다고 주장하지 않는다.

~~~powershell
git -C "C:\github\ARGUS-X-22-repro" status --short --branch
git -C "C:\github\ARGUS-X-22-repro" fetch origin argus-x-pc-timeline-0211
git -C "C:\github\ARGUS-X-22-repro" pull --ff-only origin argus-x-pc-timeline-0211
Set-Location "C:\github\ARGUS-X-22-repro\on-client"
npm.cmd run check
node --check .\src\pc-security.mjs
node --check .\src\server.mjs
node --check .\public\app.js
git diff --name-status a977d10d7497ebad5857ebf99c9b4fdb7c618aef HEAD
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
~~~

브라우저 `http://127.0.0.1:5189/` → 보호 현황 → '내 PC 네트워크·보안 기록' → 읽기 전용 조회 버튼 클릭. 네트워크·방화벽·System·Application의 실제 성공/실패와 이유, 마지막 24시간 집계 기간, 측정 시각, 단위를 확인. 종류 필터 변경 후 기록 보존을 확인. 기존 '내 PC 상태' 측정도 그대로 작동하는지 다시 검증.

## 검증 현황
- GitHub에 반영된 코드와 파일 변경 범위는 커밋 비교로 확인.
- **사용자 PC의 실제 네트워크 설정·방화벽 프로필·Windows 로그 건수는 현재 미확인**. 성공·실패 건수를 미리 만들어서 적지 않는다.
- Windows PowerShell 실행 및 실제 브라우저 기능 테스트는 사용자 PC에서 실행한 후에만 PASS로 확정한다.
