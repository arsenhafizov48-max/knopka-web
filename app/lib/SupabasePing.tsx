"use client";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/app/lib/supabaseClient";

export function SupabasePing() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      console.log("supabase session:", data.session);
    });
  }, []);

  return null;
}
