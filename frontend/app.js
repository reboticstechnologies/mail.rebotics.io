// Replace the demo/localStorage data layer in the existing app.js with this API client.
// Keep your existing UI/rendering code, but use apiRequest() for authentication and mail actions.

const API_BASE = "https://api.rebotics.in/api";
const tokenKey = "reboticsAccessToken";

function getToken(){ return localStorage.getItem(tokenKey); }
function setToken(token){ localStorage.setItem(tokenKey, token); }
function clearToken(){ localStorage.removeItem(tokenKey); }

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type":"application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function login(email, password) {
  const data = await apiRequest("/auth/login", {
    method:"POST",
    body:JSON.stringify({email,password})
  });
  setToken(data.token);
  return data.user;
}

async function register(email, password, displayName) {
  const data = await apiRequest("/auth/register", {
    method:"POST",
    body:JSON.stringify({email,password,displayName})
  });
  setToken(data.token);
  return data.user;
}

async function getCurrentUser() {
  return (await apiRequest("/auth/me")).user;
}

async function loadMessages(folder="Inbox", query="") {
  const params = new URLSearchParams({folder});
  if (query) params.set("q", query);
  return (await apiRequest(`/messages?${params}`)).messages;
}

async function getMessage(id) {
  return (await apiRequest(`/messages/${id}`)).message;
}

async function markRead(id, read=true) {
  return apiRequest(`/messages/${id}`, {
    method:"PATCH", body:JSON.stringify({read})
  });
}

async function toggleStar(id, starred) {
  return apiRequest(`/messages/${id}`, {
    method:"PATCH", body:JSON.stringify({starred})
  });
}

async function moveMessage(id, folder) {
  return apiRequest(`/messages/${id}`, {
    method:"PATCH", body:JSON.stringify({folder})
  });
}

async function saveDraft({to,cc,subject,body}) {
  return apiRequest("/messages/drafts", {
    method:"POST", body:JSON.stringify({to,cc,subject,body})
  });
}

async function sendMessage({to,cc,bcc,subject,body}) {
  return apiRequest("/messages/send", {
    method:"POST",
    body:JSON.stringify({to,cc,bcc,subject,text:body})
  });
}

/*
Integration notes for the existing UI:

1. Login:
   replace the demo login submit with:
       await login(email, password)

2. Inbox:
       const messages = await loadMessages(currentFolder, searchTerm);

3. Open message:
       const message = await getMessage(id);
       await markRead(id, true);

4. Star:
       await toggleStar(id, !message.starred);

5. Delete:
       await moveMessage(id, "Trash");

6. Compose:
       await sendMessage({to,cc,bcc,subject,body});

7. Draft:
       await saveDraft({to,cc,subject,body});

8. On startup:
       if (getToken()) await getCurrentUser();
       otherwise show the login screen.

Do not keep SMTP credentials or database credentials in this file.
*/
