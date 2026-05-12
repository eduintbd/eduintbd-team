import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Mail,
  Search,
  Send,
  Inbox,
  Trash2,
  Archive,
  ArrowLeft,
  Pen,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GmailThread {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  isUnread: boolean;
}

interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  isUnread: boolean;
}

interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gmailProxy<T = any>(action: string, params: Record<string, any> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("gmail-proxy", {
    body: { action, ...params },
  });
  if (error) throw error;
  return data as T;
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Email = () => {
  // Profile
  const [profile, setProfile] = useState<GmailProfile | null>(null);

  // Thread list
  const [threads, setThreads] = useState<GmailThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState("in:inbox");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected thread
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  // Compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [replyInReplyTo, setReplyInReplyTo] = useState<string | null>(null);
  const [replyReferences, setReplyReferences] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch profile
  // -----------------------------------------------------------------------

  useEffect(() => {
    gmailProxy<GmailProfile>("get_profile")
      .then(setProfile)
      .catch((err) => console.error("Failed to load profile", err));
  }, []);

  // -----------------------------------------------------------------------
  // Fetch threads
  // -----------------------------------------------------------------------

  const fetchThreads = useCallback(
    async (pageToken?: string) => {
      setThreadsLoading(true);
      try {
        const query = searchQuery ? `${activeLabel} ${searchQuery}` : activeLabel;
        const res = await gmailProxy<{ threads: GmailThread[]; nextPageToken?: string }>(
          "list_threads",
          { query, maxResults: 20, pageToken }
        );
        if (pageToken) {
          setThreads((prev) => [...prev, ...(res.threads ?? [])]);
        } else {
          setThreads(res.threads ?? []);
        }
        setNextPageToken(res.nextPageToken ?? null);
      } catch (err: any) {
        toast.error("Failed to load threads: " + err.message);
      } finally {
        setThreadsLoading(false);
      }
    },
    [activeLabel, searchQuery]
  );

  useEffect(() => {
    setSelectedThreadId(null);
    setMessages([]);
    setThreads([]);
    setNextPageToken(null);
    fetchThreads();
  }, [fetchThreads]);

  // -----------------------------------------------------------------------
  // Fetch single thread
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setThreadLoading(true);
    gmailProxy<{ messages: GmailMessage[] }>("get_thread", { threadId: selectedThreadId })
      .then((res) => {
        if (!cancelled) setMessages(res.messages ?? []);
      })
      .catch((err: any) => toast.error("Failed to load thread: " + err.message))
      .finally(() => {
        if (!cancelled) setThreadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedThreadId]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleArchive = async () => {
    if (!selectedThreadId) return;
    try {
      await gmailProxy("archive_thread", { threadId: selectedThreadId });
      toast.success("Thread archived");
      setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
      setSelectedThreadId(null);
    } catch (err: any) {
      toast.error("Archive failed: " + err.message);
    }
  };

  const handleTrash = async () => {
    if (!selectedThreadId) return;
    try {
      await gmailProxy("trash_thread", { threadId: selectedThreadId });
      toast.success("Thread trashed");
      setThreads((prev) => prev.filter((t) => t.id !== selectedThreadId));
      setSelectedThreadId(null);
    } catch (err: any) {
      toast.error("Trash failed: " + err.message);
    }
  };

  const handleSend = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      toast.error("To and Subject are required");
      return;
    }
    setSending(true);
    try {
      const payload: Record<string, any> = {
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
      };
      if (composeCc.trim()) payload.cc = composeCc;
      if (replyThreadId) payload.threadId = replyThreadId;
      if (replyInReplyTo) payload.inReplyTo = replyInReplyTo;
      if (replyReferences) payload.references = replyReferences;

      await gmailProxy("send_email", payload);
      toast.success("Email sent");
      resetCompose();
      fetchThreads();
    } catch (err: any) {
      toast.error("Send failed: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const resetCompose = () => {
    setComposeOpen(false);
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setShowCc(false);
    setReplyThreadId(null);
    setReplyInReplyTo(null);
    setReplyReferences(null);
  };

  const openReply = (msg: GmailMessage) => {
    setComposeTo(msg.from);
    setComposeSubject(msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`);
    setComposeBody("");
    setReplyThreadId(selectedThreadId);
    setReplyInReplyTo(msg.id);
    setReplyReferences(msg.id);
    setComposeOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchThreads();
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const labelTabs = [
    { label: "Inbox", query: "in:inbox", icon: Inbox },
    { label: "Sent", query: "in:sent", icon: Send },
    { label: "Drafts", query: "in:drafts", icon: FileText },
    { label: "Trash", query: "in:trash", icon: Trash2 },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Stats Header */}
      {profile && (
        <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">{profile.emailAddress}</span>
          <Badge variant="secondary">{profile.threadsTotal.toLocaleString()} threads</Badge>
          <Badge variant="outline">{profile.messagesTotal.toLocaleString()} messages</Badge>
        </div>
      )}

      {/* Main Split */}
      <div className="flex flex-1 min-h-0">
        {/* ---- Left Panel: Thread List ---- */}
        <div className="w-[40%] border-r flex flex-col min-h-0">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 p-3 border-b">
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          {/* Label Tabs */}
          <Tabs
            value={activeLabel}
            onValueChange={(v) => setActiveLabel(v)}
            className="px-3 pt-2"
          >
            <TabsList className="w-full">
              {labelTabs.map((t) => (
                <TabsTrigger key={t.query} value={t.query} className="flex-1 gap-1 text-xs">
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Thread List */}
          <ScrollArea className="flex-1">
            {threadsLoading && threads.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" />
                <p className="text-sm">No threads found</p>
              </div>
            ) : (
              <div className="divide-y">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${
                      selectedThreadId === thread.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {thread.isUnread && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm truncate ${
                              thread.isUnread ? "font-bold" : "font-medium"
                            }`}
                          >
                            {thread.from}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {relativeDate(thread.date)}
                          </span>
                        </div>
                        <p className="text-sm truncate">{thread.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">{thread.snippet}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {nextPageToken && (
              <div className="p-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchThreads(nextPageToken)}
                  disabled={threadsLoading}
                >
                  {threadsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load more
                </Button>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ---- Right Panel: Thread Content ---- */}
        <div className="w-[60%] flex flex-col min-h-0">
          {!selectedThreadId ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
              <Mail className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Select an email to read</p>
            </div>
          ) : threadLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedThreadId(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <Button variant="ghost" size="sm" onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
                <Button variant="ghost" size="sm" onClick={handleTrash}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Trash
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <Card key={msg.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{msg.from}</p>
                            <p className="text-xs text-muted-foreground">To: {msg.to}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(msg.date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1">{msg.subject}</p>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-4">
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert break-words"
                          dangerouslySetInnerHTML={{ __html: msg.body }}
                        />
                        <div className="mt-4 flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => openReply(msg)}>
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Reply
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      {/* ---- Compose FAB ---- */}
      <Button
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
        size="icon"
        onClick={() => {
          resetCompose();
          setComposeOpen(true);
        }}
      >
        <Pen className="h-5 w-5" />
      </Button>

      {/* ---- Compose Dialog ---- */}
      <Dialog open={composeOpen} onOpenChange={(open) => !open && resetCompose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{replyThreadId ? "Reply" : "Compose Email"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="compose-to">To</Label>
              <Input
                id="compose-to"
                placeholder="recipient@example.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>

            <div>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs"
                onClick={() => setShowCc(!showCc)}
              >
                {showCc ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Cc
              </Button>
              {showCc && (
                <div className="mt-1">
                  <Input
                    placeholder="cc@example.com"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="compose-subject">Subject</Label>
              <Input
                id="compose-subject"
                placeholder="Subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compose-body">Body</Label>
              <Textarea
                id="compose-body"
                placeholder="Write your message..."
                rows={8}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetCompose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Send className="h-4 w-4 mr-1" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Email;
