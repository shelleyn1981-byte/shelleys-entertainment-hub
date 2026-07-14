const data=window.ENTERTAINMENT_DATA;
const fmtDate=v=>new Intl.DateTimeFormat("en-US",{weekday:"long",month:"short",day:"numeric"}).format(new Date(v+"T12:00:00"));
const todayKey=()=>{const n=new Date(),y=n.getFullYear(),m=String(n.getMonth()+1).padStart(2,"0"),d=String(n.getDate()).padStart(2,"0");return `${y}-${m}-${d}`};

function setGreeting(){
  const h=new Date().getHours(),word=h<12?"morning":h<18?"afternoon":"evening";
  document.getElementById("greeting").textContent=`Good ${word}, Shelley`;
  document.getElementById("lastUpdated").textContent=data.lastUpdated;
}
function episodeCard(i){
  return `<article class="episode-card"><div class="card-top"><span class="badge">${i.status}</span><span class="muted">${i.time}</span></div><h3>${i.show}</h3><p>${i.episode}</p><div class="meta"><span>${i.service}</span><span>${fmtDate(i.date)}</span></div></article>`;
}
function renderTonight(){
  let items=data.episodes.filter(x=>x.date===todayKey());
  if(!items.length)items=data.episodes.filter(x=>x.date==="2026-07-12");
  document.getElementById("tonightCount").textContent=`${items.length} new`;
  document.getElementById("tonightGrid").innerHTML=items.length?items.map(episodeCard).join(""):`<div class="empty">No verified new episodes tonight.</div>`;
}
function renderWeek(){
  const items=[...data.episodes].sort((a,b)=>a.date.localeCompare(b.date));
  document.getElementById("weekList").innerHTML=items.map(i=>`<article class="schedule-row"><div class="schedule-date">${fmtDate(i.date)}</div><div><strong>${i.show}</strong><div class="muted">${i.episode} • ${i.service}</div></div><div class="schedule-time">${i.time}</div></article>`).join("");
}
function posterCard(i,r=false){
  return `<article class="poster-card" style="--card-accent:${i.accent||"#46366f"}"><div class="poster-art"></div><div class="poster-content">${r?`<div class="match">${i.match}% match</div>`:`<div class="muted">${i.service}</div>`}<h3>${i.title}</h3><p class="muted">${r?i.reason:i.status}</p></div></article>`;
}
function renderShows(filter="All"){
  const items=filter==="All"?data.shows:data.shows.filter(x=>x.service===filter);
  document.getElementById("showsGrid").innerHTML=items.map(x=>posterCard(x)).join("");
}
function renderFilters(){
  const services=["All",...new Set(data.shows.map(x=>x.service))],wrap=document.getElementById("serviceFilters");
  wrap.innerHTML=services.map((s,i)=>`<button class="filter ${i===0?"active":""}" data-service="${s}">${s}</button>`).join("");
  wrap.addEventListener("click",e=>{const b=e.target.closest(".filter");if(!b)return;wrap.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderShows(b.dataset.service)});
}
function renderRecommendations(){document.getElementById("recommendationGrid").innerHTML=data.recommendations.map(x=>posterCard(x,true)).join("")}
setGreeting();renderTonight();renderWeek();renderFilters();renderShows();renderRecommendations();