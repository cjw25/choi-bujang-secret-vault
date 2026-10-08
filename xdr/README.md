# XDR 보너스 실습

`xdr/fixtures/`의 가상 Wazuh 경보를 읽어 보너스 탐지 모듈을 시험합니다.

현재 구현 모듈은 `brute-force`입니다.

```bat
npm run xdr:run -- brute-force
```

실행하면 `xdr/brute-force/result.json`을 갱신합니다. 명확한 공격의 추가 거부 후보는 기존 `src/decider.mjs` 규칙을 수정하지 않고 `xdr/brute-force/deny-rules.json`에 별도로 기록합니다. 각 후보에는 만료 시각과 근거 경보 번호가 들어갑니다. `block`과 `alert` 결과는 비밀값 없이 `xdr/alerts.log`에 한 줄 JSON으로 누적합니다.
