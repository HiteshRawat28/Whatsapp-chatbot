import { Bot, CheckCircle2, Headset, UserRoundCheck } from 'lucide-react';
import type { ConversationStatus } from '../types';

const statusMap = {
  bot_active: { label: 'AI handling', icon: Bot },
  human_requested: { label: 'Needs attention', icon: Headset },
  human_active: { label: 'Agent active', icon: UserRoundCheck },
  resolved: { label: 'Resolved', icon: CheckCircle2 }
} as const;

export function StatusBadge({ status }: { status: ConversationStatus }) {
  const item = statusMap[status];
  const Icon = item.icon;
  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={13} /> {item.label}
    </span>
  );
}
