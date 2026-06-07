"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  user_id: string | null;
  name: string;
  message: string;
  created_at: string;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("admin-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages((current) => [payload.new as Message, ...current]);
        }

        if (payload.eventType === "UPDATE") {
          setMessages((current) =>
            current.map((message) =>
              message.id === payload.new.id ? { ...message, ...(payload.new as Message) } : message
            )
          );
        }

        if (payload.eventType === "DELETE") {
          setMessages((current) => current.filter((message) => message.id !== payload.old.id));
        }
      })
      .subscribe();

    const interval = setInterval(fetchMessages, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMessages() {
    setLoading(true);
    const res = await fetch("/api/messages");
    const data = await res.json();
    setMessages(data.messages ?? []);
    setLoading(false);
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessages((m) => m.filter((msg) => msg.id !== id));
    }
  }

  const filtered = messages.filter((msg) =>
    `${msg.name} ${msg.message}`.toLowerCase().includes(query.toLowerCase())
  );

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm font-bold text-primary">Communication</p>
        <h1 className="text-3xl font-black">Customer Messages</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          View messages from customers who contacted you via the message widget.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Messages ({filtered.length})</CardTitle>
            <div className="relative sm:w-80">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-11"
                placeholder="Search messages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground text-center py-8">Loading messages...</p>}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center">
              <p className="text-sm font-semibold">No messages found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {query ? "Try adjusting your search" : "Messages will appear here when customers reach out"}
              </p>
            </div>
          )}

          {filtered.map((msg) => (
            <div
              key={msg.id}
              className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <p className="font-semibold">{msg.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(msg.created_at)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMessage(msg.id)}
                  className="h-10 w-10 p-0 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
