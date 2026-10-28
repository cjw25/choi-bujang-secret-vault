# ARGUS-X 2일차 — 연결 상태 관리 개선 기록

> 기준 Git 커밋: `fb6488afeb3bc3d2ebf574cf55e646eb91fd513e` (2026-10-28에 22단계 공식 통과한 제출 커밋). 이번 작업은 `argus-x-day2-connection-0211` **별도 브랜치**에서 작성했다. 기존 `main`과 기존 제출물·원본 PC 폴더는 건드리지 않는다.
>
> **버전은 0.2.11 유지**, 공식 0.2.21 업데이트는 사용자 결정에 따라 미적용한다.

## 작업 범위 및 변경 전후

| 파일 | 변경 이유 |
| --- | --- |
| `student/extension.mjs`의 `renderIdentity` | 세 자료의 모드(connected/demo/disconnected/unknown) 구분; 오류 코드와 이전 데이터 미재사용 안내 |
| `student/extension.mjs`의 `renderStatus` | 전체·개별 원천 상태 구분, 빈 알림이 '위험 없음'을 의미하지 않는다는 설명, 진단 시각의 출처 명시 |
| `student/extension.mjs`의 `renderAiConnection` | AI 점검 출처 구분, demo의 verified·modelCount·checkedAt을 실제 인증·측정으로 오인하지 않도록 표시 |
| `docs/ARGUS_X_DAY2_CONNECTION.md` | 변경 범위와 재현 순서 기록(이 문서) |

기존 `renderDecision`, `renderEvents`, `renderVulnerabilities`, `renderExplanation`, `renderAction`의 코드는 동일하게 유지한다. `src/server.mjs`, `public/app.js`, `student/engine-adapter.mjs`, `package.json`, 제공 인증 설정, 기존 21·22단계 제출 문서는 변경하지 않는다.

| 개선 전 | 개선 후 |
| --- | --- |
| 연결 없음·예제·확인 불가를 간략히 표시 | 세 자료마다 자료 출처와 연결 성공 여부를 구분 |
| 사용자·기기·세션 오류 문구 | 오류 코드(안전한 형식일 때만) 및 이전 값 미재사용 안내 추가 |
| 빈 보안 알림에서 '주의할 알림이 없습니다' | '전달된 알림 없음은 전체 위험 없음/XDR 정상 확인 아님' 표시 |
| 진단과 AI의 `checkedAt` | 서버에서 전달받은 시각인지, 실제 PC 측정값인지 혼동하지 않게 설명 |
| demo 모드 AI 권한 표시 | '예제 권한이며 실제 앱 인증 아님'을 명시 |

## 근거 및 검증 범위

- **개선 전 사용자 PC 실측**: 2026-10-28 `C:\github\ARGUS-X-22-repro\on-client`에서 `tools/start-alekov.ps1` 서버 실행과 `http://127.0.0.1:5189/` 응답 확인. 보호 현황 `renderIdentity()` 및 미연결 상태의 화면 캡처 확인.
- **이번 코드 검토**: 변경 허용한 세 함수 이외 나머지 학생 함수의 원문 동일성 비교, JavaScript 구문 검사, 최소 모의 DOM 테스트에서 계정 미연결·계정 예제·보안 알림 없음·AI 점검 전·AI 예제·AI 오류 6개 시나리오 확인.
- **아직 미검증**: 변경 코드를 사용자 PC에서 실행한 결과, 실제 브라우저 DOM 및 UI 사용성, 원천 SDP/XDR·AI 실제 연결, 실제 SOAR 집행 및 별도의 공식 판정. 모의 데이터는 PC 실측이나 운영 서비스의 성공 증거가 아니다.
- 기존 버전 `0.2.11` 유지. 공식 22단계 통과 SHA는 별개로 그대로 보존되며 이번 변경 브랜치를 새로 제출하지 않는다.

## Windows PowerShell 재현 절차

1. 이전 실행의 PowerShell 창에서 `Ctrl+C`로 서버를 정상 종료한다.
2. 기존 복제본 Git 상태를 확인하고 새 브랜치만 가져온다. 기존 `main`은 움직이지 않는다.

~~~powershell
git -C "C:\github\ARGUS-X-22-repro" status --short --branch
git -C "C:\github\ARGUS-X-22-repro" fetch origin argus-x-day2-connection-0211
git -C "C:\github\ARGUS-X-22-repro" switch --track origin/argus-x-day2-connection-0211
Set-Location "C:\github\ARGUS-X-22-repro\on-client"
node --version
Get-Content .\package.json
npm run check
git diff --name-status fb6488afeb3bc3d2ebf574cf55e646eb91fd513e HEAD
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1
~~~

3. 브라우저에서 `http://127.0.0.1:5189/`의 보호 현황 → 학생 신원·기기·세션·AI 연결 점검 전 화면을 비교한다. 연결 실패·예제 데이터가 실제 성공으로 표시되지 않는지 확인한다.
4. 실제 실행 결과는 **확인한 PC 출력과 캡처의 시간**, 설명용 값은 **예제**, 연결되지 않은 값은 **연결 없음**, 테스트하지 않은 경우 **미확인**으로 구별한다. 확인한 캡처 외에 실측 PASS를 적지 않는다.
5. 조회 전과 연결 실패에서 정상·안전 판정을 추정하지 않는다. 실집행이나 유료 AI 연결 테스트는 사용자가 명시적으로 실행하지 않는 한 수행하지 않는다.
