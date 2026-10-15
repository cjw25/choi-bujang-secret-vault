const PATTERNS = Object.freeze([
  {
    "name": "unsigned_new_temp_service",
    "condition": {
      "signal": "새 서비스 등록 + 서명 없음 + 임시 실행 경로",
      "technique": "T1543.003"
    },
    "confidence": 0.97,
    "evidence": "MITRE T1543.003: 서명되지 않은 새 서비스가 비표준 임시 실행 파일을 가리키면 지속성 공격의 강한 신호입니다."
  },
  {
    "name": "unknown_offhours_temp_task",
    "condition": {
      "signal": "낯선 예약 작업 + 수업·업무 시간 밖 실행 + 임시 실행 경로",
      "technique": "T1053.005"
    },
    "confidence": 0.95,
    "evidence": "MITRE T1053.005: 알려지지 않은 예약 작업이 비표준 파일을 예약 실행하도록 만들면 지속성 공격 신호입니다."
  },
  {
    "name": "unlisted_startup_folder_program",
    "condition": {
      "signal": "기준 목록에 없는 시작 폴더 프로그램 추가",
      "technique": "T1547.001"
    },
    "confidence": 0.9,
    "evidence": "MITRE T1547.001: 시작 폴더에 새 프로그램을 추가하면 다음 로그인 때 자동 실행될 수 있어 지속성 신호가 됩니다."
  },
  {
    "name": "repeated_unsigned_service_registration",
    "condition": {
      "signal": "서명 없는 서비스 등록이 같은 근원에서 3회 이상 반복",
      "technique": "T1543.003"
    },
    "confidence": 0.94,
    "evidence": "MITRE T1543.003: 서명 없는 서비스를 반복 등록하는 행위는 서비스 기반 지속성 악용의 강한 단서입니다."
  },
  {
    "name": "random_named_temp_scheduled_task",
    "condition": {
      "signal": "임의 문자열 이름의 예약 작업 + 임시 실행 파일",
      "technique": "T1053.005"
    },
    "confidence": 0.94,
    "evidence": "MITRE T1053.005: 무작위 이름의 예약 작업이 임시 경로 실행 파일을 가리키면 은닉 지속성 실행을 의심할 수 있습니다."
  },
  {
    "name": "unsigned_modified_service_binary",
    "condition": {
      "signal": "서비스 실행 파일 변경 + 서명 없음",
      "technique": "T1543.003"
    },
    "confidence": 0.95,
    "evidence": "MITRE T1543.003: 기존 서비스의 실행 파일을 무서명 바이너리로 바꾸면 지속성 실행 경로 변조 신호가 됩니다."
  },
  {
    "name": "dual_startup_and_scheduled_task",
    "condition": {
      "signal": "같은 임시 파일에 시작 프로그램과 예약 작업이 함께 연결됨",
      "technique": "T1053.005 + T1547.001"
    },
    "confidence": 0.97,
    "evidence": "MITRE T1053.005·T1547.001: 같은 임시 파일을 예약 작업과 로그인 자동 실행에 함께 연결하면 복수의 지속성 근거가 됩니다."
  },
  {
    "name": "unlisted_reboot_persistent_service",
    "condition": {
      "signal": "기준 목록 외 서비스가 재시작 뒤에도 남도록 등록됨",
      "technique": "T1543.003"
    },
    "confidence": 0.96,
    "evidence": "MITRE T1543.003: 승인 목록 밖의 서비스가 재부팅 뒤에도 남도록 등록되면 서비스 기반 지속성 공격 신호입니다."
  },
  {
    "name": "unverified_persistence_artifact",
    "condition": {
      "signal": "서비스·예약 작업·시작 항목 단서는 있으나 악성 근거가 충분하지 않음",
      "technique": "T1543 + T1053 + T1547.001"
    },
    "confidence": 0.65,
    "evidence": "MITRE T1543·T1053·T1547.001: 지속성 관련 변경만 확인되고 악성성이 확정되지 않으면 자동 차단보다 추가 확인이 필요합니다."
  }
]);

function norm(a){
  if(!a||typeof a!=='object'||Array.isArray(a))return null;
  const d=a.data&&typeof a.data==='object'?a.data:{},q=a.rule&&typeof a.rule==='object'?a.rule:{};
  const m=q.mitre??a.mitre??[],ids=Array.isArray(m)?m:(typeof m?.id==='string'?[m.id]:Array.isArray(m?.id)?m.id:[]);
  return{t:a.timestamp??a.at??null,s:d.srcip??a.sourceAddress??null,u:d.srcuser??a.account??null,l:Number.isInteger(q.level??a.ruleLevel)?(q.level??a.ruleLevel):null,x:typeof(q.description??a.description)==='string'?(q.description??a.description).slice(0,1024):'',p:typeof(d.path??a.path)==='string'?(d.path??a.path).replace(/\\/gu,'/').slice(0,1024):'',n:Number(d.count??a.count??0)||0,tag:ids.some(v=>/^T(?:1543|1053|1547)(?:\.\\d{3})?$/u.test(v))};
}
function benign(x){return ['로그인했습니다.','로그아웃했습니다.','목록을 읽기만','자료실 화면이 열렸습니다.','정의 업데이트가 평소 저장소에서 끝났습니다.','운영체제 업데이트 예약이 평소 시각에 그대로입니다.','기존 수업 도구 서비스가 서명된 채로 실행 중입니다.','기존 예약 작업이 수업 자료 복사를 마쳤습니다.'].some(v=>x.includes(v))}
function temp(r){return /(?:^|\/)(?:temp|tmp)(?:\/|$)/iu.test(r.p)||/임시\s*폴더|임시\s*파일/iu.test(r.x)}
const MATCH=[['unsigned_new_temp_service',r=>/\uC11C\uBE44\uC2A4/iu.test(r.x)&&/\uC11C\uBA85\s*\uC5C6\uB294|\uC11C\uBA85\uC774?\s*\uC5C6\uC2B5\uB2C8\uB2E4|\uBB34\uC11C\uBA85/iu.test(r.x)&&/\uC0C8\s*\uC11C\uBE44\uC2A4|\uC0C8\uB85C\s*\uB4F1\uB85D|\uC2E0\uADDC\s*\uC11C\uBE44\uC2A4/iu.test(r.x)&&temp(r)],['unknown_offhours_temp_task',r=>/\uC608\uC57D\s*\uC791\uC5C5/iu.test(r.x)&&/\uCC98\uC74C\s*\uBCF4\uB294|\uB0AF\uC120|\uBBF8\uC2B9\uC778|\uC54C\uB824\uC9C0\uC9C0\s*\uC54A\uC740/iu.test(r.x)&&/\uC218\uC5C5\s*\uC2DC\uAC04\s*\uBC16|\uC5C5\uBB34\s*\uC2DC\uAC04\s*\uBC16|\uC57C\uAC04|\uBE44\uC5C5\uBB34\s*\uC2DC\uAC04/iu.test(r.x)&&temp(r)],['unlisted_startup_folder_program',r=>/\uC2DC\uC791\s*\uD3F4\uB354/iu.test(r.x)&&/\uD3C9\uC18C\s*\uBAA9\uB85D\uC5D0\s*\uC5C6\uB294|\uC2B9\uC778\s*\uBAA9\uB85D\uC5D0\s*\uC5C6\uB294|\uC54C\uB824\uC9C0\uC9C0\s*\uC54A\uC740/iu.test(r.x)&&/\uCD94\uAC00|\uB4F1\uB85D|\uC0DD\uC131/iu.test(r.x)],['repeated_unsigned_service_registration',r=>/\uC11C\uBE44\uC2A4/iu.test(r.x)&&/\uC11C\uBA85\s*\uC5C6\uB294|\uBB34\uC11C\uBA85/iu.test(r.x)&&/\uB4F1\uB85D/iu.test(r.x)&&/\uC5F0\uC18D|\uBC18\uBCF5/iu.test(r.x)&&(r.n>=3||/[3-9]\s*(?:\uBC88|\uD68C|\uAC74)/u.test(r.x))],['random_named_temp_scheduled_task',r=>/\uC608\uC57D\s*\uC791\uC5C5/iu.test(r.x)&&/\uC774\uB984.*\uC784\uC758\s*\uBB38\uC790\uC5F4|\uBB34\uC791\uC704\s*\uC774\uB984|\uC784\uC758\s*\uBB38\uC790\uC5F4.*\uC774\uB984/iu.test(r.x)&&temp(r)],['unsigned_modified_service_binary',r=>/\uC11C\uBE44\uC2A4/iu.test(r.x)&&/\uC11C\uBA85\s*\uC5C6\uB294|\uC11C\uBA85\uC774?\s*\uC5C6\uC2B5\uB2C8\uB2E4|\uBB34\uC11C\uBA85/iu.test(r.x)&&/\uC2E4\uD589\s*\uD30C\uC77C.*(?:\uBC14\uB00C|\uBC14\uB00C\uC5B4|\uBC14\uB00C\uC5C8|\uBCC0\uACBD|\uAD50\uCCB4)|\uBC14\uB010\s*\uC2E4\uD589\s*\uD30C\uC77C/iu.test(r.x)],['dual_startup_and_scheduled_task',r=>/\uC608\uC57D\s*\uC791\uC5C5/iu.test(r.x)&&/\uC2DC\uC791\s*(?:\uD504\uB85C\uADF8\uB7A8|\uD3F4\uB354|\uD56D\uBAA9)/iu.test(r.x)&&/\uAC19\uC740\s*\uC784\uC2DC\s*\uD30C\uC77C|\uB3D9\uC77C\s*\uC784\uC2DC\s*\uD30C\uC77C|\uAC19\uC740\s*\uD30C\uC77C/iu.test(r.x)&&temp(r)],['unlisted_reboot_persistent_service',r=>/\uC11C\uBE44\uC2A4/iu.test(r.x)&&/\uD3C9\uC18C\s*\uBAA9\uB85D\uC5D0\s*\uC5C6\uB294|\uC2B9\uC778\s*\uBAA9\uB85D\s*\uBC16|\uBBF8\uC2B9\uC778/iu.test(r.x)&&/\uB2E4\uC2DC\s*\uCF1C\uB3C4\s*\uB0A8|\uC7AC\uC2DC\uC791.*\uB0A8|\uC7AC\uBD80\uD305.*\uB0A8|\uC790\uB3D9\s*\uC2DC\uC791.*\uB4F1\uB85D/iu.test(r.x)]];
export function decide(a){
  const r=norm(a);
  if(!r||benign(r.x))return{action:'record',confidence:0.1,reason:r?'known_benign_system_activity':'unknown_persistence_signal'};
  if(r.l!==null&&r.l>=10&&r.t&&r.s&&r.u){for(const [name,hit] of MATCH)if(hit(r)){const p=PATTERNS.find(v=>v.name===name);return{action:'block',confidence:p?.confidence??0.9,reason:name}}}
  if(/서비스|예약\s*작업|시작\s*(?:폴더|항목|프로그램)|임시\s*폴더|실행\s*파일|서명/iu.test(r.x)&&(r.tag||(r.l!==null&&r.l>=5))){const p=PATTERNS.find(v=>v.name==='unverified_persistence_artifact');return{action:'talert'.slice(1),confidence:p?.confidence??0.65,reason:'unverified_persistence_artifact'}}
  return{action:'record',confidence:0.1,reason:'no_persistence_signal'};
}
