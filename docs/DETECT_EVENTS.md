# 9단계 탐지 연습 사건 계약

`npm run detect:test`는 학생이 작성한 `src/detect.mjs`의 `detect(events)`에 가상 조회 사건을 전달합니다.

탐지 코드는 사건에서 필요한 최소 정보만 사용합니다.

```js
{
  at: '2026-10-01T00:00:00.000Z',
  subjectId: 'learner_fixture',
  deviceId: 'aaaaaaaaaaaaaaaa',
  requestType: 'note_read',
  decision: 'allow',
  network: 'usual'
}
```

- `subjectId`: 운영 엔진이 확인한 가명 사용자 식별자입니다.
- `deviceId`: 운영 엔진이 확인한 16자리 소문자 16진수 가상 기기 ID입니다.
- `requestType`: 요청 종류입니다. 로컬 연습에서는 `note_read`를 사용합니다.
- `decision`: 기존 접근 판정 결과이며 `allow`, `deny`, `step_up` 중 하나입니다.
- `network`: 네트워크 신호이며 로컬 연습에서는 `usual`, `unusual`, `unknown`을 사용합니다.
- `at`: 10분 구간을 계산하기 위한 UTC ISO 시각입니다.

메모 내용, 토큰, 실명, 요청 본문은 탐지 입력으로 사용하지 않으며 결과에도 복사하지 않습니다. 사건 객체에 이런 값이 추가로 붙어 있어도 탐지 코드는 읽거나 출력하지 않습니다. 지역 값 하나만으로는 의심 사건으로 확정하지 않습니다.

같은 `subjectId`와 같은 `deviceId`에서 `decision: 'allow'`인 조회가 `network: 'unusual'` 상태로 어느 10분 구간에서든 **120건을 넘을 때만** 다음 회수 제안을 돌려줍니다.

```js
{
  action: 'propose_revocation',
  reasonCode: 'burst_read',
  subject: '해당 subjectId',
  deviceId: '해당 deviceId'
}
```

정확히 120건은 회수 제안 대상이 아닙니다. 서로 다른 사용자나 서로 다른 기기의 사건을 합산하지 않고, 10분 밖의 사건도 같은 묶음으로 세지 않습니다. 평소 네트워크에서 대량 조회만 일어나거나, 다른 네트워크 신호만 있고 대량 조회가 없으면 `{ action: 'observe' }`입니다.

`propose_revocation`은 회수 **제안**일 뿐입니다. 학생 코드는 회수 API를 호출하거나 기기 권한을 직접 바꾸지 않습니다. 실제 회수 여부와 적용 시각은 운영 심판이 확인합니다.

이 계약은 9단계 최종 저장점에서도 탐지 입력과 회수 제안의 경계로 사용합니다.
이 파일의 사건 모양은 로컬 연습용입니다. `npm run detect:test` 통과를 실제 접속 차단이나 심판 판정으로 표시하지 않습니다.
