import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
export type SupabaseClient = typeof supabaseClient;

export const STAFF_USER_ID = "721a5ad5-aebb-4c67-8d4d-c5423995b61e";
export const CLIENT_USER_ID = "e4ca431b-b0da-4683-8765-c624f8c5651a";
