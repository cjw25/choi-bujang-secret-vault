// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions }) {
      const root = document.createElement('div');

      const deviceNames = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가'
      };

      const sessionNames = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가'
      };

      const modeNames = {
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가'
      };

      const value = (item) =>
        typeof item === 'string' && item.trim() ? item.trim() : '확인 불가';

      const translated = (names, status) =>
        Object.hasOwn(names, status) ? `${names[status]} (${status})` : '확인 불가';

      const line = (parent, text) => {
        const p = document.createElement('p');
        p.textContent = text;
        parent.appendChild(p);
      };

      const section = (title, resource, showData) => {
        const part = document.createElement('section');
        const heading = document.createElement('h4');
        heading.textContent = title;
        part.appendChild(heading);

        if (Object.hasOwn(modeNames, resource?.mode)) {
          line(part, modeNames[resource.mode]);
        }

        if (resource?.status === 'loading') {
          line(part, '불러오는 중');
        } else if (resource?.status === 'error') {
          const message = value(resource.error?.message);
          const unverifiable = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(resource.error?.code);
          line(part, `${unverifiable ? '확인 불가' : '연결 실패'}: ${message}`);
        } else if (resource?.status === 'ok') {
          showData(part, resource.data);
        } else {
          line(part, '확인 불가');
        }

        root.appendChild(part);
      };

      section('현재 계정·기기·세션', me, (part, data) => {
        line(part, `사용자: ${value(data?.user?.label)} (ID: ${value(data?.user?.id)})`);
        line(part, `현재 기기: ${value(data?.device?.label)} (ID: ${value(data?.device?.id)}) · ${translated(deviceNames, data?.device?.status)}`);
        line(part, `로그인 세션: ${value(data?.session?.id)} · ${translated(sessionNames, data?.session?.status)}`);
      });

      section('기기 목록', devices, (part, data) => {
        if (!Array.isArray(data) || data.length === 0) {
          line(part, '표시할 기기가 없습니다.');
          return;
        }

        for (const device of data) {
          line(part, `${value(device?.label)} (ID: ${value(device?.id)}) · ${translated(deviceNames, device?.status)}`);
        }
      });

      section('세션 목록', sessions, (part, data) => {
        if (!Array.isArray(data) || data.length === 0) {
          line(part, '표시할 세션이 없습니다.');
          return;
        }

        for (const session of data) {
          line(part, `${value(session?.id)} · ${translated(sessionNames, session?.status)}`);
        }
      });

      return root;
    },
    renderDecision({ status, mode, data, error, appId }) {
      const root = document.createElement('div');

      const line = (message) => {
        const p = document.createElement('p');
        p.textContent = message;
        root.appendChild(p);
      };

      const safeText = (value) =>
        typeof value === 'string' && value.trim() ? value.trim() : '확인 불가';

      if (status === 'idle') {
        line('업무 앱을 선택하고 접속을 요청하세요.');
      } else if (status === 'loading') {
        line(`업무 앱: ${safeText(appId)}`);
        line('판정 확인 중');
      } else if (status === 'error') {
        line(`업무 앱: ${safeText(appId)}`);
        line(`요청 실패: ${safeText(error?.message)}`);
        line('요청 실패는 접근 거부 판정이 아닙니다.');
      } else if (status === 'ok') {
        const decisionNames = {
          allow: '접근 허용',
          deny: '접근 거부',
          challenge: '추가 인증 또는 확인 필요',
          unknown: '판정 확인 불가'
        };

        const code = Object.hasOwn(decisionNames, data?.decision)
          ? data.decision
          : 'unknown';

        line(`업무 앱: ${safeText(data?.appId ?? appId)}`);
        line(`접근 판정: ${decisionNames[code]} (${code})`);
        line(`판정 이유: ${safeText(data?.reason)}`);
        line(`판정 시각: ${safeText(data?.checkedAt)}`);

        if (code === 'allow') {
          line('정책상 접근 허용이며 실제 앱 접속 성공을 보장하지 않습니다.');
        } else if (code === 'challenge') {
          line('추가 인증 또는 확인은 이 화면에서 수행되지 않습니다.');
        } else if (code === 'unknown') {
          line('접근 허용 여부를 확인할 수 없습니다.');
        }
      } else {
        line('판정 상태 확인 불가');
      }

      return root;
    },
    renderEvents({ status, mode, data, error }) {
      const root = document.createElement('div');

      const line = (message) => {
        const p = document.createElement('p');
        p.textContent = message;
        root.appendChild(p);
      };

      if (mode === 'demo') {
        line('예제 자료(demo)');
      } else if (mode === 'disconnected') {
        line('서버 연결 없음(disconnected)');
      }

      if (status === 'loading') {
        line('보안 기록을 불러오는 중입니다.');
      } else if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : '오류 내용을 확인할 수 없습니다.';

        line(`기록을 불러오지 못했습니다: ${message}`);

        if (error?.code === 'CONTRACT_MISMATCH') {
          line('응답 계약 확인 불가(CONTRACT_MISMATCH)');
        }
      } else if (status === 'ok') {
        if (!Array.isArray(data)) {
          line('기록을 불러오지 못했습니다: 응답 형식 확인 불가');
        } else {
          const events = [...data].sort(
            (a, b) => Date.parse(b.at) - Date.parse(a.at)
          );

          if (events.length === 0) {
            line('표시할 기록이 없습니다');
          } else {
            const rows = [];
            let openDetail = null;
            let openButton = null;

            for (const event of events) {
              const row = document.createElement('div');
              row.setAttribute('data-student-event-id', event.id);

              const kindNames = {
                access: '접속 기록',
                xdr: 'XDR 경보'
              };

              const kindLabel = Object.hasOwn(kindNames, event.kind)
                ? `${kindNames[event.kind]} (${event.kind})`
                : '확인 불가';

              const appLabel = typeof event.appId === 'string' && event.appId.trim()
                ? event.appId
                : '앱 확인 불가';

              const p = document.createElement('p');
              p.textContent = `기록 ID: ${event.id} · 시각: ${event.at} · 종류: ${kindLabel} · 앱: ${appLabel} · 요약: ${event.summary}`;

              row.appendChild(p);

              const detailButton = document.createElement('button');
              detailButton.type = 'button';
              detailButton.textContent = `${event.id} 상세`;
              detailButton.setAttribute('aria-expanded', 'false');

              detailButton.addEventListener('click', () => {
                const wasOpen = openButton === detailButton;

                if (openDetail) {
                  openDetail.remove();
                  openButton.setAttribute('aria-expanded', 'false');
                  openDetail = null;
                  openButton = null;
                }

                if (wasOpen) return;

                const detail = document.createElement('div');
                detail.setAttribute('data-student-event-detail', event.id);

                const detailLine = (message) => {
                  const item = document.createElement('p');
                  item.textContent = message;
                  detail.appendChild(item);
                };

                const statusNames = {
                  access: {
                    allowed: '접근 허용',
                    denied: '접근 거부',
                    unknown: '확인 불가'
                  },
                  session: {
                    active: '활성',
                    expired: '만료',
                    revoked: '철회됨',
                    unknown: '확인 불가'
                  },
                  device: {
                    compliant: '보안 기준 충족',
                    noncompliant: '보안 기준 미충족',
                    unknown: '확인 불가'
                  }
                };

                const showStatus = (type, code) =>
                  Object.hasOwn(statusNames[type], code)
                    ? `${statusNames[type][code]}(${code})`
                    : '확인 불가(unknown)';

                detailLine(`사건 ID: ${event.id}`);
                detailLine(`업무 앱: ${appLabel}`);

                detailLine('근거(evidence)');

                if (!Array.isArray(event.evidence) || event.evidence.length === 0) {
                  detailLine('근거 없음');
                } else {
                  for (const item of event.evidence) {
                    detailLine(`${item.id} — ${item.text}`);
                  }
                }

                detailLine('규칙(rules)');

                if (!Array.isArray(event.rules) || event.rules.length === 0) {
                  detailLine('규칙 없음');
                } else {
                  for (const item of event.rules) {
                    detailLine(`${item.id} — ${item.text}`);
                  }
                }

                detailLine(`접속 상태: ${showStatus('access', event.state?.access)}`);
                detailLine(`세션 상태: ${showStatus('session', event.state?.session)}`);
                detailLine(`기기 상태: ${showStatus('device', event.state?.device)}`);

                const unsupportedActions = Array.isArray(event.supportedActions)
                  ? event.supportedActions.filter(action =>
                      typeof action === 'string' && action.trim().length > 0
                    )
                  : [];

                if (unsupportedActions.length > 0) {
                  detailLine('조치 실행 연결은 준비 중입니다. 아직 지원하지 않는 조치입니다.');

                  for (const action of unsupportedActions) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = `${action} 미지원`;
                    button.disabled = true;
                    detail.appendChild(button);
                  }
                }

                row.appendChild(detail);
                detailButton.setAttribute('aria-expanded', 'true');

                openDetail = detail;
                openButton = detailButton;
              });

              row.appendChild(detailButton);
              rows.push({ event, row });
            }

            const controls = document.createElement('div');
            const count = document.createElement('p');
            const list = document.createElement('div');

            root.appendChild(controls);
            root.appendChild(count);
            root.appendChild(list);

            const createFilter = (labelText, values, describe) => {
              const label = document.createElement('label');
              const title = document.createElement('span');
              title.textContent = `${labelText}: `;

              const select = document.createElement('select');
              select.setAttribute('aria-label', labelText);

              const all = document.createElement('option');
              all.value = 'all';
              all.textContent = '전체';
              select.appendChild(all);

              const uniqueValues = [...new Set(
                values.filter(value =>
                  typeof value === 'string' && value.length > 0 && value !== 'all'
                )
              )];

              for (const value of uniqueValues) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = describe(value);
                select.appendChild(option);
              }

              label.appendChild(title);
              label.appendChild(select);
              controls.appendChild(label);
              return select;
            };

            const kindFilter = createFilter(
              '기록 종류',
              events.map(event => event.kind),
              value => value === 'access'
                ? '접속 기록 (access)'
                : value === 'xdr' ? 'XDR 경보 (xdr)' : value
            );

            const appFilter = createFilter(
              '업무 앱',
              events.map(event => event.appId),
              value => value
            );

            const accessFilter = createFilter(
              '접속 상태',
              events.map(event => event.state?.access),
              value => ({
                allowed: '허용됨',
                denied: '거부됨',
                unknown: '확인 불가'
              })[value] + ` (${value})`
            );

            const renderFiltered = () => {
              const matches = rows.filter(({ event }) =>
                (kindFilter.value === 'all' || event.kind === kindFilter.value) &&
                (appFilter.value === 'all' || event.appId === appFilter.value) &&
                (accessFilter.value === 'all' ||
                  event.state?.access === accessFilter.value)
              );

              count.textContent =
                `표시 ${matches.length}건 / 조회 ${events.length}건 (최신순)`;

              list.replaceChildren(...matches.map(item => item.row));

              if (matches.length === 0) {
                const empty = document.createElement('p');
                empty.textContent = '선택한 필터에 해당하는 기록이 없습니다.';
                list.appendChild(empty);
              }
            };

            for (const select of [kindFilter, appFilter, accessFilter]) {
              select.addEventListener('change', () => {
                if (openDetail) {
                  openDetail.remove();
                  openButton.setAttribute('aria-expanded', 'false');
                  openDetail = null;
                  openButton = null;
                }
                renderFiltered();
              });
            }

            renderFiltered();
          }
        }
      } else {
        line('보안 기록 조회 전');
      }

      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode }) {
      const root = document.createElement('div');

      const line = (parent, message) => {
        const p = document.createElement('p');
        p.textContent = message;
        parent.appendChild(p);
      };

      const value = (item) =>
        typeof item === 'string' && item.trim()
          ? item.trim()
          : '확인 불가';

      const deviceNames = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가'
      };

      const sessionNames = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가'
      };

      const statusText = (names, code) =>
        Object.hasOwn(names, code)
          ? `${names[code]}(${code})`
          : '확인 불가(unknown)';

      const failure = (parent, name, resource) => {
        const code = value(resource?.error?.code);
        const message = value(resource?.error?.message);

        const timedOut = /TIMEOUT|DEADLINE/i.test(code) ||
          /시간\s*초과/.test(message);

        line(parent, `${name} 조회 실패${timedOut ? ' (시간 초과)' : ''}: ${message}`);
        line(parent, `오류 코드: ${code}`);
        line(parent, '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.');
      };

      const section = (title, resource, emptyMessage, describe, names) => {
        const part = document.createElement('section');
        const heading = document.createElement('h4');
        heading.textContent = title;
        part.appendChild(heading);

        if (resource?.mode === 'demo') {
          line(part, '예제 데이터(demo) · 실제 연결 아님');
        } else if (resource?.mode === 'disconnected') {
          line(part, '서버 연결 없음(disconnected)');
        }

        if (resource?.status === 'idle') {
          line(part, `${title} 조회 전`);
        } else if (resource?.status === 'loading') {
          line(part, `${title} 불러오는 중`);
        } else if (resource?.status === 'error') {
          failure(part, title, resource);
        } else if (resource?.status === 'ok') {
          if (!Array.isArray(resource.data)) {
            line(part, `${title} 응답 형식 확인 불가`);
          } else if (resource.data.length === 0) {
            line(part, emptyMessage);
          } else {
            for (const item of resource.data) {
              line(part, `${describe(item)} · ${statusText(names, item?.status)}`);
            }
          }
        } else {
          line(part, `${title} 상태 확인 불가`);
        }

        root.appendChild(part);
      };

      if (mode === 'demo') {
        line(root, '전체 데이터 상태: 예제(demo)');
      }

      section(
        '기기',
        devices,
        '등록된 기기가 없습니다.',
        item => `기기: ${value(item?.label)}`,
        deviceNames
      );

      section(
        '세션',
        sessions,
        '현재 연결 없음',
        item => `세션 ID: ${value(item?.id)}`,
        sessionNames
      );

      line(root, '세션 조회는 현재 검증된 연결 한 건만 대상으로 합니다.');

      const notices = document.createElement('section');
      const noticeHeading = document.createElement('h4');
      noticeHeading.textContent = '보안 알림';
      notices.appendChild(noticeHeading);

      if (!Array.isArray(notifications)) {
        line(notices, '알림 자료 형식 확인 불가');
      } else if (notifications.length === 0) {
        line(notices, '주의할 알림이 없습니다.');
      } else {
        for (const notification of notifications) {
          line(
            notices,
            `자료(resource): ${value(notification?.resource)} · 코드(code): ${value(notification?.code)} · 내용(message): ${value(notification?.message)}`
          );
        }
      }

      root.appendChild(notices);

      const diag = document.createElement('section');
      const heading = document.createElement('h4');
      heading.textContent = '진단 정보';
      diag.appendChild(heading);

      const diagnosticLines = [];

      const safeDiagnosticValue = (raw) => {
        if (typeof raw !== 'string' || !raw.trim()) {
          return '확인 불가';
        }

        const text = raw.trim();
        const secretPattern = /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|PRIVATE KEY|(?:api[_ -]?key|authorization|password|secret|비밀번호|토큰)\s*[:=]\s*\S+/i;

        return secretPattern.test(text)
          ? '확인 불가(민감한 값 제외)'
          : text;
      };

      if (diagnostics?.status === 'idle') {
        line(diag, '진단 정보 조회 전');
      } else if (diagnostics?.status === 'loading') {
        line(diag, '진단 정보 불러오는 중');
      } else if (diagnostics?.status === 'error') {
        failure(diag, '진단 정보', diagnostics);
      } else if (diagnostics?.status === 'ok') {
        const data = diagnostics.data;

        const fields = [
          ['requestId', data?.requestId],
          ['component', data?.component],
          ['version', data?.version],
          ['checkedAt', data?.checkedAt],
          ['engine.mode', data?.engine?.mode],
          ['engine.code', data?.engine?.code]
        ];

        for (const [name, raw] of fields) {
          const entry = `${name}: ${safeDiagnosticValue(raw)}`;
          diagnosticLines.push(entry);
          line(diag, entry);
        }
      } else {
        line(diag, '진단 정보 상태 확인 불가');
      }

      line(diag, '도움 요청 시 필요한 진단 정보만 복사합니다. 외부로 자동 전송하지 않습니다.');

      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = '도움정보 복사';
      copyButton.disabled = diagnostics?.status !== 'ok';

      const copyResult = document.createElement('p');
      copyResult.setAttribute('role', 'status');

      copyButton.addEventListener('click', async () => {
        if (copyButton.disabled || diagnosticLines.length !== 6) return;

        try {
          if (!navigator.clipboard?.writeText) {
            throw new Error('클립보드 사용 불가');
          }

          await navigator.clipboard.writeText(diagnosticLines.join('\n'));
          copyResult.textContent = '진단 정보 6개 항목을 클립보드에 복사했습니다.';
        } catch {
          copyResult.textContent = '복사하지 못했습니다. 클립보드 접근 권한을 확인하세요.';
        }
      });

      diag.appendChild(copyButton);
      diag.appendChild(copyResult);
      root.appendChild(diag);
      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted }) {
      const root = document.createElement('div');

      const line = (message) => {
        const p = document.createElement('p');
        p.textContent = message;
        root.appendChild(p);
      };

      const messages = {
        ON_AI_PROVISIONING_PENDING: '계정 연결과 앱 이용 권한이 준비 중입니다. 담당자에게 확인하세요.',
        ON_AI_AUTHORIZATION_CHANGED: '점검 중 이용 권한이 변경됐습니다. 담당자에게 확인하세요.',
        SUBJECT_SCOPE_UNVERIFIED: '현재 로그인과 사용자 범위를 확인할 수 없습니다.',
        WB_CLCO_AUTH_REQUIRED: '앱 인증을 확인할 수 없습니다. 계정 연결 상태를 확인하세요.',
        WB_CLCO_ACCESS_BLOCKED: '앱 접근 권한이 제한됐습니다. 담당자에게 확인하세요.',
        WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량이 소진됐습니다. 담당자에게 확인하세요.',
        WB_CLCO_LIMIT_REACHED: 'AI 이용 한도에 도달했습니다. 담당자에게 확인하세요.',
        WB_CLCO_SESSION_CLOSED: 'AI 이용 시간이 아닙니다. 이용 가능 시간을 확인하세요.',
        WB_CLCO_RATE_LIMITED: '요청이 제한됐습니다. 잠시 후 직접 재점검하세요.',
        WB_CLCO_NETWORK_ERROR: 'AI 서버와 통신하지 못했습니다. 잠시 후 직접 다시 점검하세요.',
        WB_CLCO_TIMEOUT: 'AI 응답 시간이 초과됐습니다. 직접 재점검하세요.',
        REQUEST_TIMEOUT: '요청 처리 시간이 초과됐습니다. 직접 재점검하세요.',
        ENGINE_TIMEOUT: '서버 확인 시간이 초과됐습니다. 직접 재점검하세요.',
        TIMEOUT: 'AI 응답 시간이 초과됐습니다. 직접 재점검하세요.',
        WB_CLCO_CANCELLED: '요청이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
        REQUEST_CANCELLED: '요청이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
        CANCELLED: '요청이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
        MODEL_NOT_CONFIGURED: '사용할 모델이 설정되지 않았습니다. 담당자에게 확인하세요.',
        ON_AI_MODEL_LIST_EMPTY: '사용 가능한 모델이 없습니다. 담당자에게 모델 허용 설정을 확인하세요.',
        AI_REQUEST_UNVERIFIED: 'AI 연결 또는 응답을 확인할 수 없습니다.'
      };

      if (mode === 'demo') {
        line('예제 응답(demo) · 실제 AI 연결 성공이 아닙니다.');
      }

      if (status === 'idle') {
        line('AI 연결 점검 전');
        line('현재 앱 권한과 모델 응답을 아직 확인하지 않았습니다.');
      } else if (status === 'loading') {
        line('AI 연결 점검 중');
        line('현재 계정의 앱 권한과 모델 응답을 확인하고 있습니다.');
      } else if (status === 'ok') {
        const auth = data?.audienceAuthorization;

        if (auth === 'test') {
          line('시험 연결 점검(test)');
          line('실제 앱 이용 권한이 확인된 상태는 아닙니다.');
        } else if (auth === 'verified') {
          line('앱 권한 확인 후 점검(verified)');
        } else {
          line('AI 권한 확인 불가');
        }

        line(`modelCount: ${
          Number.isInteger(data?.modelCount) && data.modelCount >= 0
            ? data.modelCount
            : '확인 불가'
        }`);

        line(`checkedAt: ${
          typeof checkedAt === 'string' && checkedAt.trim()
            ? checkedAt
            : '확인 불가'
        }`);

        line('사건 설명은 아직 실행하지 않았습니다.');
        line('실제 사건 설명은 보안 기록에서 별도로 요청하고 확인해야 합니다.');
      } else if (status === 'error') {
        const rawCode = error?.code;
        const code = typeof rawCode === 'string' &&
          /^[A-Z][A-Z0-9_]{1,63}$/.test(rawCode)
            ? rawCode
            : 'AI_REQUEST_UNVERIFIED';

        const rawMessage = error?.message;
        const secret = /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|PRIVATE KEY|(?:api[_ -]?key|authorization|password|secret|token|비밀번호|토큰)\s*[:=]\s*\S+/i;

        const safeMessage = typeof rawMessage === 'string' &&
          rawMessage.trim() &&
          rawMessage.length <= 400 &&
          !secret.test(rawMessage)
            ? rawMessage
            : '오류 내용을 안전하게 확인할 수 없습니다.';

        line('AI 연결 점검 실패');
        line(`오류 코드: ${code}`);
        line(`오류 메시지: ${safeMessage}`);
        line(messages[code] || messages.AI_REQUEST_UNVERIFIED);
        line('이번 점검의 실패가 기존 보안 기록을 변경하지는 않습니다.');
      } else {
        line('AI 연결 점검 상태 확인 불가');
      }

      line('재점검은 제공 화면의 AI 연결 점검 버튼을 직접 누르세요. 자동 재요청하지 않습니다.');

      return root;
    },
    renderExplanation({ event, explanation, checkedAt }) {
      const root = document.createElement('div');

      const line = (message) => {
        const p = document.createElement('p');
        p.textContent = message;
        root.appendChild(p);
      };

      if (explanation?.mode === 'demo') {
        line('예제 자료(demo) · 실제 AI 사건 설명 아님');
      }

      if (!event && explanation?.status !== 'error') {
        line('보안 기록에서 기록을 먼저 고르세요.');
        return root;
      }

      if (explanation?.status === 'idle') {
        line('AI 사건 설명 요청 전');
      } else if (explanation?.status === 'loading') {
        line('AI 사건 설명 요청 중');
      } else if (explanation?.status === 'ok') {
        const eventId = event?.id;
        const data = explanation.data;
        const evidence = event?.evidence;
        const rules = event?.rules;
        const refs = data?.evidenceIds;

        const evidenceOk = Array.isArray(evidence) &&
          evidence.length > 0 &&
          evidence.every(row =>
            typeof row?.id === 'string' && row.id.trim() &&
            typeof row?.text === 'string' && row.text.trim()
          ) &&
          new Set(evidence.map(row => row.id)).size === evidence.length;

        const refsOk = evidenceOk &&
          Array.isArray(refs) &&
          refs.length === evidence.length &&
          new Set(refs).size === refs.length &&
          refs.every(ref => evidence.some(row => row.id === ref));

        const rulesOk = Array.isArray(rules) &&
          rules.length > 0 &&
          rules.every(row =>
            typeof row?.id === 'string' && row.id.trim() &&
            typeof row?.text === 'string' && row.text.trim()
          );

        const stateNames = {
          access: ['allowed', 'denied', 'unknown'],
          session: ['active', 'revoked', 'expired', 'unknown'],
          device: ['compliant', 'noncompliant', 'unknown']
        };

        const stateOk = event?.state &&
          Object.entries(stateNames).every(([key, values]) =>
            values.includes(event.state[key])
          );

        const proposalsOk = Array.isArray(data?.proposals) &&
          Array.isArray(event?.supportedActions) &&
          data.proposals.every(proposal =>
            typeof proposal?.action === 'string' &&
            event.supportedActions.includes(proposal.action) &&
            typeof proposal?.reason === 'string' &&
            Boolean(proposal.reason.trim()) &&
            Array.isArray(proposal.evidenceIds) &&
            proposal.evidenceIds.length > 0 &&
            proposal.evidenceIds.every(ref => refs?.includes(ref))
          );
        if (data?.executed !== false ||
            data?.requiresHumanConfirmation !== true) {
          line('AI 설명 확인 불가: 조치 미실행 또는 사람 확인 조건을 검증할 수 없습니다.');
          line('기존 보안 기록은 그대로 유지됩니다.');
        } else if (
          typeof eventId !== 'string' || !eventId.trim() ||
          typeof data?.summary !== 'string' || !data.summary.trim()
        ) {
          line('AI 설명 확인 불가: 사건 ID 또는 AI 요약이 없습니다.');
        } else if (!refsOk || !rulesOk) {
          line('AI 설명 확인 불가: 인용 근거 ID가 현재 기록과 일치하지 않거나 근거·규칙 자료가 부족합니다.');
          line('확인되지 않은 근거를 만들어 표시하지 않습니다.');
        } else if (!stateOk || !proposalsOk) {
          line('AI 설명 확인 불가: 현재 상태 또는 조치 제안 자료가 유효하지 않습니다.');
          line('기존 보안 기록은 그대로 유지됩니다.');
        } else {
          root.setAttribute('data-student-explanation-event', eventId);

          line('AI 설명(참고용)');
          line(`사건 ID: ${eventId}`);
          line(`AI 요약: ${data.summary}`);

          line('인용한 근거');
          for (const ref of refs) {
            const record = evidence.find(row => row.id === ref);
            line(`${record.id} — ${record.text}`);
          }

          line('현재 규칙');
          for (const rule of rules) {
            line(`${rule.id} — ${rule.text}`);
          }

          line('확인되지 않은 현재 상태');

          const unknownStates = [
            ['access', '접속'],
            ['session', '세션'],
            ['device', '기기']
          ].filter(([key]) => event.state[key] === 'unknown');

          if (unknownStates.length === 0) {
            line('확인 불가 상태: 없음');
          } else {
            for (const [, label] of unknownStates) {
              line(`${label}: 확인 불가(unknown)`);
            }
          }

          line('AI 조치 제안');

          if (data.proposals.length === 0) {
            if (event.supportedActions.length === 0) {
              line('연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).');
            } else {
              line('AI가 제안한 조치가 없습니다.');
            }
          } else {
            for (const proposal of data.proposals) {
              line(`조치: ${proposal.action} — 이유: ${proposal.reason}`);
              line(`제안 근거 ID: ${proposal.evidenceIds.join(', ')}`);
              line('사람 확인이 필요하며 실행되지 않았습니다.');
            }
          }

          line('AI 요약은 참고 정보이며 보안 조치 실행 결과가 아닙니다.');
        }
      } else if (explanation?.status === 'error') {
        const rawCode = explanation.error?.code;
        const code = typeof rawCode === 'string' &&
          /^[A-Z][A-Z0-9_]{1,63}$/.test(rawCode)
            ? rawCode
            : 'AI_REQUEST_UNVERIFIED';

        const rawMessage = explanation.error?.message;
        const secretPattern = /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|PRIVATE KEY|(?:api[_ -]?key|authorization|password|secret|token|비밀번호|토큰)\s*[:=]\s*\S+/i;

        const message = typeof rawMessage === 'string' &&
          rawMessage.trim() &&
          rawMessage.length <= 400 &&
          !secretPattern.test(rawMessage)
            ? rawMessage
            : '오류 내용을 안전하게 확인할 수 없습니다.';

        line('AI 사건 설명 실패');
        line(`오류 코드: ${code}`);
        line(`오류 메시지: ${message}`);
        line('기존 보안 기록은 그대로 유지됩니다.');
      } else {
        line('AI 사건 설명 상태 확인 불가');
      }

      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
