import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  href?: string;
  alert?: boolean;
}

export default function StatCard({ icon: Icon, label, value, href, alert }: StatCardProps) {
  const content = (
    <div className={`stat-card ${alert ? 'stat-card-alert' : ''}`}>
      <div className={`stat-card-icon ${alert ? 'alert' : ''}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
      </div>
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}
