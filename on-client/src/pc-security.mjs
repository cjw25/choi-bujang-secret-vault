// ARGUS-X 읽기 전용 Windows PC 보안/네트워크 진단. 관리자 권한 요청·설정 변경·로그 원문 전송 없음.
import {execFile} from 'node:child_process';

const SOURCE='windows-powershell-readonly';
const KINDS=['network','firewall','system','application'];
const stamp=()=>new Date().toISOString();
const oneLine=(value,limit=140)=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,limit):'';
const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const failure=(kind,code,checkedAt=stamp())=>({kind,status:'error',source:SOURCE,checkedAt,errorCode:code});
const allowedCode=new Set(['ACCESS_DENIED','COMMAND_UNAVAILABLE','QUERY_FAILED','QUERY_LIMIT','PROCESS_TIMEOUT','POWERSHELL_UNAVAILABLE','PROCESS_FAILED','INVALID_OUTPUT','WINDOWS_ONLY','CANCELLED']);

const psHeader = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
`;
const psFooter = `
} catch {
  $identifier = [string]$_.FullyQualifiedErrorId
  $message = [string]$_.Exception.Message
  $code = 'QUERY_FAILED'
  if ($identifier -match 'UnauthorizedAccess|AccessDenied|PermissionDenied|SecurityException' -or
      $message -match 'Access is denied|Access denied|접근이 거부|권한이 없') { $code = 'ACCESS_DENIED' }
  elseif ($identifier -match 'CommandNotFound' -or $_.Exception -is [System.Management.Automation.CommandNotFoundException]) { $code = 'COMMAND_UNAVAILABLE' }
  elseif ($message -match 'EVENT_LIMIT_EXCEEDED') { $code = 'QUERY_LIMIT' }
  [pscustomobject]@{status='error';errorCode=$code;checkedAt=(Get-Date).ToUniversalTime().ToString('o')} |
    ConvertTo-Json -Compress -Depth 6
}
`;

const commands=Object.freeze({
  network:`
  $adapters = @(Get-NetIPConfiguration -ErrorAction Stop |
    Where-Object { $_.NetAdapter -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 13)
  $rows = @($adapters | Select-Object -First 12 | ForEach-Object {
    $item = $_
    [pscustomobject]@{
      name = [string]$item.InterfaceAlias
      ipv4 = @($item.IPv4Address | ForEach-Object { [string]$_.IPAddress } | Where-Object { $_ })
      ipv6 = @($item.IPv6Address | ForEach-Object { [string]$_.IPAddress } | Where-Object { $_ })
      gateway = @($item.IPv4DefaultGateway | ForEach-Object { [string]$_.NextHop } | Where-Object { $_ })
      dns = @($item.DNSServer.ServerAddresses | ForEach-Object { [string]$_ } | Where-Object { $_ })
    }
  })
  [pscustomobject]@{ status='ok';checkedAt=(Get-Date).ToUniversalTime().ToString('o');
    adapters=$rows;truncated=($adapters.Count -gt 12) } | ConvertTo-Json -Compress -Depth 8
`,
  firewall:`
  $profiles = @(Get-NetFirewallProfile -PolicyStore ActiveStore -ErrorAction Stop |
    ForEach-Object {
      [pscustomobject]@{
        name=[string]$_.Name
        enabled=if ($null -eq $_.Enabled) { $null } else { [bool]$_.Enabled }
        inbound=[string]$_.DefaultInboundAction
        outbound=[string]$_.DefaultOutboundAction
      }
    })
  if ($profiles.Count -eq 0) { throw 'FIREWALL_PROFILE_EMPTY' }
  [pscustomobject]@{status='ok';checkedAt=(Get-Date).ToUniversalTime().ToString('o');profiles=$profiles} |
    ConvertTo-Json -Compress -Depth 6
`,
  system:`
  $end = Get-Date
  $start = $end.AddHours(-24)
  $counts = @{error=0;warning=0}
  try {
    Get-WinEvent -FilterHashtable @{LogName='System';Level=@(2,3);StartTime=$start;EndTime=$end} -ErrorAction Stop |
      ForEach-Object {
        if ($_.Level -eq 2) { $counts.error++ }
        elseif ($_.Level -eq 3) { $counts.warning++ }
        if (($counts.error + $counts.warning) -ge 20000) { throw 'EVENT_LIMIT_EXCEEDED' }
      }
  } catch {
    if ([string]$_.FullyQualifiedErrorId -notmatch 'NoMatchingEventsFound') { throw }
  }
  [pscustomobject]@{status='ok';checkedAt=(Get-Date).ToUniversalTime().ToString('o');
    windowStart=$start.ToUniversalTime().ToString('o');windowEnd=$end.ToUniversalTime().ToString('o');
    warning=$counts.warning;error=$counts.error} | ConvertTo-Json -Compress -Depth 6
`,
  application:`
  $end = Get-Date
  $start = $end.AddHours(-24)
  $counts = @{error=0;warning=0}
  try {
    Get-WinEvent -FilterHashtable @{LogName='Application';Level=@(2,3);StartTime=$start;EndTime=$end} -ErrorAction Stop |
      ForEach-Object {
        if ($_.Level -eq 2) { $counts.error++ }
        elseif ($_.Level -eq 3) { $counts.warning++ }
        if (($counts.error + $counts.warning) -ge 20000) { throw 'EVENT_LIMIT_EXCEEDED' }
      }
  } catch {
    if ([string]$_.FullyQualifiedErrorId -notmatch 'NoMatchingEventsFound') { throw }
  }
  [pscustomobject]@{status='ok';checkedAt=(Get-Date).ToUniversalTime().ToString('o');
    windowStart=$start.ToUniversalTime().ToString('o');windowEnd=$end.ToUniversalTime().ToString('o');
    warning=$counts.warning;error=$counts.error} | ConvertTo-Json -Compress -Depth 6
`
});

const stringList=(v,max=12)=>Array.isArray(v)?v.map(x=>oneLine(x,100)).filter(Boolean).slice(0,max):[];
const boundedCount=v=>Number.isSafeInteger(v)&&v>=0&&v<20000?v:null;
function normalize(kind,data){
  if(!data||!validTime(data.checkedAt))return failure(kind,'INVALID_OUTPUT');
  if(data.status==='error')return failure(kind,allowedCode.has(data.errorCode)?data.errorCode:'QUERY_FAILED',data.checkedAt);
  if(data.status!=='ok')return failure(kind,'INVALID_OUTPUT');
  const base={kind,status:'ok',source:SOURCE,checkedAt:data.checkedAt};
  if(kind==='network'){
    if(!Array.isArray(data.adapters)||typeof data.truncated!=='boolean'||data.adapters.length>12)
      return failure(kind,'INVALID_OUTPUT',data.checkedAt);
    const adapters=[];
    for(const row of data.adapters){
      if(!row||typeof row.name!=='string')return failure(kind,'INVALID_OUTPUT',data.checkedAt);
      adapters.push({name:oneLine(row.name,90)||'이름 확인 불가',
        ipv4:stringList(row.ipv4),ipv6:stringList(row.ipv6),
        gateway:stringList(row.gateway),dns:stringList(row.dns)});
    }
    return {...base,unit:'개',data:{adapters,truncated:data.truncated}};
  }
  if(kind==='firewall'){
    if(!Array.isArray(data.profiles)||data.profiles.length<1||data.profiles.length>8)
      return failure(kind,'INVALID_OUTPUT',data.checkedAt);
    const profiles=data.profiles.map(row=>({
      name:oneLine(row?.name,40),
      enabled:typeof row?.enabled==='boolean'?row.enabled:null,
      inbound:oneLine(row?.inbound,40),
      outbound:oneLine(row?.outbound,40)
    }));
    if(profiles.some(p=>!['Domain','Private','Public'].includes(p.name)))
      return failure(kind,'INVALID_OUTPUT',data.checkedAt);
    return {...base,unit:'개',data:{profiles}};
  }
  if(boundedCount(data.warning)===null||boundedCount(data.error)===null
      ||!validTime(data.windowStart)||!validTime(data.windowEnd)
      ||Date.parse(data.windowStart)>Date.parse(data.windowEnd))
    return failure(kind,'INVALID_OUTPUT',data.checkedAt);
  return {...base,unit:'건',data:{warning:data.warning,error:data.error,
    windowStart:data.windowStart,windowEnd:data.windowEnd}};
}

function execute(kind,signal){
  return new Promise(resolve=>{
    const command=Buffer.from(psHeader+commands[kind]+psFooter,'utf16le').toString('base64');
    execFile('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',command],
      {windowsHide:true,timeout:7000,maxBuffer:128*1024,signal},(error,stdout)=>{
        if(error){
          const code=signal?.aborted?'CANCELLED':
            error.code==='ENOENT'?'POWERSHELL_UNAVAILABLE':
            error.killed||error.code==='ETIMEDOUT'?'PROCESS_TIMEOUT':'PROCESS_FAILED';
          resolve(failure(kind,code));return;
        }
        try{
          const parsed=JSON.parse(String(stdout).replace(/^\uFEFF/,'').trim());
          resolve(normalize(kind,parsed));
        }catch{resolve(failure(kind,'INVALID_OUTPUT'))}
      });
  });
}

export async function readPcSecurity({signal}={}){
  if(process.platform!=='win32')return {source:SOURCE,items:KINDS.map(kind=>failure(kind,'WINDOWS_ONLY'))};
  const items=await Promise.all(KINDS.map(kind=>execute(kind,signal)));
  return {source:SOURCE,items};
}
