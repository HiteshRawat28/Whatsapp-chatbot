export type ConversationStatus = 'bot_active' | 'human_requested' | 'human_active' | 'resolved';

export interface QuickReply {
  id: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'bot' | 'agent' | 'system';
  type: 'text' | 'system';
  text: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  quickReplies?: QuickReply[];
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  language: string;
  source: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  channel: 'demo' | 'whatsapp';
  status: ConversationStatus;
  assignedAgent?: string;
  unreadCount: number;
  fallbackCount: number;
  createdAt: string;
  updatedAt: string;
  customerWindowExpiresAt: string;
  messages: ChatMessage[];
}

export interface AppConfig {
  businessName: string;
  provider: string;
  mode: string;
  escalationPhone: string;
  escalationPhoneDisplay: string;
  whatsappUrl: string;
}

export interface DashboardStats {
  totalConversations: number;
  activeNow: number;
  needsAttention: number;
  automationRate: number;
  averageResponseSeconds: number;
}

export interface DashboardData {
  stats: DashboardStats;
  conversations: Conversation[];
}
