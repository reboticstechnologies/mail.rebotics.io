const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const seed = [
  {id:1, folder:"Inbox", from:"Rebotics Team <info@rebotics.in>", to:"demo@rebotics.in", subject:"Welcome to Rebotics Mail", body:"Welcome to the Rebotics Mail demo.\n\nThis GitHub Pages interface is ready to connect to a real email backend.", date:"Today", unread:true, starred:true},
  {id:2, folder:"Inbox", from:"Project Desk <projects@rebotics.in>", to:"demo@rebotics.in", subject:"Project update", body:"Your project dashboard has a new update. Please review the latest milestones when convenient.", date:"Yesterday", unread:true, starred:false},
  {id:3, folder:"Inbox", from:"Support <support@rebotics.in>", to:"demo@rebotics.in", subject:"Support request received", body:"We received your support request and will get back to you shortly.", date:"Aug 28", unread:false, starred:false},
  {id:4, folder:"Sent", from:"demo@rebotics.in", to:"team@rebotics.in", subject:"Meeting follow-up", body:"Thank you for attending the meeting. Here are the next steps we discussed.", date:"Aug 27", unread:false, starred:false},
  {id:5, folder:"Spam", from:"Promotions <offers@example.com>", to:"demo@rebotics.in", subject:"Special offer", body:"This is a demo spam message.", date:"Aug 25", unread:false, starred:false}
];
let mails = JSON.parse(localStorage.getItem("reboticsMails") || "null") || seed;
let currentFolder = "Inbox";
let selected = new Set();
let currentMessage = null;

function save(){ localStorage.setItem("reboticsMails", JSON.stringify(mails)); }
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2200); }
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function render(){
  const q=$("#searchInput").value.trim().toLowerCase();
  let list=mails.filter(m=> currentFolder==="Starred" ? m.starred : m.folder===currentFolder);
  if(q) list=list.filter(m=>`${m.from} ${m.to} ${m.subject} ${m.body}`.toLowerCase().includes(q));
  $("#folderTitle").textContent=currentFolder;
  $("#folderSubtitle").textContent=currentFolder==="Inbox"?"Your latest messages":`Messages in ${currentFolder}`;
  $("#inboxCount").textContent=mails.filter(m=>m.folder==="Inbox"&&m.unread).length;
  $("#draftCount").textContent=mails.filter(m=>m.folder==="Drafts").length;
  $("#mailList").innerHTML=list.map(m=>`
    <div class="mail-row ${m.unread?"unread":""}" data-id="${m.id}">
      <input class="check" type="checkbox" data-check="${m.id}" ${selected.has(m.id)?"checked":""}>
      <button class="star ${m.starred?"on":""}" data-star="${m.id}" title="Star">${m.starred?"★":"☆"}</button>
      <div class="sender">${escapeHtml(m.from)}</div>
      <div class="preview"><span>${escapeHtml(m.subject||"(No subject)")}</span> — ${escapeHtml(m.body||"")}</div>
      <div class="date">${escapeHtml(m.date||"")}</div>
    </div>`).join("");
  $("#emptyState").classList.toggle("hidden",list.length>0);
  $("#mailList").classList.toggle("hidden",list.length===0);
  $("#bulkbar").classList.toggle("hidden",selected.size===0);
  $("#selectedCount").textContent=`${selected.size} selected`;
}

function openMessage(id){
  const m=mails.find(x=>x.id===id); if(!m)return;
  currentMessage=m; m.unread=false; save(); render();
  $("#messageSubject").textContent=m.subject||"(No subject)";
  $("#messageMeta").textContent=`${m.from}  •  ${m.date||""}`;
  $("#messageBody").textContent=m.body||"";
  $("#messageModal").classList.remove("hidden");
}

function openCompose(){
  $("#composeForm").reset(); $("#attachmentName").textContent="";
  $("#composeStatus").textContent="Draft"; $("#composeModal").classList.remove("hidden"); $("#toInput").focus();
}
function closeModals(){$$(".modal").forEach(x=>x.classList.add("hidden"));}

function setFolder(folder){
  currentFolder=folder; selected.clear();
  $$(".nav-item[data-folder]").forEach(b=>b.classList.toggle("active",b.dataset.folder===folder));
  $("#sidebar").classList.remove("open"); render();
}

$("#loginForm").addEventListener("submit",e=>{
  e.preventDefault(); localStorage.setItem("reboticsLoggedIn","1");
  $("#loginView").classList.add("hidden"); $("#appView").classList.remove("hidden"); render(); toast("Welcome to Rebotics Mail");
});
$("#forgotLink").addEventListener("click",e=>{e.preventDefault();toast("Connect your password-reset service here.");});
$("#togglePassword").addEventListener("click",()=>{const p=$("#loginPassword");p.type=p.type==="password"?"text":"password";});
$("#composeBtn").addEventListener("click",openCompose);
$("#refreshBtn").addEventListener("click",()=>{render();toast("Mailbox refreshed");});
$("#searchInput").addEventListener("input",render);
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#themeBtn").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("dark",document.body.classList.contains("dark"));});
$("#profileBtn").addEventListener("click",()=>openSimple("Account",`
<div class="settings-grid">
 <div class="setting-card"><strong>Signed in as</strong><span>${escapeHtml($("#loginEmail").value || "demo@rebotics.in")}</span></div>
 <button class="secondary-btn" id="logoutBtn">Sign out</button>
</div>`));
$("#contactsBtn").addEventListener("click",()=>openSimple("Contacts",`
<div class="settings-grid">
 <div class="setting-card"><strong>Rebotics Team</strong><span>info@rebotics.in</span></div>
 <div class="setting-card"><strong>Support</strong><span>support@rebotics.in</span></div>
 <div class="setting-card"><strong>Projects</strong><span>projects@rebotics.in</span></div>
</div>`));
$("#settingsBtn").addEventListener("click",()=>openSimple("Settings",`
<div class="settings-grid">
 <div class="setting-card"><strong>Webmail frontend</strong><span>Hosted by GitHub Pages.</span></div>
 <div class="setting-card"><strong>Email backend</strong><span>Connect SMTP/IMAP or an email API before production.</span></div>
 <div class="setting-card"><strong>Custom domain</strong><span>Use mail.rebotics.in with the included CNAME file.</span></div>
</div>`));

function openSimple(title,html){$("#simpleTitle").textContent=title;$("#simpleContent").innerHTML=html;$("#simpleModal").classList.remove("hidden");
 const l=$("#logoutBtn"); if(l)l.onclick=()=>{localStorage.removeItem("reboticsLoggedIn");location.reload();};
}
$$(".closeModal").forEach(b=>b.addEventListener("click",closeModals));
$$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModals();}));

$("#folderNav").addEventListener("click",e=>{const b=e.target.closest("[data-folder]");if(b)setFolder(b.dataset.folder);});
$("#mailList").addEventListener("click",e=>{
  const star=e.target.closest("[data-star]"); if(star){const m=mails.find(x=>x.id==star.dataset.star);m.starred=!m.starred;save();render();return;}
  if(e.target.matches("[data-check]")){const id=Number(e.target.dataset.check);e.target.checked?selected.add(id):selected.delete(id);$("#bulkbar").classList.toggle("hidden",selected.size===0);$("#selectedCount").textContent=`${selected.size} selected`;return;}
  const row=e.target.closest(".mail-row");if(row&&!e.target.matches("input"))openMessage(Number(row.dataset.id));
});
$("#bulkRead").addEventListener("click",()=>{mails.forEach(m=>{if(selected.has(m.id))m.unread=false});selected.clear();save();render();});
$("#bulkTrash").addEventListener("click",()=>{mails.forEach(m=>{if(selected.has(m.id))m.folder="Trash"});selected.clear();save();render();toast("Moved to Trash");});
$("#messageTrashBtn").addEventListener("click",()=>{if(currentMessage){currentMessage.folder="Trash";save();closeModals();render();toast("Message moved to Trash");}});
$("#replyBtn").addEventListener("click",()=>{const m=currentMessage;closeModals();openCompose();$("#toInput").value=(m.from.match(/<([^>]+)>/)||[])[1]||m.from;$("#subjectInput").value=`Re: ${m.subject||""}`;$("#bodyInput").value=`\n\n--- Original message ---\n${m.body||""}`;});

$("#attachmentInput").addEventListener("change",e=>{$("#attachmentName").textContent=[...e.target.files].map(f=>f.name).join(", ");});
$("#saveDraftBtn").addEventListener("click",()=>{
 const to=$("#toInput").value.trim(),subject=$("#subjectInput").value.trim(),body=$("#bodyInput").value;
 mails.unshift({id:Date.now(),folder:"Drafts",from:"demo@rebotics.in",to,subject,body,date:"Just now",unread:false,starred:false});
 save();closeModals();render();toast("Draft saved");
});
$("#composeForm").addEventListener("submit",e=>{
 e.preventDefault();
 const to=$("#toInput").value.trim(),subject=$("#subjectInput").value.trim(),body=$("#bodyInput").value;
 mails.unshift({id:Date.now(),folder:"Sent",from:"demo@rebotics.in",to,subject,body,date:"Just now",unread:false,starred:false});
 save();closeModals();render();toast("Demo message marked as sent");
});

if(localStorage.getItem("dark")==="true")document.body.classList.add("dark");
if(localStorage.getItem("reboticsLoggedIn")==="1"){$("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");}
render();
