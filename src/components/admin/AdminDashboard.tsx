import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, FileText, Briefcase, AlertTriangle, Settings, Plus } from 'lucide-react';
import { listarUsuarios } from '../../services/adminService';
import { listarSetores } from '../../services/setoresService';
import { listarConfiguracoes, listarFuncoes, listarHistoricoAdmin } from '../../services/adminService';
import StatCard from './StatCard';

export default function AdminDashboard() {
  const [userCount, setUserCount] = useState(0);
  const [sectorCount, setSectorCount] = useState(0);
  const [sectorsWithoutManager, setSectorsWithoutManager] = useState(0);
  const [functionCount, setFunctionCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState('5');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [users, setores, configs, funcoes, historico] = await Promise.all([
          listarUsuarios(),
          listarSetores(),
          listarConfiguracoes(),
          listarFuncoes(),
          listarHistoricoAdmin(1, 1),
        ]);

        setUserCount(users.filter((u) => u.ativo).length);
        setSectorCount(setores.filter((s) => s.ativo).length);
        setSectorsWithoutManager(setores.filter((s) => s.ativo && !s.gestor).length);
        setFunctionCount(funcoes.filter((f) => f.ativo).length);
        setRequestCount(historico.pagination?.total ?? 0);

        const limiteConfig = configs.find((c) => c.chave === 'limite_solicitacoes_mensal');
        if (limiteConfig) setMonthlyLimit(limiteConfig.valor);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1 className="admin-page-title">
            <Users size={24} /> Dashboard
          </h1>
        </div>
        <div className="stat-cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton skeleton-cell" style={{ width: 44, height: 44 }} />
              <div>
                <div className="skeleton skeleton-cell" style={{ width: 40, height: 20 }} />
                <div className="skeleton skeleton-cell" style={{ width: 80, height: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Users size={24} /> Dashboard
        </h1>
      </div>

      <div className="stat-cards-grid">
        <StatCard icon={Users} label="Usuários Ativos" value={userCount} href="/admin/users" />
        <StatCard icon={Building2} label="Setores Ativos" value={sectorCount} href="/admin/sectors" />
        <StatCard icon={FileText} label="Solicitações no Mês" value={requestCount} href="/admin/history" />
        <StatCard icon={Briefcase} label="Funções Ativas" value={functionCount} href="/admin/functions" />
        <StatCard
          icon={AlertTriangle}
          label="Setores sem Gestor"
          value={sectorsWithoutManager}
          href="/admin/sectors"
          alert={sectorsWithoutManager > 0}
        />
        <StatCard icon={Settings} label="Limite Mensal" value={monthlyLimit} href="/admin/settings" />
      </div>

      <div className="quick-actions">
        <Link to="/admin/users" className="quick-action-btn">
          <Plus size={16} /> Novo Usuário
        </Link>
        <Link to="/admin/sectors" className="quick-action-btn">
          <Plus size={16} /> Novo Setor
        </Link>
        <Link to="/admin/sectors" className="quick-action-btn">
          <Plus size={16} /> Vincular Membro
        </Link>
      </div>
    </div>
  );
}
