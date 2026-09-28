import { Zap } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="EnergINai">
      <span className="brand-mark"><Zap size={18} strokeWidth={2.6} /></span>
      {!compact && (
        <span className="brand-copy">
          <strong>EnergINai</strong>
          <small>AI customer care</small>
        </span>
      )}
    </div>
  );
}
