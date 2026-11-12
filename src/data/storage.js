import { supabase } from "./supabaseClient";

// Drop-in replacement for the artifact's `window.storage` API, backed by a
// real Postgres table (see supabase/schema.sql) instead of the sandboxed
// key-value store. Same method signatures, same return shapes, so the rest
// of the app's data logic doesn't need to change.

async function currentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export const storage = {
  async get(key, shared = false) {
    const user_id = await currentUserId();
    const { data, error } = await supabase
      .from("app_storage")
      .select("key, value, shared")
      .eq("user_id", user_id)
      .eq("key", key)
      .eq("shared", shared)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async set(key, value, shared = false) {
    const user_id = await currentUserId();
    const { data, error } = await supabase
      .from("app_storage")
      .upsert({ user_id, key, value, shared }, { onConflict: "user_id,key,shared" })
      .select("key, value, shared")
      .single();
    if (error) throw error;
    return data;
  },

  async delete(key, shared = false) {
    const user_id = await currentUserId();
    const { error } = await supabase
      .from("app_storage")
      .delete()
      .eq("user_id", user_id)
      .eq("key", key)
      .eq("shared", shared);
    if (error) throw error;
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    const user_id = await currentUserId();
    let q = supabase.from("app_storage").select("key").eq("user_id", user_id).eq("shared", shared);
    if (prefix) q = q.like("key", `${prefix}%`);
    const { data, error } = await q;
    if (error) throw error;
    return { keys: (data || []).map((d) => d.key), prefix, shared };
  },

  /**
   * Live updates. Subscribes to Postgres change events on THIS user's rows
   * (via Supabase Realtime) and calls `handler(payload)` whenever the given
   * key changes — including writes made from another device or browser tab.
   * Returns an unsubscribe function.
   *
   * Realtime must be enabled for the app_storage table (see
   * supabase/schema.sql — it's added to the supabase_realtime publication).
   * Row Level Security still applies, so a user only ever receives events
   * for their own rows.
   */
  subscribe(key, shared = false, handler) {
    let channel = null;
    let cancelled = false;
    (async () => {
      let user_id;
      try {
        user_id = await currentUserId();
      } catch {
        return; // not signed in yet; nothing to subscribe to
      }
      if (cancelled) return;
      channel = supabase
        .channel(`app_storage:${user_id}:${key}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_storage", filter: `user_id=eq.${user_id}` },
          (payload) => {
            // The Realtime filter can only match one column, so narrow to the
            // specific key/shared slot here.
            const row = payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
            if (row && row.key === key && row.shared === shared) handler(payload);
          }
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  },
};
