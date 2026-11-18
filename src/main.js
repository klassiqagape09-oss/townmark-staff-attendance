import { supabase } from "./supabase.js";
import "./style.css";

const app = document.querySelector("#app");
const lagos = value => value ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value)) : "—";
const todayLagos = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function shell(body) {
  app.innerHTML = `<header><div class="brand"><span class="mark">T</span><div><b>TOWNMARK</b><small>ESTATE LIMITED</small></div></div><span class="portal-label">STAFF PORTAL</span></header><main>${body}</main><footer>Townmark Estate Limited · Staff Attendance</footer>`;
}
function setupError() {
  shell('<section class="card"><h1>Portal setup required</h1><p>Add your Supabase project URL and publishable key in Vercel environment variables, then redeploy.</p><p>See <code>.env.example</code> in the repository.</p></section>');
}
function login() {
  shell(`<section class="login-wrap"><div class="intro"><span class="eyebrow">WELCOME BACK</span><h1>Staff Attendance</h1><p>Sign in to record your daily attendance and view your work history.</p><div class="time-note">Official resumption time <strong>8:30 AM</strong></div></div><form id="login-form" class="card form-card"><h2>Sign in</h2><p class="muted">Use your company email address.</p><label>Email address<input name="email" type="email" placeholder="name@townmark.com" required></label><label>Password<input name="password" type="password" placeholder="Enter password" required></label><button>Sign in to portal</button><div id="notice" class="notice"></div></form></section>`);
  document.querySelector("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget), button = e.currentTarget.querySelector("button");
    button.disabled = true; button.textContent = "Signing in...";
    const { error } = await supabase.auth.signInWithPassword({ email: data.get("email"), password: data.get("password") });
    if (error) { document.querySelector("#notice").textContent = error.message; button.disabled = false; button.textContent = "Sign in to portal"; }
    else await render();
  });
}
async function logout() { await supabase.auth.signOut(); await render(); }
async function getProfile(user) {
  const { data, error } = await supabase.from("profiles").select("id,employee_id,full_name,email,department,role,is_active").eq("id", user.id).single();
  if (error) throw error;
  if (!data.is_active) throw new Error("Your staff account is inactive. Please contact the administrator.");
  return data;
}
async function staffPage(profile) {
  const today = todayLagos();
  const [{ data: todayRows, error: e1 }, { data: history, error: e2 }] = await Promise.all([
    supabase.from("attendance").select("id,attendance_date,clock_in,clock_out").eq("staff_id", profile.id).eq("attendance_date", today).limit(1),
    supabase.from("attendance").select("attendance_date,clock_in,clock_out").eq("staff_id", profile.id).order("attendance_date", { ascending: false }).limit(10)
  ]);
  if (e1 || e2) throw e1 || e2;
  const row = todayRows?.[0];
  shell(`<section class="welcome"><div><span class="eyebrow">STAFF DASHBOARD</span><h1>Hello, ${esc(profile.full_name)}</h1><p>${esc(profile.employee_id)} · ${esc(profile.department || "Team member")}</p></div><button class="secondary" id="logout">Sign out</button></section>
  <section class="stats"><article class="stat"><span>Today's date</span><strong>${new Intl.DateTimeFormat("en-NG",{dateStyle:"full",timeZone:"Africa/Lagos"}).format(new Date())}</strong></article><article class="stat"><span>Official resumption</span><strong>8:30 AM</strong></article></section>
  <section class="card attendance-card"><div><span class="eyebrow">TODAY'S ATTENDANCE</span><h2>${row ? (row.clock_out ? "Attendance completed" : "You are checked in") : "You have not checked in"}</h2><p class="muted">Clock-in: <b>${row ? lagos(row.clock_in) : "Not recorded"}</b></p><p class="muted">Clock-out: <b>${row?.clock_out ? lagos(row.clock_out) : "Not recorded"}</b></p></div><div class="actions">${!row ? '<button id="clock-in">Clock in</button>' : !row.clock_out ? '<button id="clock-out">Clock out</button>' : '<span class="completed">Completed for today</span>'}</div><div id="notice" class="notice"></div></section>
  <section class="card"><div class="section-heading"><div><span class="eyebrow">YOUR RECORD</span><h2>Recent attendance</h2></div></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Clock in</th><th>Clock out</th></tr></thead><tbody>${(history || []).map(x => `<tr><td>${esc(x.attendance_date)}</td><td>${lagos(x.clock_in)}</td><td>${lagos(x.clock_out)}</td></tr>`).join("") || '<tr><td colspan="3">No attendance records yet.</td></tr>'}</tbody></table></div></section>`);
  document.querySelector("#logout").onclick = logout;
  const action = document.querySelector("#clock-in") || document.querySelector("#clock-out");
  if (action) action.onclick = async () => {
    const isIn = action.id === "clock-in"; action.disabled = true; action.textContent = "Please wait...";
    const { error } = await supabase.rpc(isIn ? "clock_in_now" : "clock_out_now");
    if (error) { document.querySelector("#notice").textContent = error.message; action.disabled = false; action.textContent = isIn ? "Clock in" : "Clock out"; }
    else await render();
  };
}
function secondsInLagos(value) {
  const parts = new Intl.DateTimeFormat("en-GB", {timeZone:"Africa/Lagos",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));
  const get = type => Number(parts.find(p => p.type === type)?.value || 0);
  return get("hour") * 3600 + get("minute") * 60 + get("second");
}
async function adminPage(profile) {
  const [{ data: people, error: pErr }, { data: records, error: aErr }] = await Promise.all([
    supabase.from("profiles").select("id,employee_id,full_name,email,department,is_active").order("full_name"),
    supabase.from("attendance").select("id,attendance_date,clock_in,clock_out,profiles(full_name,employee_id)").order("clock_in", { ascending: false }).limit(100)
  ]);
  if (pErr || aErr) throw pErr || aErr;
  const today = todayLagos(), todayRows = (records || []).filter(r => r.attendance_date === today);
  const active = (people || []).filter(p => p.is_active).length;
  const late = todayRows.filter(r => secondsInLagos(r.clock_in) > (8 * 3600 + 30 * 60)).length;
  shell(`<section class="welcome"><div><span class="eyebrow">ADMIN DASHBOARD</span><h1>Good day, ${esc(profile.full_name)}</h1><p>Manage staff attendance and review daily records.</p></div><button class="secondary" id="logout">Sign out</button></section>
  <section class="stats"><article class="stat"><span>Active staff</span><strong>${active}</strong></article><article class="stat"><span>Present today</span><strong>${todayRows.length}</strong></article><article class="stat"><span>Late today</span><strong>${late}</strong></article></section>
  <section class="card"><div class="section-heading"><div><span class="eyebrow">TEAM DIRECTORY</span><h2>Staff members</h2></div></div><div class="table-wrap"><table><thead><tr><th>Employee ID</th><th>Name</th><th>Email</th><th>Department</th><th>Status</th></tr></thead><tbody>${(people || []).map(p => `<tr><td>${esc(p.employee_id)}</td><td>${esc(p.full_name)}</td><td>${esc(p.email)}</td><td>${esc(p.department || "—")}</td><td><span class="pill ${p.is_active ? "good" : "bad"}">${p.is_active ? "Active" : "Inactive"}</span></td></tr>`).join("") || '<tr><td colspan="5">No staff profiles found.</td></tr>'}</tbody></table></div></section>
  <section class="card"><div class="section-heading"><div><span class="eyebrow">ATTENDANCE LOG</span><h2>Latest records</h2></div></div><div class="table-wrap"><table><thead><tr><th>Staff</th><th>Employee ID</th><th>Date</th><th>Clock in</th><th>Clock out</th><th>Status</th></tr></thead><tbody>${(records || []).map(r => { const isLate = secondsInLagos(r.clock_in) > (8*3600+30*60); return `<tr><td>${esc(r.profiles?.full_name || "—")}</td><td>${esc(r.profiles?.employee_id || "—")}</td><td>${esc(r.attendance_date)}</td><td>${lagos(r.clock_in)}</td><td>${lagos(r.clock_out)}</td><td><span class="pill ${isLate ? "bad" : "good"}">${isLate ? "Late" : "On time"}</span></td></tr>`; }).join("") || '<tr><td colspan="6">No attendance records yet.</td></tr>'}</tbody></table></div></section>`);
  document.querySelector("#logout").onclick = logout;
}
async function render() {
  if (!supabase) return setupError();
  shell('<section class="card"><p>Loading your portal...</p></section>');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return login();
  try {
    const profile = await getProfile(session.user);
    if (profile.role === "admin") await adminPage(profile); else await staffPage(profile);
  } catch (error) {
    shell(`<section class="card"><h2>Unable to load your account</h2><p>${esc(error.message)}</p><button id="logout">Sign out</button></section>`);
    document.querySelector("#logout").onclick = logout;
  }
}
if (supabase) supabase.auth.onAuthStateChange(() => setTimeout(render, 0));
render();