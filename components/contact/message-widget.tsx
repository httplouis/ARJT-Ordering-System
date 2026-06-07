"use client";

import { useEffect, useState } from "react";
import { createClient, clearSupabaseSession } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, X } from "lucide-react";
import { useCart } from "@/lib/store/cart";

type Message = {
  id: string;
  user_id: string | null;
  name: string;
  message: string;
  created_at: string;
};

export default function MessageWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const drawerOpen = useCart((s) => s.drawerOpen);

  useEffect(() => {
    if (!open) return;

    fetchMessages();
    fillUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fillUserInfo() {
    if (!supabase) return;
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (error || !user) {
      await clearSupabaseSession(supabase);
      return;
    }

    setEmail(user.email ?? "");
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      await clearSupabaseSession(supabase);
      return;
    }

    setName(profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "");
  }

  if (drawerOpen) return null;

  async function fetchMessages() {
    setLoading(true);
    const res = await fetch("/api/messages");
    const data = await res.json();
    setMessages(data.messages ?? []);
    setLoading(false);
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text) return;
    const displayName = name || "Guest";
    const senderName = email ? `${displayName} (${email})` : displayName;
    setLoading(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: senderName, message: text })
    });
    const data = await res.json();
    if (res.ok) {
      setText("");
      // prepend message to history
      setMessages((m) => [data.message, ...m]);
    }
    setLoading(false);
  }

  return (
    <div className="fixed right-4 bottom-32 sm:bottom-24 z-50">
      {open && (
        <div className="w-80 max-w-xs rounded-xl border bg-background p-4 shadow-lg mb-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Message Owner</h4>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 h-48 overflow-y-auto space-y-2 mb-3">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
            {messages.map((m) => (
              <div key={m.id} className="rounded-md border p-2 bg-muted/50">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium text-sm">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <div className="text-sm mt-1">{m.message}</div>
              </div>
            ))}
          </div>

          <form className="space-y-2" onSubmit={handleSend}>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Your message" className="min-h-20" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={loading || !text}>
                Send
              </Button>
            </div>
          </form>
        </div>
      )}

      {!open && (
        <Button
          onClick={() => setOpen((s) => !s)}
          className="h-12 w-12 rounded-full bg-primary text-white hover:bg-primary/90 shadow-lg"
          aria-label="Message owner"
        >
          <div className="relative flex h-12 w-12 items-center justify-center">
            <MessageSquare className="h-6 w-6" />
          </div>
        </Button>
      )}
    </div>
  );
}
