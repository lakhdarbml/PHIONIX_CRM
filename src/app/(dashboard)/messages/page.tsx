
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Search, PlusCircle, ShieldAlert, Ban, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary, ErrorCard } from '@/components/ui/error-boundary';
import { NewConversationDialog } from '@/components/new-conversation-dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ContactsDialog } from '@/components/contacts-dialog';
import { useAuth, type User as AuthUser } from '@/context/auth-context';
import { io } from 'socket.io-client';
import type { ID, Personne, Employe, ConversationDB, Participant, Message, Opportunite, Interaction as InteractionType, Task as TaskType, UIParticipant } from '@/types/db';
import { TableRowSkeleton, MessageSkeleton } from '@/components/ui/skeleton-loader';
import type { ChangeEvent } from 'react';

type PopulatedMessage = Message & { senderName: string };

type PopulatedParticipant = {
    id: string;
    name: string;
    avatar: string;
    type: 'Employe' | 'Client';
};

interface PopulatedConversation {
    id_conversation?: ID;
    titre?: string;
    isBanned?: boolean;
    participants: PopulatedParticipant[];
    lastMessage?: string;
    lastMessageTimestamp?: string;
    unreadCount: number;
}

interface ChatViewProps {
    conversation: PopulatedConversation | null;
    messages: PopulatedMessage[];
    onSendMessage: (content: string) => void;
    user: AuthUser | null;
    isLoading: boolean;
    isSending: boolean;
    typingUsers: Map<string, string>;
    onTyping: (isTyping: boolean) => void;
}
// Utility (single definition)
const safeId = (id?: any) => id == null ? '' : String(id);


function ConversationListItem({ conversation, onSelect, selectedConversationId }: { conversation: PopulatedConversation, onSelect: (id: string | number) => void, selectedConversationId: string | null }) {
    const lastMessageTimestamp = conversation.lastMessageTimestamp ? new Date(conversation.lastMessageTimestamp) : null;

    return (
        <button
            onClick={() => onSelect(safeId(conversation.id_conversation))}
            className={cn(
                "w-full text-left p-3 rounded-lg flex flex-col gap-1 transition-all duration-200",
                "hover:bg-muted hover:scale-[1.02] active:scale-[0.98]",
                selectedConversationId === safeId(conversation.id_conversation) && 'bg-muted shadow-sm'
            )}
        >
            <div className="flex items-center justify-between">
                <p className={cn("font-semibold text-sm truncate", conversation.isBanned && "text-destructive")}>{conversation.titre}</p>
                {lastMessageTimestamp && (
                    <p className="text-xs text-muted-foreground">
                        {lastMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                {conversation.isBanned && <Badge variant="destructive">Banned</Badge>}
                {conversation.unreadCount > 0 && !conversation.isBanned && (
                    <Badge className="h-5 w-5 flex items-center justify-center p-0">{conversation.unreadCount}</Badge>
                )}
            </div>
        </button>
    )
}

function AdminConversationListItem({ conversation, onSelect, selectedConversationId, onBan, showBanButton }: { conversation: PopulatedConversation, onSelect: (id: string | number) => void, selectedConversationId: string | null, onBan: (id: string | number) => void, showBanButton: boolean }) {
     const lastMessageTimestamp = conversation.lastMessageTimestamp ? new Date(conversation.lastMessageTimestamp) : null;
    return (
    <div className={cn("flex items-center pr-2 rounded-lg", selectedConversationId === safeId(conversation.id_conversation) ? 'bg-muted' : 'hover:bg-muted/50')}>
             <button
                onClick={() => onSelect(safeId(conversation.id_conversation))}
                className="flex-1 text-left p-3 flex flex-col gap-1"
            >
                <div className="flex items-center justify-between">
                    <p className={cn("font-semibold text-sm truncate", conversation.isBanned && "text-destructive")}>{conversation.titre}</p>
                     {lastMessageTimestamp && (
                        <p className="text-xs text-muted-foreground">
                            {lastMessageTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                     {conversation.isBanned ? (
                        <Badge variant="destructive">Bannie</Badge>
                    ) : conversation.unreadCount > 0 && (
                        <Badge className="h-5 w-5 flex items-center justify-center p-0">{conversation.unreadCount}</Badge>
                    )}
                </div>
            </button>
          {showBanButton && !conversation.isBanned && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onBan(safeId(conversation.id_conversation) as any)}>
                    <Ban className="h-4 w-4" />
                    <span className="sr-only">Bannir la conversation</span>
                </Button>
            )}
        </div>
    );
}

function CategorizedConversationList({ conversations, onSelect, selectedConversationId, onBan, user, employees, roles }: { conversations: PopulatedConversation[], onSelect: (id: string | number) => void, selectedConversationId: string | null, onBan: (id: string | number) => void, user: AuthUser | null, employees: (Employe & Personne)[], roles: any[] }) {
    const categorizedConversations = useMemo(() => {
        const groupConversations: PopulatedConversation[] = [];
        const privateConversations: { [key: string]: PopulatedConversation[] } = {
            sales: [],
            support: [],
            manager: [],
            admin: [],
            client: [],
            other: []
        };
        
        const employeeRoleMap = new Map(employees.map(e => {
            const role = (roles || []).find(r => String(r.id_role) === String(e.id_role));
            return [e.id_personne, role?.libelle.toLowerCase() || 'client'];
        }));

        conversations.forEach(conv => {
                if ((conv.participants || []).length > 2) {
                groupConversations.push(conv);
            } else if (conv.participants.length === 2) {
                const otherParticipant = (conv.participants as any[]).find(p => String(p.id) !== String(user?.personneId));
                const participantRole = otherParticipant ? employeeRoleMap.get(String(otherParticipant.id)) || 'client' : 'client';
                
                let category: keyof typeof privateConversations = 'other';
                if (['sales', 'support', 'manager', 'admin', 'client'].includes(participantRole)) {
                    category = participantRole as keyof typeof privateConversations;
                }
                
                if (privateConversations[category]) {
                  privateConversations[category].push(conv);
                } else {
                  privateConversations.other.push(conv);
                }
            }
        });

        return { groupConversations, privateConversations };
    }, [conversations, employees, user]);

    const { groupConversations, privateConversations } = categorizedConversations;

    const renderList = (convs: PopulatedConversation[]) => convs.map(conv => (
        <AdminConversationListItem key={conv.id_conversation} conversation={conv} onSelect={onSelect} selectedConversationId={selectedConversationId} onBan={onBan} showBanButton={user?.role === 'admin' || user?.role === 'manager'} />
    ));
    
    const categoryNames: { [key: string]: string } = {
        sales: 'Commerciales',
        support: 'Support',
        manager: 'Managers',
        admin: 'Admins',
        client: 'Clients',
        other: 'Autres'
    };

    return (
        <nav className="p-2 space-y-1">
            {groupConversations.length > 0 && (
                <div>
                    <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groupes</h3>
                    {renderList(groupConversations)}
                </div>
            )}
            
            {(groupConversations.length > 0 && Object.values(privateConversations).some(c => c.length > 0)) && <Separator />}
            
            {Object.values(privateConversations).some(c => c.length > 0) && <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Messages Privés</h3>}
            {Object.entries(privateConversations).map(([category, convs]) => (
                convs.length > 0 && (
                    <div key={category}>
                        <h4 className="px-3 py-1 text-sm font-medium text-foreground">{categoryNames[category]}</h4>
                        {renderList(convs)}
                    </div>
                )
            ))}
        </nav>
    );
}

function ChatView({ conversation, messages, onSendMessage, user, isLoading, isSending, typingUsers, onTyping }: ChatViewProps) {
    const [messageContent, setMessageContent] = useState('');
    
    const canSendMessage = useMemo(() => {
        if (!user || !conversation) return false;
        // If conversation is banned, allow creator or admins to send (server enforces this too).
        if (conversation.isBanned) {
            const isCreator = String((conversation as any).id_createur) === String(user.personneId);
            const isAdmin = user.role === 'admin';
            if (isCreator || isAdmin) return true;
            return false;
        }

        // Compare IDs as strings to avoid type mismatches between numbers and strings.
        const isParticipant = (conversation.participants || []).some(p => String(p.id) === String(user.personneId));

        // Admins/Managers can send only if they are participants.
        if (user.role === 'admin' || user.role === 'manager') {
            return isParticipant;
        }

        // Other roles can send if they are participants.
        return isParticipant;
    }, [user, conversation]);


    if (!conversation) {
        return <div className="h-full flex items-center justify-center text-muted-foreground">Select a conversation to start messaging</div>
    }

    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('') : '';
    
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (messageContent.trim()) {
            // Add visual feedback for message sending
            const messageArea = document.querySelector('.message-area');
            if (messageArea) {
                messageArea.scrollTop = messageArea.scrollHeight;
            }
            
            onSendMessage(messageContent.trim());
            setMessageContent('');
        }
    };
    
    const formatTimestamp = (timestamp: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const isParticipant = (conversation.participants || []).some(p => String(p.id) === String(user?.personneId));

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b flex items-center gap-3">
                <div className="flex -space-x-2 overflow-hidden">
                    {(conversation.participants || []).map((p: any) => (
                        <Avatar key={safeId(p.id)} className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                             <AvatarImage src={p.avatar as string | undefined} alt={p.name} />
                            <AvatarFallback>{getInitials(p.name || '')}</AvatarFallback>
                        </Avatar>
                    ))}
                </div>
                <div className="flex flex-col">
                    <h3 className={cn("text-lg font-semibold", conversation.isBanned && "text-destructive")}>{conversation.titre}</h3>
                    {conversation.isBanned && <span className="text-xs text-destructive font-bold">Cette conversation est bannie.</span>}
                </div>
            </header>
            <div className="message-area flex-1 p-4 overflow-y-auto space-y-4 scroll-smooth">
                {isLoading ? (
                    <>
                        <MessageSkeleton />
                        <MessageSkeleton />
                        <MessageSkeleton />
                    </>
                ) : messages.map((msg: any, index) => (
                    <div 
                        key={safeId(msg.id_message)} 
                        className={cn(
                            "flex items-end gap-2",
                            "animate-in fade-in slide-in-from-bottom-2 duration-300",
                            String(msg.id_emetteur) === String(user?.personneId) ? "justify-end" : ""
                        )}>
                        {msg.id_emetteur !== user?.personneId && (
                             <Avatar className="h-8 w-8">
                                <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                             </Avatar>
                        )}
                        <div className={cn(
                            "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg text-sm transition-all",
                            "hover:shadow-md",
                            msg.id_emetteur === user?.personneId ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                           <p className="font-bold mb-1">{msg.senderName}</p>
                           <p>{msg.contenu}</p>
                                                     <p className="text-xs text-right mt-1 opacity-70">
                                                         {formatTimestamp(msg.date_envoi ?? '')}
                                                     </p>
                        </div>
                         {msg.id_emetteur === user?.personneId && user && (
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'user avatar'}/>
                                <AvatarFallback>{user.displayName ? getInitials(user.displayName) : 'Me'}</AvatarFallback>
                             </Avatar>
                        )}
                    </div>
                ))}
                {typingUsers.size > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                        <div className="flex -space-x-2">
                            {Array.from(typingUsers.entries()).map(([userId, name]) => (
                                <Avatar key={userId} className="h-6 w-6 border-2 border-background">
                                    <AvatarFallback>{getInitials(name)}</AvatarFallback>
                                </Avatar>
                            ))}
                        </div>
                        <span>
                            {typingUsers.size === 1 
                                ? `${Array.from(typingUsers.values())[0]} est en train d'écrire...`
                                : `${typingUsers.size} personnes sont en train d'écrire...`}
                        </span>
                    </div>
                )}
            </div>
            <footer className="p-4 border-t">
                {isParticipant && canSendMessage ? (
                    <form onSubmit={handleSendMessage} className="relative">
                        <Input
                            placeholder={isSending ? "Sending..." : "Type a message..."}
                            className={cn(
                                "pr-12 transition-all duration-200",
                                "focus:scale-[1.01] focus:shadow-md",
                                isSending && "opacity-50"
                            )}
                            value={messageContent}
                            onChange={(e) => {
                                setMessageContent(e.target.value);
                                onTyping(e.target.value.length > 0);
                            }}
                            disabled={isSending}
                        />
                        <Button 
                            type="submit" 
                            size="icon" 
                            className={cn(
                                "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8",
                                isSending && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={isSending}
                        >
                            <Send className={cn("h-4 w-4", isSending && "animate-ping")} />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                ) : (
                    // If the user is not a participant, show the 'cannot send' message (e.g., supervisor who isn't part of the conversation)
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md bg-muted">
                        {conversation.isBanned ? <Ban className="h-4 w-4 text-destructive" /> : <ShieldAlert className="h-4 w-4" />}
                        <span>
                            {conversation.isBanned
                                ? "Cette conversation a été bannie par un modérateur."
                                : (!isParticipant ? "Vous ne pouvez pas envoyer de message dans cette conversation." : "")}
                        </span>
                    </div>
                )}
            </footer>
        </div>
    )
}

export default function MessagesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
    const [isContactsOpen, setIsContactsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
    const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
    const [messages, setMessages] = useState<PopulatedMessage[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

    // Check URL query param to pre-select a conversation (used when navigating from a notification)
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const conv = params.get('conversation_id') || params.get('conversationId') || params.get('conversation');
            if (conv) {
                setSelectedConversationId(String(conv));
            }
        } catch (e) { /* ignore on SSR */ }
    }, []);

    // Fetched datasets
    const [personnes, setPersonnes] = useState<Personne[]>([]);
    const [employes, setEmployes] = useState<Employe[]>([]);
    const [conversationsData, setConversationsData] = useState<ConversationDB[]>([]);
    const [messagesData, setMessagesData] = useState<Message[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [opportunities, setOpportunities] = useState<Opportunite[]>([]);
    const [interactions, setInteractions] = useState<InteractionType[]>([]);
    const [tasks, setTasks] = useState<TaskType[]>([]);
    const [roles, setRoles] = useState<any[]>([]);

    const fullEmployees = useMemo((): (Employe & Personne)[] => {
        const personnesMap = new Map((personnes as Personne[]).map(p => [String(p.id_personne), p]));
        return (employes as Employe[]).map(emp => {
            const personne = personnesMap.get(String(emp.id_personne));
            return { ...emp, ...personne } as Employe & Personne;
        });
    }, [personnes, employes]);

    const load = useCallback(async () => {
        if (!user) return;
        
        setIsLoading(true);
        try {
            const endpoints = [
                '/api/data/Personne',
                '/api/data/Employe',
                '/api/data/Role',
                '/api/data/Conversation',
                '/api/data/Message',
                '/api/data/Participant',
                '/api/data/Opportunite',
                '/api/data/Interaction',
                '/api/data/Task',
            ];

            const responses = await Promise.all(endpoints.map(ep => fetch(ep)));
            const [personnesRes, employesRes, rolesRes, convRes, msgRes, partRes, oppRes, interRes, taskRes] = await Promise.all(responses.map(r => r.json()));

            setPersonnes(personnesRes || []);
            setEmployes(employesRes || []);
            setRoles(rolesRes || []);
            setConversationsData(convRes || []);
            setMessagesData(msgRes || []);
            setParticipants(partRes || []);
            setOpportunities(oppRes || []);
            setInteractions(interRes || []);
            setTasks(taskRes || []);
        } catch (err) {
            console.error('Failed to load messages data', err);
            setError('Failed to load messages. Please try again.');
            toast({
                title: "Error",
                description: "Failed to load messages. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (!user) return;
        load();
    }, [user]);

    useEffect(() => {
        if (selectedConversationId) {
            const personnesMap = new Map((personnes as Personne[]).map(p => [String(p.id_personne), p]));
            const conversationMessages = (messagesData as Message[])
                .filter(m => String(m.id_conversation) === String(selectedConversationId))
                .map(msg => {
                    const sender = personnesMap.get(String(msg.id_emetteur));
                    return {
                        ...msg,
                        senderName: sender ? `${sender.prenom} ${sender.nom}` : 'Unknown'
                    } as PopulatedMessage;
                })
                .sort((a,b) => {
                    const ta = a.date_envoi ? new Date(a.date_envoi).getTime() : 0;
                    const tb = b.date_envoi ? new Date(b.date_envoi).getTime() : 0;
                    return ta - tb;
                });

            setMessages(conversationMessages);
        } else {
            setMessages([]);
        }
    }, [selectedConversationId, messagesData, personnes]);

    // Socket.IO connection (client). Connect when user present.
    useEffect(() => {
        if (!user) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${process.env.SOCKET_PORT || 4000}`;
        const socket = io(socketUrl, { autoConnect: true });

        socket.on('connect', () => {
            console.log('Connected to socket server', socket.id);
            
            // Join the room for the selected conversation
            if (selectedConversationId) {
                socket.emit('join', selectedConversationId);
            }
        });

        // When a remote message is created, if it belongs to the current conversation append it
        socket.on('message_created', (msg: any) => {
            try {
                if (String(msg.id_conversation) === String(selectedConversationId)) {
                    const personnesMap = new Map((personnes as Personne[]).map(p => [String(p.id_personne), p]));
                    const sender = personnesMap.get(String(msg.id_emetteur));
                    const populated: PopulatedMessage = { 
                        ...msg, 
                        senderName: sender ? `${sender.prenom} ${sender.nom}` : 'Unknown' 
                    } as PopulatedMessage;
                    
                    setMessages(prev => [...prev, populated]);
                    
                    // Scroll to bottom
                    const messageArea = document.querySelector('.message-area');
                    if (messageArea) {
                        messageArea.scrollTop = messageArea.scrollHeight;
                    }
                }

                // Update conversation list lastMessage / timestamp
                setConversations(prev => prev.map(c => 
                    String(c.id_conversation) === String(msg.id_conversation) 
                        ? { 
                            ...c, 
                            lastMessage: msg.contenu, 
                            lastMessageTimestamp: msg.date_envoi,
                            unreadCount: String(c.id_conversation) !== String(selectedConversationId) 
                                ? (c.unreadCount || 0) + 1 
                                : c.unreadCount
                        } 
                        : c
                ));
            } catch (e) { console.error(e); }
        });

        // Handle user typing events (use top-level typingUsers/setTypingUsers)
        socket.on('user_typing', ({ userId }: { userId: string }) => {
            if (userId !== user?.personneId) {
                const personnesMap = new Map((personnes as Personne[]).map(p => [String(p.id_personne), p]));
                const typingUser = personnesMap.get(String(userId));
                if (typingUser) {
                    setTypingUsers(prevUsers => {
                        const newUsers = new Map(prevUsers);
                        newUsers.set(String(userId), `${typingUser.prenom} ${typingUser.nom}`);
                        return newUsers;
                    });
                }
            }
        });

        socket.on('user_stopped_typing', ({ userId }: { userId: string }) => {
            if (userId !== user?.personneId) {
                setTypingUsers(prevUsers => {
                    const newUsers = new Map(prevUsers);
                    newUsers.delete(String(userId));
                    return newUsers;
                });
            }
        });

        // If a conversation is banned elsewhere, reload conversations to reflect persistent state
        socket.on('conversation_banned', async (_payload: any) => {
            try {
                await load();
            } catch (e) { console.error('Failed to reload conversations after ban event', e); }
        });

        // Clean up on unmount
        return () => {
            if (selectedConversationId) {
                socket.emit('leave', selectedConversationId);
            }
            socket.disconnect();
        };
    }, [user, selectedConversationId, personnes, load]);

      const handleBanConversation = async (id: string | number) => {
        try {
          const response = await fetch(`/api/conversation/${id}/ban`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isBanned: true })
          });

          if (!response.ok) {
            throw new Error('Failed to ban conversation');
          }

                    // Re-load conversations from server to reflect the persisted state (authoritative)
                    try {
                        await load();
                    } catch (e) {
                        // Fallback to optimistic update if reload fails
                        setConversations(prev => prev.map(c => 
                            safeId(c.id_conversation) === String(id) ? { ...c, isBanned: true } : c
                        ));
                    }

          if (user?.role === 'manager') {
            toast({
              title: "Conversation Bannie",
              description: "La conversation a été bannie. L'administrateur a été notifié.",
              variant: 'destructive'
            });
          } else {
            toast({
              title: "Conversation Bannie",
              description: "La conversation a été bannie.",
              variant: 'destructive'
            });
          }
        } catch (error) {
          console.error('Failed to ban conversation:', error);
          toast({
            title: "Error",
            description: "Failed to ban conversation",
            variant: "destructive",
          });
        }
    };
    
    // Build populated conversations from fetched data
    const selectedConversation = conversations.find(c => safeId(c.id_conversation) === selectedConversationId) || null;

    // create a populated conversations state from conversationsData when needed
    useEffect(() => {
        const personnesMap = new Map((personnes as Personne[]).map(p => [String(p.id_personne), p]));

        const userIsParticipant = (conv: ConversationDB) => (participants as Participant[]).some(p => safeId(p.id_conversation) === safeId(conv.id_conversation) && safeId(p.id_personne) === safeId(user?.personneId));

        const userConversations = (conversationsData as ConversationDB[]).filter(conv => {
            if (user?.role === 'admin' || user?.role === 'manager') return true;
            return userIsParticipant(conv);
        });

        const populatedConversations: PopulatedConversation[] = userConversations.map(conv => {
            const convParticipants = (participants as Participant[])
                .filter(p => String(p.id_conversation) === String(conv.id_conversation))
                .map(p => {
                    const personne = personnesMap.get(String(p.id_personne));
                    // Normalize DB type_participant to the strict union expected by the UI
                    const rawType = String(p.type_participant || '').toLowerCase();
                    const normalizedType: 'Employe' | 'Client' = (rawType === 'client' ? 'Client' : 'Employe');
                    return {
                        id: String(p.id_personne),
                        name: personne ? `${personne.prenom} ${personne.nom}` : 'Unknown',
                        avatar: '',
                        type: normalizedType,
                    };
                });

            const lastMessage = (messagesData as Message[]).filter(m => safeId(m.id_conversation) === safeId(conv.id_conversation)).sort((a, b) => {
                const ta = a.date_envoi ? new Date(a.date_envoi).getTime() : 0;
                const tb = b.date_envoi ? new Date(b.date_envoi).getTime() : 0;
                return tb - ta;
            })[0];

            return {
                // normalize DB fields to client-friendly shape (support both snake_case from DB and camelCase types)
                id_conversation: conv.id_conversation,
                id_createur: (conv as any).id_createur,
                titre: conv.titre,
                isBanned: !!(conv as any).is_banned || !!(conv as any).isBanned,
                participants: convParticipants,
                lastMessage: (lastMessage as any)?.contenu || 'Aucun message',
                lastMessageTimestamp: (lastMessage as any)?.date_envoi,
                unreadCount: 0
            } as PopulatedConversation;
        });

        const sortedConversations = populatedConversations.sort((a, b) => {
            if (!a.lastMessageTimestamp) return 1;
            if (!b.lastMessageTimestamp) return -1;
            return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
        });

        setConversations(sortedConversations);

        if (sortedConversations.length > 0 && !selectedConversationId) {
            setSelectedConversationId(safeId(sortedConversations[0].id_conversation));
        }
    }, [conversationsData, messagesData, participants, personnes, user, selectedConversationId]);

    const handleNewConversation = async (title: string, participants: UIParticipant[]) => {
        if (!user) return;
        
        try {
            // First create the conversation
            const conversationRes = await fetch('/api/conversation', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titre: title, is_banned: false, id_createur: user.uid })
            });

            if (!conversationRes.ok) {
                const error = await conversationRes.json();
                throw new Error(error.error || 'Failed to create conversation');
            }

            const newConversation = await conversationRes.json();

            // Ensure the creator is a participant so they can send messages immediately
            const participantsToAdd = [...participants];
            const creatorPersonneId = (user.personneId ?? user.uid) as any;
            if (!participantsToAdd.some(p => String(p.id) === String(creatorPersonneId))) {
                participantsToAdd.push({ id: creatorPersonneId, name: user.displayName || 'Creator', avatar: user.photoURL || '', type: 'Employe' } as UIParticipant);
            }

            // Then create all participants with proper error handling
            const participantResults = await Promise.allSettled(participantsToAdd.map(participant => 
                fetch('/api/participant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_conversation: newConversation.id_conversation,
                        id_personne: participant.id,
                        type_participant: participant.type || 'regular'
                    })
                }).then(res => {
                    if (!res.ok) {
                        return res.json().then(err => Promise.reject(err.error || 'Failed to add participant'));
                    }
                    return res.json();
                })
            ));

            // Check for any failed participant additions
            const failedParticipants = participantResults.filter(r => r.status === 'rejected');
            if (failedParticipants.length > 0) {
                // Clean up the conversation since some participants failed
                await fetch(`/api/conversation/${newConversation.id_conversation}`, {
                    method: 'DELETE'
                });

                throw new Error('Failed to add some participants to the conversation');
            }

            // Update local state
            const newPopulatedConversation: PopulatedConversation = {
                id_conversation: newConversation.id_conversation,
                titre: newConversation.titre,
                isBanned: !!newConversation.is_banned,
                participants: participantsToAdd.map(p => ({
                    id: String(p.id),
                    name: p.name,
                    avatar: p.avatar || '',
                    // normalize types to the UI expected union
                    type: (p.type === 'Client' || String(p.type).toLowerCase() === 'client') ? 'Client' : 'Employe'
                })),
                lastMessage: 'Aucun message',
                lastMessageTimestamp: new Date().toISOString(),
                unreadCount: 0
            };

            setConversations(prev => [newPopulatedConversation, ...prev]);
            setSelectedConversationId(String(newConversation.id_conversation));

            toast({
                title: "Conversation créée",
                description: "La nouvelle conversation a été créée avec succès.",
            });

        } catch (error) {
            console.error('Error creating conversation:', error);
            toast({
                title: "Erreur",
                description: "Une erreur est survenue lors de la création de la conversation.",
                variant: "destructive"
            });
        }
    };

    const handleSelectContact = (employee: Employe & Personne) => {
        // Mock implementation
        console.log("Selected contact", employee);
    };
    
    const handleGenerateInteractions = () => {
        toast({
            title: "Analyse en cours",
            description: "L'IA analyse les messages pour générer des interactions pertinentes. Cela peut prendre un moment.",
        });
    };

    let typingTimeout: NodeJS.Timeout;

    const handleTyping = (isTyping: boolean) => {
        if (!user || !selectedConversationId) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${process.env.SOCKET_PORT || 4000}`;
        const socket = io(socketUrl);

        if (isTyping) {
            socket.emit('typing_started', {
                userId: user.personneId,
                conversationId: selectedConversationId
            });

            // Clear existing timeout if any
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }

            // Set new timeout
            typingTimeout = setTimeout(() => {
                socket.emit('typing_stopped', {
                    userId: user.personneId,
                    conversationId: selectedConversationId
                });
            }, 3000);
        } else {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
            socket.emit('typing_stopped', {
                userId: user.personneId,
                conversationId: selectedConversationId
            });
        }

        socket.disconnect();
    };

    const handleSendMessage = (content: string) => {
        if (!user || !selectedConversationId) return;
        (async () => {
            setIsSending(true);
            try {
                // Clear typing state
                handleTyping(false);

                // Persist message via API
                const res = await fetch('/api/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contenu: content, id_emetteur: user.personneId, id_conversation: selectedConversationId }) });
                const created = await res.json();

                // Optimistically add to UI (created contains DB row with id_message)
                const populated: PopulatedMessage = { ...created, senderName: user.displayName || 'Moi' } as PopulatedMessage;
                setMessages(prev => [...prev, populated]);
                setConversations(prev => prev.map(c => String(c.id_conversation) === String(selectedConversationId) ? { ...c, lastMessage: content, lastMessageTimestamp: created.date_envoi } : c));

                // Emit to socket server so other clients receive it in real-time
                try {
                    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${process.env.SOCKET_PORT || 4000}`;
                    const s = io(socketUrl);
                    s.emit('send_message', created);
                    s.disconnect();
                } catch (e) { console.error('Socket emit failed', e); }

            } catch (err) {
                console.error('Failed to send message', err);
                toast({
                    title: "Error",
                    description: "Failed to send message. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setIsSending(false);
            }
        })();
    };

    const showCategorizedView = user?.role === 'admin' || user?.role === 'manager';
    const canCreateGroup = user?.role === 'admin' || user?.role === 'manager';
    const canSeeContacts = user?.role === 'sales' || user?.role === 'support';

    return (
        <>
            <NewConversationDialog
                isOpen={isNewConversationOpen}
                onOpenChange={setIsNewConversationOpen}
                onCreateConversation={handleNewConversation}
                employees={fullEmployees}
            />
            {user && (
                <ContactsDialog
                    isOpen={isContactsOpen}
                    onOpenChange={setIsContactsOpen}
                    currentUser={user}
                    onSelectContact={handleSelectContact}
                    employees={fullEmployees as any}
                    opportunities={opportunities as any}
                    interactions={interactions as any}
                    tasks={tasks as any}
                />
            )}
            <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-[calc(100vh_-_theme(spacing.16))]">
                <Card className={cn(
                    "rounded-r-none transition-all duration-300 ease-in-out",
                    selectedConversationId ? "hidden md:flex" : "flex"
                )}>
                     <div className="flex flex-col h-full w-full">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold font-headline">Messages</h2>
                                <div className="flex items-center gap-1">
                                    {canSeeContacts && (
                                        <Button variant="ghost" size="icon" onClick={() => setIsContactsOpen(true)}>
                                            <Users className="h-5 w-5" />
                                            <span className="sr-only">Contacts</span>
                                        </Button>
                                    )}
                                    {canCreateGroup && (
                                        <Button variant="ghost" size="icon" onClick={() => setIsNewConversationOpen(true)}>
                                            <PlusCircle className="h-5 w-5" />
                                            <span className="sr-only">Nouvelle conversation de groupe</span>
                                        </Button>
                                    )}
                                     {(user?.role === 'admin' || user?.role === 'manager') && (
                                        <Button variant="ghost" size="icon" onClick={handleGenerateInteractions}>
                                            <Sparkles className="h-5 w-5" />
                                            <span className="sr-only">Générer les interactions</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Rechercher..." className="pl-9" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {error ? (
                                <ErrorCard
                                    title="Unable to load conversations"
                                    message={error}
                                    retryFn={() => {
                                        setError(null);
                                        setIsLoading(true);
                                        load();
                                    }}
                                />
                            ) : isLoading ? (
                                <div className="p-4 space-y-3">
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                </div>
                            ) : conversations.length > 0 ? (
                                showCategorizedView ? (
                                    <CategorizedConversationList conversations={conversations} onSelect={(id) => setSelectedConversationId(String(id))} selectedConversationId={selectedConversationId} onBan={handleBanConversation} user={user} employees={fullEmployees as any} roles={roles} />
                                ) : (
                                    <nav className="p-2 space-y-1">
                                        {conversations.map(conv => (
                                            <div 
                                                key={conv.id_conversation}
                                                className="transform transition-transform active:scale-95 md:active:scale-100"
                                            >
                                                <ConversationListItem 
                                                    conversation={conv} 
                                                    onSelect={(id) => setSelectedConversationId(String(id))} 
                                                    selectedConversationId={selectedConversationId} 
                                                />
                                            </div>
                                        ))}
                                    </nav>
                                )
                            ) : (
                                 <div className="flex flex-col h-full items-center justify-center p-4 text-center">
                                    <h3 className="text-lg font-semibold">Aucune Conversation</h3>
                                    <p className="text-sm text-muted-foreground">Commencez par créer une nouvelle conversation.</p>
                                    {canCreateGroup && (
                                        <Button onClick={() => setIsNewConversationOpen(true)} className="mt-4">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Nouvelle Conversation de groupe
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
                <Card className={cn(
                    "rounded-l-none transition-all duration-300 ease-in-out",
                    selectedConversationId ? "flex" : "hidden md:flex"
                )}>
                    <div className="w-full flex flex-col">
                        {selectedConversationId && (
                            <button
                                onClick={() => setSelectedConversationId(null)}
                                className="md:hidden flex items-center gap-2 p-4 text-sm text-muted-foreground hover:text-primary"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="m15 18-6-6 6-6" />
                                </svg>
                                Back to conversations
                            </button>
                        )}
                        <ChatView 
                            conversation={selectedConversation} 
                            messages={messages} 
                            onSendMessage={handleSendMessage} 
                            user={user} 
                            isLoading={isLoading} 
                            isSending={isSending}
                            typingUsers={typingUsers}
                            onTyping={handleTyping}
                        />
                    </div>
                </Card>
            </div>
        </>
    );
}

    