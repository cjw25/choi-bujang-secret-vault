const PATTERNS = [
  {
    "name": "large_unfamiliar_destination",
    "condition": "관련 기법·수준 10 이상·확인된 전송 50MB 이상에 낯선 목적지와 100MB 이상 또는 반복/다량 파일 결합",
    "evidence": "MITRE T1041/T1048 외부 유출. https://attack.mitre.org/techniques/T1041/ https://attack.mitre.org/techniques/T1048/; 수치 임계값은 학생 정책."
  },
  {
    "name": "bulk_or_repeated_transfer",
    "condition": "관련 기법·수준 10 이상·50MB 이상에 파일 50건 이상 또는 전송 5회 이상 결합",
    "evidence": "T1041/T1048 반복 또는 다량 자료 유출 신호. 업무 시간·평소 목록을 임의 추정하지 않는다."
  },
  {
    "name": "exfiltration_review",
    "condition": "관련 기법·수준 5 이상이지만 차단 복합 근거 부족",
    "evidence": "T1041/T1048 단편적 외부 전송 또는 파일 압축 경보는 악용 확정 근거가 부족해 알림만."
  },
  {
    "name": "no_exfiltration_signal",
    "condition": "위 패턴에 해당하지 않는 정상 전송",
    "evidence": "정상 동기화·조회·저장을 주소나 기법 표시만으로 차단하지 않는다."
  }
];
// Pure offline evidence evaluation, with no fabricated baseline or office hours.
export function decide(alert){
 const rule=alert?.rule ?? {},data=alert?.data ?? {};
 const ids=Array.isArray(rule.mitre)?rule.mitre:Array.isArray(rule.mitre?.id)?rule.mitre.id:[];
 const relevant=ids.some(id=>typeof id==='string'&&['T1041','T1048'].some(t=>id===t||id.startsWith(t+'.')));
 const numeric=value=>{if(typeof value!=='number'&&!(typeof value==='string'&&/^[0-9]+$/.test(value)))return null;const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;};
 const size=numeric(data.bytes),files=numeric(data.files),count=numeric(data.count);
 const level=Number.isInteger(rule.level)?rule.level:0;
 const text=typeof rule.description==='string'?rule.description.slice(0,4096):'';
 const destination=typeof data.dstip==='string'&&data.dstip.length>0&&data.dstip.length<=45;
 const unfamiliar=['처음 보는','처음 봅니다','평소와 다른','unfamiliar','new destination'].some(s=>text.includes(s));
 const failed=['실패','외부 전송은 아직 없습니다','failed','not transferred'].some(s=>text.includes(s));
 let confidence=0.1,reason=PATTERNS[3].name;
 if(relevant&&level>=10&&destination&&!failed&&size>=50000000){
  if(unfamiliar&&(size>=100000000||files>=50||count>=5)){confidence=0.95;reason=PATTERNS[0].name;}
  else if(files>=50||count>=5){confidence=0.93;reason=PATTERNS[1].name;}
 }
 if(confidence<0.5&&relevant&&level>=5){confidence=0.65;reason=PATTERNS[2].name;}
 return {action:confidence>=0.85?'block':confidence>=0.5?'alert':'record',confidence,reason};
}
