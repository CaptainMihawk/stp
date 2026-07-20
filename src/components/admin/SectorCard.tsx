import { Pencil, RotateCcw, Trash2, Users } from 'lucide-react';
import type { SetorListItem } from '../../services/setoresService';

interface SectorCardProps {
  setor: SetorListItem;
  isSelected: boolean;
  onEdit: (setor: SetorListItem) => void;
  onToggleActive: (setor: SetorListItem) => void;
  onViewMembers: (setorId: number) => void;
}

export default function SectorCard({ setor, isSelected, onEdit, onToggleActive, onViewMembers }: SectorCardProps) {
  return (
    <div
      className="sector-card"
      style={isSelected ? { borderColor: 'var(--primary)' } : undefined}
    >
      <div className="sector-card-header">
        <span className="sector-card-name">{setor.nome}</span>
        <span className={`badge ${setor.ativo ? 'badge-active' : 'badge-inactive'}`}>
          {setor.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>
      <div className="sector-card-meta">
        <div>Gestor(es): {setor.gestores.length > 0 ? setor.gestores.map(g => g.nome_completo).join(', ') : <em style={{ color: 'var(--danger, #ef4444)' }}>Sem gestor</em>}</div>
        <div>Membros: {setor.total_membros}</div>
      </div>
      <div className="sector-card-actions">
        <button className="admin-btn-icon" title="Ver membros" onClick={() => onViewMembers(setor.id)}>
          <Users size={15} />
        </button>
        <button className="admin-btn-icon" title="Editar" onClick={() => onEdit(setor)}>
          <Pencil size={15} />
        </button>
        <button className="admin-btn-icon" title={setor.ativo ? 'Desativar' : 'Reativar'} onClick={() => onToggleActive(setor)}>
          {setor.ativo ? <Trash2 size={15} /> : <RotateCcw size={15} />}
        </button>
      </div>
    </div>
  );
}
