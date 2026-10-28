// ARGUS-X 개인 PC 상태: 클릭할 때만 일반 사용자 권한으로 읽는다.
// 비밀/경로/사용자 이름을 응답하지 않고 시스템 전체 요약 수치만 반환한다.
import os from 'node:os';
import {statfs} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';

const GiB=1024**3;
const observed=()=>new Date().toISOString();
const rounded=(x,digits)=>Number(x.toFixed(digits));
const resultOk=(kind,value,unit,detail)=>({kind,status:'ok',value,unit,measuredAt:observed(),detail});
const resultError=(kind,unit,reason)=>({kind,status:'error',unit,measuredAt:observed(),reason});

function cpuTime(t) {
  if (!t || typeof t!=='object') return null;
  const fields=['user','nice','sys','idle','irq'];
  if (fields.some(key=>!Number.isFinite(t[key])||t[key]<0))return null;
  return {total:fields.reduce((n,key)=>n+t[key],0),idle:t.idle};
}

async function cpu(signal){
  try {
    const before=os.cpus();
    if (!Array.isArray(before)||before.length===0) return resultError('cpu','%','CPU 시간 누적값을 읽지 못했습니다.');
    await sleep(300,undefined,{signal}); // 두 스냅샷 사이의 시스템 전체 평균 사용률
    const after=os.cpus();
    if(!Array.isArray(after)||after.length!==before.length)return resultError('cpu','%','CPU 코어 정보가 측정 중 달라졌습니다.');
    let total=0,idle=0;
    for(let i=0;i<after.length;i++){
      const a=cpuTime(before[i]?.times),b=cpuTime(after[i]?.times);
      if(!a||!b)return resultError('cpu','%','CPU 시간 자료 형식을 확인할 수 없습니다.');
      const dt=b.total-a.total,di=b.idle-a.idle;
      if(!Number.isFinite(dt)||dt<0||!Number.isFinite(di)||di<0||di>dt)return resultError('cpu','%','CPU 시간 차이가 올바르지 않습니다.');
      total+=dt;idle+=di;
    }
    if(total<=0)return resultError('cpu','%','측정 구간의 CPU 시간 차이가 없어 사용률을 계산할 수 없습니다.');
    const percent=100*(1-idle/total);
    if(!Number.isFinite(percent))return resultError('cpu','%','CPU 사용률을 계산할 수 없습니다.');
    return resultOk('cpu',rounded(Math.min(100,Math.max(0,percent)),1),'%','시스템 전체 CPU 사용률 · 약 300ms 구간 평균');
  }catch(error){
    if(signal?.aborted)throw error;
    return resultError('cpu','%','일반 권한으로 CPU 사용률을 읽지 못했습니다.');
  }
}

function memory(){
  try{
    const total=os.totalmem(),free=os.freemem();
    if(!Number.isFinite(total)||total<=0||!Number.isFinite(free)||free<0||free>total)
      return resultError('memory','GiB','시스템 메모리 통계를 확인할 수 없습니다.');
    return resultOk('memory',rounded((total-free)/GiB,2),'GiB','시스템 전체 사용 메모리 추정값(os.totalmem - os.freemem)');
  }catch{
    return resultError('memory','GiB','일반 권한으로 시스템 메모리 통계를 읽지 못했습니다.');
  }
}

async function disk(directory){
  try{
    const s=await statfs(directory);
    const block=Number(s.bsize),available=Number(s.bavail);
    if(!Number.isSafeInteger(block)||block<=0||!Number.isSafeInteger(available)||available<0)
      return resultError('disk','GiB','프로젝트 디스크 통계 형식이 올바르지 않습니다.');
    const bytes=block*available;
    if(!Number.isSafeInteger(bytes))return resultError('disk','GiB','디스크 여유 공간 크기를 안전하게 계산할 수 없습니다.');
    return resultOk('disk',rounded(bytes/GiB,2),'GiB','현재 프로젝트가 위치한 파일시스템의 일반 사용자 사용 가능 공간');
  }catch(error){
    const reason=['EACCES','EPERM'].includes(error?.code)
      ? '디스크 통계 접근 권한이 없습니다.'
      : ['ENOSYS','ENOTSUP'].includes(error?.code)
        ? '운영체제가 디스크 통계 조회를 지원하지 않습니다.'
        : '프로젝트 디스크의 남은 공간을 읽지 못했습니다.';
    return resultError('disk','GiB',reason);
  }
}

export async function readPcStatus({projectDirectory,signal}={}) {
  if(typeof projectDirectory!=='string'||!projectDirectory)return {
    source:'local-node-os',metrics:[
      resultError('cpu','%','프로젝트 경로를 확인할 수 없습니다.'),
      resultError('memory','GiB','프로젝트 경로를 확인할 수 없습니다.'),
      resultError('disk','GiB','프로젝트 경로를 확인할 수 없습니다.')
    ]
  };
  const values=await Promise.all([cpu(signal),Promise.resolve(memory()),disk(projectDirectory)]);
  if(signal?.aborted)throw Object.assign(new Error('REQUEST_CANCELLED'),{code:'REQUEST_CANCELLED'});
  return {source:'local-node-os',metrics:values};
}
