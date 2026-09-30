export type MessageSender = 'customer' | 'bot' | 'agent' | 'system';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
export type ConversationStatus = 'bot_active' | 'human_requested' | 'human_active' | 'resolved';
export type Channel = 'demo' | 'whatsapp';

export interface QuickReply {
  id: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  providerMessageId?: string;
  conversationId: string;
  sender: MessageSender;
  type: 'text' | 'system';
  text: string;
  status: MessageStatus;
  createdAt: string;
  quickReplies?: QuickReply[];
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  language: string;
  source: 'website-demo' | 'whatsapp';
  createdAt: string;
}

export interface ConversationContext {
  flow?: 'consultation';
  step?: 'name' | 'city' | 'property';
  leadName?: string;
  city?: string;
  property?: string;
}

export interface CustomerProfile {
  name?: string;
  location?: string;
  intent?: 'query' | 'deal';
  language?: 'en' | 'hi';
}

export interface Conversation {
  id: string;
  contactId: string;
  contact: Contact;
  channel: Channel;
  status: ConversationStatus;
  botState?: 'LANGUAGE_SELECTION' | 'GREETING' | 'COLLECTING_INTENT' | 'COLLECTING_INFO' | 'READY_FOR_AGENT';
  customerProfile?: CustomerProfile;
  assignedAgent?: string;
  unreadCount: number;
  fallbackCount: number;
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
  customerWindowExpiresAt: string;
  messages: ChatMessage[];
}

export interface DashboardStats {
  totalConversations: number;
  activeNow: number;
  needsAttention: number;
  automationRate: number;
  averageResponseSeconds: number;
}

export interface RuntimeData {
  conversations: Conversation[];
}

export interface NormalizedInboundMessage {
  providerMessageId: string;
  from: string;
  name: string;
  text: string;
}

export interface NormalizedStatusEvent {
  providerMessageId: string;
  status: MessageStatus;
}
