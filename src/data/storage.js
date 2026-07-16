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
};
