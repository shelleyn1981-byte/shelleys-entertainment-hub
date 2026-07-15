const CONFIG=window.ENTERTAINMENT_CONFIG||{};
let DATA=window.FALLBACK_ENTERTAINMENT_DATA;
let calendarCursor=new Date();
let selectedDate=null;

const qs=s=>document.querySelector(s);
const qsa=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,"0");
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseLocal=v=>new Date(`${v}T12:00:00`);
const fmtDate=v=>new Intl.DateTimeFormat("en-US",{weekday:"long",month:"short",day:"numeric"}).format(parseLocal(v));
const fmtMonth=d=>new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(d);
const unique=a=>[...new Set(a)];
const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function loadData(){
  const endpoint=(CONFIG.DATA_ENDPOINT||"").trim();
  if(endpoint){
    try{
      const response=await fetch(`${endpoint}${endpoint.includes("?")?"&":"?"}t=${Date.now()}`,{cache:"no-store"});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const incoming=await response.json();
      if(!incoming || !Array.isArray(incoming.episodes))throw new Error("Invalid data response");
      DATA={...window.FALLBACK_ENTERTAINMENT_DATA,...incoming,source:"Google Sheet"};
    }catch(error){
      console.warn("Using fallback data:",error);
      DATA={...window.FALLBACK_ENTERTAINMENT_DATA,source:"Starter data (live connection unavailable)"};
    }
  }
  renderAll();
}

function getTodayKey(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:CONFIG.TIME_ZONE||"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${o.year}-${o.month}-${o.day}`;
}

function nextEpisodeFor(show){
  const today=getTodayKey();
  return DATA.episodes.filter(e=>e.show===show && e.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
}

function getSpotlight(){
  const today=getTodayKey();
  return DATA.episodes.find(e=>e.date===today) || DATA.episodes.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0] || DATA.episodes[0];
}

function showInfo(title){
  return DATA.shows.find(s=>s.title===title) || DATA.recommendations.find(s=>s.title===title) || DATA.seasonal?.find(s=>s.title===title) || {title,service:"",accent:"#5a407e",description:""};
}

function renderSpotlight(){
  const e=getSpotlight();
  if(!e){qs("#spotlight").innerHTML=`<div class="hero-copy-wrap"><p class="eyebrow">YOUR PERSONAL STREAMING GUIDE</p><h1>Good evening, Shelley</h1><p class="hero-description">No upcoming episodes are currently loaded.</p></div>`;return}
  const s=showInfo(e.show);
  const target=parseLocal(e.date);
  const days=Math.max(0,Math.ceil((target-new Date())/86400000));
  qs("#spotlight").style.setProperty("--hero-accent",s.accent||"#6044be");
  qs("#spotlight").innerHTML=`
    <div class="hero-copy-wrap">
      <p class="eyebrow">${e.date===getTodayKey()?"TONIGHT'S SPOTLIGHT":"COMING SOON"}</p>
      <h1>${escapeHTML(e.show)}</h1>
      <p class="hero-description">${escapeHTML(s.description||e.episode||"A new episode is coming soon.")}</p>
      <div class="hero-meta">
        <span class="meta-chip">${escapeHTML(e.service)}</span>
        <span class="meta-chip">${escapeHTML(fmtDate(e.date))}</span>
        <span class="meta-chip">${escapeHTML(e.time||"Anytime")}</span>
      </div>
      <div class="hero-actions">
        <button class="button primary" type="button" data-open-show="${escapeHTML(e.show)}">View details</button>
        <a class="button secondary" href="#calendar">Open calendar</a>
      </div>
    </div>
    <div class="countdown">
      <span class="muted">Next episode</span>
      <strong>${days===0?"Tonight":days===1?"Tomorrow":`${days} days`}</strong>
      <span>${escapeHTML(e.episode||e.status||"New episode")}</span>
    </div>`;
}

function episodeCard(e){
  return `<article class="episode-card" data-open-show="${escapeHTML(e.show)}">
    <div class="card-top"><span class="badge">${escapeHTML(e.status||"New Episode")}</span><span class="muted">${escapeHTML(e.time||"Anytime")}</span></div>
    <h3>${escapeHTML(e.show)}</h3><p>${escapeHTML(e.episode||"New Episode")}</p>
    <div class="meta"><span>${escapeHTML(e.service||"")}</span><span>${escapeHTML(fmtDate(e.date))}</span></div>
  </article>`;
}

function renderTonight(){
  const today=getTodayKey(),items=DATA.episodes.filter(e=>e.date===today);
  qs("#tonightCount").textContent=`${items.length} new`;
  qs("#tonightGrid").innerHTML=items.length?items.map(episodeCard).join(""):`<div class="empty">No verified new episodes tonight.</div>`;
}

function renderWeek(){
  const start=parseLocal(getTodayKey()),end=new Date(start);end.setDate(end.getDate()+6);
  const items=DATA.episodes.filter(e=>{const d=parseLocal(e.date);return d>=start&&d<=end}).sort((a,b)=>a.date.localeCompare(b.date));
  qs("#weekList").innerHTML=items.length?items.map(e=>`
    <article class="schedule-row" data-open-show="${escapeHTML(e.show)}">
      <div class="schedule-date">${escapeHTML(fmtDate(e.date))}</div>
      <div><strong>${escapeHTML(e.show)}</strong><div class="muted">${escapeHTML(e.episode||"New Episode")} • ${escapeHTML(e.service||"")}</div></div>
      <div class="schedule-time">${escapeHTML(e.time||"Anytime")}</div>
    </article>`).join(""):`<div class="empty">No verified episodes in the next seven days.</div>`;
}

function posterCard(item,recommendation=false){
  const rating=Number(localStorage.getItem(`rating:${item.title}`)||0);
  const next=nextEpisodeFor(item.title);
  return `<article class="poster-card" style="--card-accent:${item.accent||"#46366f"}" data-open-show="${escapeHTML(item.title)}">
    <div class="poster-art"></div><div class="poster-content">
      ${recommendation?`<div class="match">${item.match||95}% match</div>`:`<div class="muted">${escapeHTML(item.service||"")}</div>`}
      <h3>${escapeHTML(item.title)}</h3>
      <p class="muted">${escapeHTML(recommendation?(item.reason||"Recommended for you"):(next?`${fmtDate(next.date)} • ${next.time||"Anytime"}`:(item.status||"Tracked")))}</p>
      <div class="poster-actions">
        <button class="small-button" data-action="favorite" data-title="${escapeHTML(item.title)}">${isFavorite(item.title)?"♥ Saved":"♡ Save"}</button>
        ${rating?`<span class="small-button">★ ${rating}/5</span>`:""}
      </div>
    </div>
  </article>`;
}

function isFavorite(title){return JSON.parse(localStorage.getItem("favorites")||"[]").includes(title)}
function toggleFavorite(title){
  let favorites=JSON.parse(localStorage.getItem("favorites")||"[]");
  favorites=favorites.includes(title)?favorites.filter(x=>x!==title):[...favorites,title];
  localStorage.setItem("favorites",JSON.stringify(favorites));renderShows(currentFilter());renderContinue();
}
function currentFilter(){return qs(".filter.active")?.dataset.service||"All"}

function renderFilters(){
  const services=["All",...unique(DATA.shows.map(s=>s.service).filter(Boolean))];
  qs("#serviceFilters").innerHTML=services.map((s,i)=>`<button class="filter ${i===0?"active":""}" data-service="${escapeHTML(s)}">${escapeHTML(s)}</button>`).join("");
}
function renderShows(filter="All"){
  const items=filter==="All"?DATA.shows:DATA.shows.filter(s=>s.service===filter);
  qs("#showsGrid").innerHTML=items.length?items.map(x=>posterCard(x)).join(""):`<div class="empty">No shows in this service yet.</div>`;
}
function renderContinue(){
  const favorites=JSON.parse(localStorage.getItem("favorites")||"[]");
  const items=DATA.shows.filter(s=>favorites.includes(s.title)||s.status==="Watching");
  qs("#continueGrid").innerHTML=items.length?items.map(x=>posterCard(x)).join(""):`<div class="empty">Save a show or mark it as watching to see it here.</div>`;
}
function renderRecommendations(){qs("#recommendationGrid").innerHTML=DATA.recommendations.map(x=>posterCard(x,true)).join("")}
function renderSeasonal(){
  const month=new Date().getMonth();
  const title=month===9?"Halloween After Dark":month===10||month===11?"Holiday Watchlist":"Summer Nights";
  qs("#seasonalTitle").textContent=title;
  qs("#seasonalCopy").textContent=month===9?"Witches, mysteries, and supernatural favorites.":month===10||month===11?"Cozy movies, specials, and festive favorites.":"Drama, romance, and mysteries for a quiet night in.";
  qs("#seasonalGrid").innerHTML=(DATA.seasonal||[]).map(x=>posterCard(x,true)).join("");
}

function renderStats(){
  const today=getTodayKey(),start=parseLocal(today),end=new Date(start);end.setDate(end.getDate()+6);
  qs("#statTonight").textContent=DATA.episodes.filter(e=>e.date===today).length;
  qs("#statWeek").textContent=DATA.episodes.filter(e=>{const d=parseLocal(e.date);return d>=start&&d<=end}).length;
  qs("#statTracked").textContent=DATA.shows.length;
  qs("#statServices").textContent=unique(DATA.shows.map(s=>s.service).filter(Boolean)).length;
}

function episodesForDate(key){return DATA.episodes.filter(e=>e.date===key).sort((a,b)=>(a.time||"").localeCompare(b.time||""))}
function renderCalendar(){
  qs("#calendarTitle").textContent=fmtMonth(calendarCursor);
  const first=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1);
  const start=new Date(first);start.setDate(start.getDate()-first.getDay());
  const days=[];
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);days.push(d)}
  qs("#calendarGrid").innerHTML=days.map(d=>{
    const key=dateKey(d),items=episodesForDate(key),muted=d.getMonth()!==calendarCursor.getMonth();
    return `<button class="calendar-day ${muted?"muted-day":""} ${selectedDate===key?"selected":""}" data-date="${key}" type="button">
      <span class="calendar-number">${d.getDate()}</span>
      ${items.length?`<span class="calendar-dot"></span><span class="calendar-count">${items.length} new</span>`:""}
    </button>`;
  }).join("");
  if(!selectedDate){
    const today=getTodayKey();
    if(today.startsWith(`${calendarCursor.getFullYear()}-${pad(calendarCursor.getMonth()+1)}`))selectedDate=today;
  }
  renderDayAgenda();
}
function renderDayAgenda() {
  const items = selectedDate
    ? episodesForDate(selectedDate)
    : [];

  if (!selectedDate) {
    qs("#dayAgenda").innerHTML = "";
    return;
  }

  const agendaItems = items.length
    ? items.map(e => `
        <article
          class="schedule-row"
          data-open-show="${escapeHTML(e.show)}"
        >
          <div class="schedule-time">
            ${escapeHTML(e.time || "Anytime")}
          </div>

          <div>
            <strong>${escapeHTML(e.show)}</strong>

            <div class="muted">
              ${escapeHTML(e.episode || "New Episode")}
              •
              ${escapeHTML(e.service || "")}
            </div>
          </div>

          <span class="badge">
            ${escapeHTML(e.status || "New")}
          </span>
        </article>
      `).join("")
    : `<div class="empty">
         No new episodes scheduled for this day.
       </div>`;

  qs("#dayAgenda").innerHTML = `
    <h3>${fmtDate(selectedDate)}</h3>
    ${agendaItems}
  `;
}

function openDialog(title){
  const item=showInfo(title),next=nextEpisodeFor(title),rating=Number(localStorage.getItem(`rating:${title}`)||0);
  qs("#dialogContent").innerHTML=`
    <div class="dialog-hero" style="--dialog-accent:${item.accent||"#574179"}"><div><p class="eyebrow">${escapeHTML(item.service||"MY SHOW")}</p><h2>${escapeHTML(title)}</h2></div></div>
    <div class="dialog-body">
      <p>${escapeHTML(item.description||item.reason||"A title in Shelley's entertainment guide.")}</p>
      <p class="muted">${next?`Next: ${fmtDate(next.date)} at ${next.time||"Anytime"} • ${next.episode||"New Episode"}`:"No future episode currently listed."}</p>
      <h3>Your rating</h3>
      <div class="rating-stars">${[1,2,3,4,5].map(n=>`<button class="star ${n<=rating?"active":""}" type="button" data-rate="${n}" data-title="${escapeHTML(title)}">★</button>`).join("")}</div>
      <button class="button secondary" type="button" data-action="favorite" data-title="${escapeHTML(title)}">${isFavorite(title)?"Remove from saved":"Save to my list"}</button>
    </div>`;
  qs("#showDialog").showModal();
}

function bindEvents(){
  document.addEventListener("click",e=>{
    const open=e.target.closest("[data-open-show]");
    if(open){openDialog(open.dataset.openShow);return}
    const favorite=e.target.closest('[data-action="favorite"]');
    if(favorite){e.stopPropagation();toggleFavorite(favorite.dataset.title);if(qs("#showDialog").open)openDialog(favorite.dataset.title);return}
    const star=e.target.closest("[data-rate]");
    if(star){localStorage.setItem(`rating:${star.dataset.title}`,star.dataset.rate);openDialog(star.dataset.title);renderShows(currentFilter());return}
    const filter=e.target.closest(".filter");
    if(filter){qsa(".filter").forEach(x=>x.classList.remove("active"));filter.classList.add("active");renderShows(filter.dataset.service);return}
    const day=e.target.closest(".calendar-day");
    if(day){selectedDate=day.dataset.date;renderCalendar();return}
  });
  qs("#closeDialog").addEventListener("click",()=>qs("#showDialog").close());
  qs("#showDialog").addEventListener("click",e=>{if(e.target===qs("#showDialog"))qs("#showDialog").close()});
  qs("#prevMonth").addEventListener("click",()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);selectedDate=null;renderCalendar()});
  qs("#nextMonth").addEventListener("click",()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);selectedDate=null;renderCalendar()});
  qs("#syncButton").addEventListener("click",loadData);
  qs("#seasonalButton").addEventListener("click",()=>qs("#seasonalGrid").classList.toggle("hidden"));
}

function renderAll(){
  calendarCursor=parseLocal(getTodayKey());
  renderSpotlight();renderStats();renderTonight();renderWeek();renderFilters();renderShows();renderContinue();
  renderRecommendations();renderSeasonal();renderCalendar();
  const updated=DATA.lastUpdated?new Date(DATA.lastUpdated).toLocaleString():"Unknown";
  qs("#dataStatus").textContent=`Data source: ${DATA.source||"Unknown"} • Updated: ${updated}`;
}

bindEvents();
loadData();
if(CONFIG.AUTO_REFRESH_MINUTES>0)setInterval(loadData,CONFIG.AUTO_REFRESH_MINUTES*60000);
