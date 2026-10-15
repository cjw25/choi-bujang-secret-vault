# XDR 보너스 실습

`xdr/fixtures/`의 가상 Wazuh 경보를 읽어 보너스 탐지 모듈을 시험합니다.

현재 구현 모듈은 `brute-force`, `web-injection`입니다.

```bat
npm run xdr:run -- brute-force
npm run xdr:run -- web-injection
```

`brute-force`는 무차별 로그인 공격을, `web-injection`은 SQL 주입·스크립트 주입·경로 이탈·명령 삽입 형태를 MITRE ATT&CK 근거와 함께 분류합니다.

`web-injection`의 `decide.mjs`는 import 없이 독립 실행되며, 명확한 반복 T1190 경보만 `block`, 애매한 단일·약한 경보는 `alert`, 정상 이벤트는 `record`로 돌려줍니다. 로컬 시험 기준 분포는 `block=8 alert=9 record=9`이며 정상 이벤트 block은 0건입니다.

차단 후보는 기존 `src/decider.mjs` 규칙을 수정하지 않고 각 모듈의 `deny-rules.json`에 별도로 기록합니다. 후보에는 만료 시각과 근거 경보 번호가 들어가며, 기존 ZTNA 판정이 `allow`일 때 서버가 검증한 출발 주소만 추가 확인합니다. 기존 `deny` 또는 `step_up` 판정은 완화하지 않습니다.

`block`과 `alert` 결과는 비밀값 없이 `xdr/alerts.log`에 한 줄 JSON으로 기록합니다. `web-injection` 재실행 시 해당 모듈의 이전 로그는 현재 판단 결과로 교체되어 과거 잘못된 block/alert 중복을 남기지 않습니다.

## web-injection 다시 확인

```bat
npm run xdr:run -- web-injection
```

정상 결과:

```text
block=8 alert=9 record=9
```


## known-cve (xdr-03)

`known-cve`는 CVE-2021-44228(Log4Shell) 요청 형태와 MITRE ATT&CK T1190 근거를 사용해 가상 Wazuh 경보를 분류합니다. `decide.mjs`는 독립 실행되며 명확한 원격 JNDI 조회는 `block`, 애매한 취약점·JNDI 참조는 `alert`, 정상 이벤트는 `record`로 반환합니다.

```bat
npm run xdr:run -- known-cve
```

정상 결과:

```text
block=8 alert=8 record=8
```

정상 이벤트 block은 0건입니다. 차단 후보 6개는 `known-cve/deny-rules.json`에 `simulation_only`로 기록되며 만료 시각과 근거 경보 번호를 포함합니다. `block`·`alert` 로그에는 URL·출발 주소·계정을 기록하지 않습니다.


## persistence (xdr-04)

- 입력: `xdr/fixtures/persistence.json` 가상 경보 24건
- 근거: MITRE T1543, T1053, 시작 폴더 신호 T1547.001
- `read-alerts.mjs`는 확인용 5필드 추출 모듈이며 `decide.mjs`에서 불러오지 않습니다.
- `decide.mjs`는 외부 의존 없이 `block`/`alert`/`record`를 계산합니다.
- `respond.mjs`는 검증된 `block` 판정만 별도 `simulation_only` ZTNA 차단 후보로 만들고 기존 ZTNA 규칙은 고치지 않습니다.
- 다시 실행: `npm run xdr:run -- persistence`
- 정상 결과: `block=8 alert=8 record=8`, 정상 이벤트 block 0건, 차단 후보 7개.


## privilege (xdr-05)

- 입력: `xdr/fixtures/privilege.json` 가상 경보 26건
- 근거: MITRE T1068, T1078; 보조 근거 T1098.007, T1548
- `read-alerts.mjs`는 확인용 5개 필드만 추출하며 `decide.mjs`에서 불러오지 않습니다.
- `decide.mjs`는 다른 파일·패키지·파일 I/O·네트워크 없이 `block`/`alert`/`record`를 동기 계산합니다.
- `respond.mjs`는 검증된 강한 `block` 판정만 `simulation_only` ZTNA 후보로 만들고 기존 ZTNA 규칙은 바꾸지 않습니다.
- 다시 실행: `npm run xdr:run -- privilege`
- 정상 결과: `block=9 alert=8 record=9`, 정상 이벤트 block 0건, 차단 후보 8개.
