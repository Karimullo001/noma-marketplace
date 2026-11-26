"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RealtimeSubscription {
  table: string;
  filter?: string;
}

/**
 * Subscribes to Supabase Realtime postgres_changes and refreshes Server Components
 * cleanly on updates, with guaranteed channel cleanup on unmount.
 */
export function RealtimeRefresh({
  channelName,
  subscriptions,
  onEvent,
}: {
  channelName: string;
  subscriptions: RealtimeSubscription[];
  onEvent?: (payload: { table: string; eventType: string }) => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || subscriptions.length === 0) return;

    let channel = supabase.channel(channelName);
    for (const sub of subscriptions) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        (payload) => {
          onEvent?.({ table: sub.table, eventType: payload.eventType });
          router.refresh();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, router, subscriptions, onEvent]);

  return null;
}
