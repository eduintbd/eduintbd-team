import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Mail, 
  Send, 
  Inbox, 
  Star, 
  Trash2, 
  Plus, 
  Search,
  MailOpen,
  RefreshCw,
  CloudDownload,
  Loader2
} from "lucide-react";

interface Message {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  is_read: boolean;
  is_starred: boolean;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ReceivedMessage extends Message {
  recipient_id: string;
  is_deleted: boolean;
}

const Messages = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("inbox");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Compose form state
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Sync external emails from PurelyMail
  const syncExternalEmails = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-purelymail");
      if (error) throw error;
      
      if (data?.count > 0) {
        toast.success(`Imported ${data.count} new external emails`);
        refetchInbox();
      } else {
        toast.info("No new external emails");
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error("Failed to sync external emails: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Get all employees for recipient selection
  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .eq("status", "active")
        .order("first_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Get inbox messages
  const { data: inboxMessages, isLoading: inboxLoading, refetch: refetchInbox } = useQuery({
    queryKey: ["inbox-messages", currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      
      const { data: recipients, error: recipientsError } = await supabase
        .from("message_recipients")
        .select(`
          id,
          is_read,
          is_deleted,
          message_id,
          internal_messages (
            id,
            subject,
            body,
            created_at,
            is_starred,
            sender_id
          )
        `)
        .eq("recipient_id", currentEmployee.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (recipientsError) throw recipientsError;
      
      // Fetch sender info for each message
      const messagesWithSenders = await Promise.all(
        (recipients || []).map(async (r: any) => {
          const { data: sender } = await supabase
            .from("employees")
            .select("id, first_name, last_name, email")
            .eq("id", r.internal_messages.sender_id)
            .single();
          
          return {
            id: r.internal_messages.id,
            subject: r.internal_messages.subject,
            body: r.internal_messages.body,
            created_at: r.internal_messages.created_at,
            is_starred: r.internal_messages.is_starred,
            is_read: r.is_read,
            is_deleted: r.is_deleted,
            recipient_id: r.id,
            sender: sender || { id: "", first_name: "Unknown", last_name: "", email: "" }
          };
        })
      );
      
      return messagesWithSenders;
    },
    enabled: !!currentEmployee?.id,
  });

  // Get sent messages
  const { data: sentMessages, isLoading: sentLoading, refetch: refetchSent } = useQuery({
    queryKey: ["sent-messages", currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      
      const { data, error } = await supabase
        .from("internal_messages")
        .select("*")
        .eq("sender_id", currentEmployee.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((m: any) => ({
        ...m,
        sender: currentEmployee
      }));
    },
    enabled: !!currentEmployee?.id,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!currentEmployee?.id || !recipientId || !subject || !body) {
        throw new Error("Missing required fields");
      }

      // Create message
      const { data: message, error: msgError } = await supabase
        .from("internal_messages")
        .insert({
          sender_id: currentEmployee.id,
          subject,
          body
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Add recipient
      const { error: recipientError } = await supabase
        .from("message_recipients")
        .insert({
          message_id: message.id,
          recipient_id: recipientId,
          recipient_type: "to"
        });

      if (recipientError) throw recipientError;

      return message;
    },
    onSuccess: () => {
      toast.success("Message sent successfully");
      setComposeOpen(false);
      setRecipientId("");
      setSubject("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["sent-messages"] });
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (recipientRecordId: string) => {
      const { error } = await supabase
        .from("message_recipients")
        .update({ is_read: true })
        .eq("id", recipientRecordId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
    }
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (recipientRecordId: string) => {
      const { error } = await supabase
        .from("message_recipients")
        .update({ is_deleted: true })
        .eq("id", recipientRecordId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message deleted");
      setSelectedMessage(null);
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
    }
  });

  const handleOpenMessage = (message: ReceivedMessage) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      markAsReadMutation.mutate(message.recipient_id);
    }
  };

  const unreadCount = inboxMessages?.filter((m: ReceivedMessage) => !m.is_read).length || 0;

  const filteredInbox = inboxMessages?.filter((m: ReceivedMessage) => 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredSent = sentMessages?.filter((m: Message) =>
    m.subject.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Internal messaging system
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={syncExternalEmails}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4" />
              )}
              Sync External
            </Button>
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Compose
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">To</label>
                  <Select value={recipientId} onValueChange={setRecipientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.filter(e => e.id !== currentEmployee?.id).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea 
                    value={body} 
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type your message..."
                    rows={6}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending || !recipientId || !subject || !body}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Inbox
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{inboxMessages?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Unread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{unreadCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Send className="h-4 w-4" />
                Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{sentMessages?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                Starred
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {inboxMessages?.filter((m: ReceivedMessage) => m.is_starred).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-border p-4 flex flex-col sm:flex-row gap-4">
                <TabsList className="w-full sm:w-auto overflow-x-auto">
                  <TabsTrigger value="inbox" className="gap-2">
                    <Inbox className="h-4 w-4" />
                    Inbox
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="gap-2">
                    <Send className="h-4 w-4" />
                    Sent
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search messages..." 
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      refetchInbox();
                      refetchSent();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border min-h-[400px]">
                {/* Message List */}
                <div className="h-[400px] md:h-[500px] overflow-y-auto">
                  <TabsContent value="inbox" className="m-0">
                    {inboxLoading ? (
                      <div className="p-8 text-center text-muted-foreground">Loading...</div>
                    ) : filteredInbox.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No messages in inbox</p>
                      </div>
                    ) : (
                      filteredInbox.map((message: ReceivedMessage) => (
                        <div
                          key={message.id}
                          onClick={() => handleOpenMessage(message)}
                          className={`p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                            !message.is_read ? "bg-primary/5" : ""
                          } ${selectedMessage?.id === message.id ? "bg-accent" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 ${!message.is_read ? "text-primary" : "text-muted-foreground"}`}>
                              {message.is_read ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm truncate ${!message.is_read ? "font-semibold" : ""}`}>
                                  {message.sender.first_name} {message.sender.last_name}
                                </p>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(message.created_at), "MMM d")}
                                </span>
                              </div>
                              <p className={`text-sm truncate ${!message.is_read ? "font-medium" : "text-muted-foreground"}`}>
                                {message.subject}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {message.body.substring(0, 60)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="sent" className="m-0">
                    {sentLoading ? (
                      <div className="p-8 text-center text-muted-foreground">Loading...</div>
                    ) : filteredSent.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No sent messages</p>
                      </div>
                    ) : (
                      filteredSent.map((message: Message) => (
                        <div
                          key={message.id}
                          onClick={() => setSelectedMessage(message)}
                          className={`p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                            selectedMessage?.id === message.id ? "bg-accent" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Send className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium truncate">{message.subject}</p>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(message.created_at), "MMM d")}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {message.body.substring(0, 60)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </div>

                {/* Message Detail */}
                <div className="p-4 md:p-6">
                  {selectedMessage ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                          <p className="text-sm text-muted-foreground">
                            From: {selectedMessage.sender.first_name} {selectedMessage.sender.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(selectedMessage.created_at), "PPpp")}
                          </p>
                        </div>
                        {activeTab === "inbox" && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteMutation.mutate((selectedMessage as ReceivedMessage).recipient_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <div className="border-t border-border pt-4">
                        <p className="text-sm whitespace-pre-wrap">{selectedMessage.body}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Select a message to read</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
  );
};

export default Messages;
