// Preview-only stand-in for src/data/taskRepository.js.
// Returns no stored data so useAgendaState seeds its built-in demo tasks,
// and keeps "saves" purely in-memory so nothing touches Supabase.
let mem = null;
export async function loadSalt() { return "preview-salt"; }
export async function saveSalt() {}
export async function loadAgendaData() { return mem; }
export async function saveAgendaData(data) { mem = data; }
