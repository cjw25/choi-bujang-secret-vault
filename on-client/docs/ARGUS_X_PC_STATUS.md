# ARGUS-X — 내 PC 상태 · 기록 타임라인형 (0.2.11 유지)

## 작업 기준과 보존

- 기준: `argus-x-day2-connection-0211` 의 커밋 `6db912a011e44fc504b1624d2148272050afcd60`
- 작업 브랜치: `argus-x-pc-timeline-0211`. 기존 `main`, 22단계 제출 SHA `fb6488afeb3bc3d2ebf574cf55e646eb91fd513e`, 기존 사용자 PC 원본 `C:\github\aleph-defense-starter` 변경 없음.
- `package.json` 버전 `0.2.11` 유지. 0.2.21 업데이트 및 포장/설치 명령을 실행하지 않는다.
- 학생의 13~22단계 `student/extension.mjs`, 별도 XDR 기록 및 기존 SOAR 코드는 수정하지 않는다.

## 제공 기능과 이번 작업

| 구분 | 범위 | 수행/한계 |
| --- | --- | --- |
| 제공(기존 0.2.11) | `public/index.html` 3개 메뉴, `public/app.js` 기본 UI와 HTTP, `src/server.mjs` 127.0.0.1 실행 | 신원/업무 앱/XDR/AI 조치 화면 보존. 기존 버전에는 PC CPU·메모리·디스크 조회 없음 |
| 이번 PC 수집 | `src/pc-status.mjs` 새 파일 | Node.js 내장 `os.cpus()` 약 300ms 전후 비교로 CPU 사용률 (%), `os.totalmem()` / `os.freemem()`으로 시스템 사용 메모리 추정량 (GiB), `fs.statfs()`로 프로젝트 파일시스템의 일반 사용자에게 사용 가능한 공간 (GiB) |
| 이번 API | `src/server.mjs`의 `GET /api/pc-status` | 기본 로컬 서버의 기존 Host/Origin 정책과 요청 제한을 그대로 사용. 요청할 때만 측정, 개인정보·경로·자격증명·디스크 전체 파일 목록 미반환 |
| 이번 UI | `public/index.html`, `public/app.js`, `public/style.css` | 기존 보호 현황에 별도 ‘내 PC 상태’ 표시; 조회 버튼, CPU/메모리/디스크 종류별 거르기, 최신 측정 시각순 기록, 직전 같은 종류의 **성공** 조회와 증감 비교 |
| 이번 문서 | `docs/ARGUS_X_PC_STATUS.md` | 변경 경계·재현·측정 해석·검증 항목 기록 |

## 측정·오류 원칙

- 모든 지표에 종류, 단위, 서버 측정 직후 ISO 시각(`measuredAt`), 로컬 Node.js 원천, 성공 여부를 동봉한다. 프런트는 브라우저 로컬 시간으로 보기 좋게 표시하며 정확한 서버 시간/PC 시간 차이는 별도 검증되지 않았다.
- CPU는 **시스템 전체** 사용률로 한 순간의 정확한 부하가 아니라 측정 구간 평균이다. 메모리는 시스템 전체에서 `totalmem - freemem`으로 추정한 값이다. 디스크는 앱이 위치한 파일시스템의 사용 가능 공간이며 모든 드라이브 전체 합계가 아니다.
- 세 값 중 일부만 실패해도 다른 성공값은 유지한다. 실패한 지표는 `0` 또는 정상이라고 꾸미지 않고 `확인 불가` + 사유로 표시한다. 비교는 같은 종류의 두 성공값만 사용한다.
- 별도의 관리자 권한, 드라이버, 레지스트리, 시스템 설정 변경, 폴더 전체 검사, AI 호출을 요구하지 않는다.
- 수집은 **버튼 클릭 때만**, 기록은 브라우저 메모리에 최대 60개 지표(약 20회 조회)를 보관하고 페이지를 새로 열면 사라진다. 디스크/메모리/CPU 조회 자료를 외부로 전송하거나 파일·DB에 저장하지 않는다.
- 이번 화면의 기록은 XDR 보안 기록과 별개다. 기존 XDR의 ‘정상’이나 ‘연결됨’을 추정하지 않는다.

## 재현 순서 (Windows PowerShell)

1. 앱이 켜져 있는 경우 실행 중인 PowerShell에서 `Ctrl+C`로 정상 종료한다.
2. **원본과 제출물 변경 없이** 22단계 복제본에서 다음 명령으로 별도 작업 브랜치만 내려받는다.

~~~powershell
git -C "C:\github\ARGUS-X-22-repro" status --short --branch
git -C "C:\github\ARGUS-X-22-repro" fetch origin argus-x-pc-timeline-0211
git -C "C:\github\ARGUS-X-22-repro" switch --track origin/argus-x-pc-timeline-0211
Set-Location "C:\github\ARGUS-X-22-repro\on-client"
node --version
Get-Content .\package.json
npm run check
node --check .\src\pc-status.mjs
node --check .\src\server.mjs
node --check .\public\app.js
git diff --name-status 6db912a011e44fc504b1624d2148272050afcd60 HEAD
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
~~~

3. `http://127.0.0.1:5189/` → 「보호 현황」 → 「내 PC 상태」에서 처음에는 세 지표 모두 **확인 불가 · 아직 조회하지 않았습니다**임을 확인한다.
4. 「PC 상태 조회」 버튼을 클릭한다. 각 지표에 수치/단위/측정 시각 또는 확인 불가와 이유가 표시되는지 확인한다. **현재까지 개발자가 사용자의 Windows PC 값을 직접 읽은 적 없으므로 이 단계의 실제 수치는 미확인**이다.
5. 다시 한 번 누른 뒤 같은 종류의 **직전 성공한 조회**와의 증감 비교를 확인한다. CPU는 `%p` (퍼센트포인트), 메모리와 디스크는 `GiB`. 변화가 없으면 0 변화도 올바른 실측 비교지만 이전 성공 기록이 없으면 '비교 불가'다.
6. 「기록 종류」의 ‘CPU’, ‘메모리’, ‘디스크’를 선택해 타임라인 필터를 확인한다. 시간 최신순을 확인한다.
7. 재시작/페이지 새로고침 시 임시 기록은 초기화된다. 기록 지속 보존은 **미구현**이다. 외부 운영 원천에 대한 연결 여부는 변하지 않는다.

## 테스트 사실과 미확인 사항

- 소스 기반 확인: 0.2.11에 CPU·메모리·디스크 PC 상태 수집 모듈/조회 UI가 없음을 확인했다.
- 이번 코드는 사용자 PC에서 원격 실행할 수 없어, 새로운 수치·확인 시각·Windows 시스템 상태를 **실측했다고 주장하지 않는다**.
- 파일 변경 범위와 JavaScript 문법, 컴퓨터 없는 환경에서의 제한된 구현 검사는 별도로 수행한 결과를 사용자에게 전달한다.
- 실제 Windows 일반 권한 조회 성공, 실제 UI 스크린샷, 성능·기능 통합 검증은 **사용자 PC 확인 전 미확인**이다.
