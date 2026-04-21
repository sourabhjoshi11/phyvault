import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const createBrowserClient = () => createClientComponentClient();

export const supabase = createBrowserClient();
