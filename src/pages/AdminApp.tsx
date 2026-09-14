import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  Bike,
  Users,
  Utensils,
  FileBarChart,
  LogOut,
  Search,
  Phone,
  MapPin,
  TrendingUp,
  Euro,
  ShoppingBag,
  Clock,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Edit2,
  Eye,
  KeyRound,
  Calendar,
  UserCheck,
  UserX,
  Download,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
  DISH_CATEGORY_LABELS,
  DISH_CATEGORY_COLORS,
  ROLE_LABELS,
  ROLE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
  formatPrice,
  formatDate,
  formatDateTime,
} from '@/lib/constants';
import type { Order, Profile, Dish, RoleCode, Reservation } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState, LoadingSpinner } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

type AdminPage = 'dashboard' | 'orders' | 'deliveries' | 'profiles' | 'dishes' | 'reservations' | 'reports';

export function AdminApp() {
  const [page, setPage] = useState<AdminPage>('dashboard');
  const { profile, signOut } = useAuth();

  const navItems: { id: AdminPage; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Tableau de bord' },
    { id: 'orders', icon: <ClipboardList size={20} />, label: 'Commandes' },
    { id: 'deliveries', icon: <Bike size={20} />, label: 'Livraisons' },
    { id: 'reservations', icon: <Calendar size={20} />, label: 'Réservations' },
    { id: 'profiles', icon: <Users size={20} />, label: 'Profils' },
    { id: 'dishes', icon: <Utensils size={20} />, label: 'Plats' },
    { id: 'reports', icon: <FileBarChart size={20} />, label: 'Rapports' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-5 flex items-center gap-3 border-b border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
            <Shield size={22} />
          </div>
          <div>
            <p className="font-bold text-sm">Le Gourmet</p>
            <p className="text-xs text-slate-400">Administration</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
                page === item.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
              )}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'Admin'}</p>
            <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors w-full"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        {page === 'dashboard' && <Dashboard />}
        {page === 'orders' && <AdminOrders />}
        {page === 'deliveries' && <AdminDeliveries />}
        {page === 'reservations' && <AdminReservations />}
        {page === 'profiles' && <AdminProfiles />}
        {page === 'dishes' && <AdminDishes />}
        {page === 'reports' && <AdminReports />}
      </main>
    </div>
  );
}

// ============= DASHBOARD =============
function Dashboard() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    activeDeliveries: 0,
    totalClients: 0,
    monthRevenue: 0,
    yearRevenue: 0,
    pendingReservations: 0,
    activeUsers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

      const [todayRes, monthRes, yearRes, todayOrdersRes, deliveriesRes, clientsRes, reservationsRes, activeUsersRes, recentRes] = await Promise.all([
        supabase.from('orders').select('total_amount').gte('created_at', today).eq('payment_status', 'paye'),
        supabase.from('orders').select('total_amount').gte('created_at', monthStart).eq('payment_status', 'paye'),
        supabase.from('orders').select('total_amount').gte('created_at', yearStart).eq('payment_status', 'paye'),
        supabase.from('orders').select('*').gte('created_at', today),
        supabase.from('deliveries').select('*').in('status', ['assigne', 'en_cours']),
        supabase.from('profiles').select('*').eq('role', 'client'),
        supabase.from('reservations').select('*').eq('status', 'en_attente'),
        supabase.from('profiles').select('*').eq('status', 'active').in('role', ['caisse', 'livreur']),
        supabase.from('orders').select('*, order_items:order_items(*)').order('created_at', { ascending: false }).limit(5),
      ]);

      const sumRevenue = (data: any[] | null) => (data || []).reduce((s, o) => s + Number(o.total_amount), 0);

      setStats({
        todayRevenue: sumRevenue(todayRes.data),
        todayOrders: todayOrdersRes.data?.length || 0,
        activeDeliveries: deliveriesRes.data?.length || 0,
        totalClients: clientsRes.data?.length || 0,
        monthRevenue: sumRevenue(monthRes.data),
        yearRevenue: sumRevenue(yearRes.data),
        pendingReservations: reservationsRes.data?.length || 0,
        activeUsers: activeUsersRes.data?.length || 0,
      });
      setRecentOrders((recentRes.data as Order[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="py-16"><LoadingSpinner size={32} /></div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Tableau de bord</h1>
      <p className="text-sm text-slate-500 mb-6">Vue d'ensemble de l'activité du restaurant</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenu du jour" value={formatPrice(stats.todayRevenue)} icon={<Euro size={22} />} color="green" />
        <StatCard label="Commandes du jour" value={stats.todayOrders} icon={<ShoppingBag size={22} />} color="blue" />
        <StatCard label="Livraisons actives" value={stats.activeDeliveries} icon={<Bike size={22} />} color="orange" />
        <StatCard label="Clients inscrits" value={stats.totalClients} icon={<Users size={22} />} color="teal" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Revenu mensuel" value={formatPrice(stats.monthRevenue)} icon={<TrendingUp size={22} />} color="purple" />
        <StatCard label="Revenu annuel" value={formatPrice(stats.yearRevenue)} icon={<Euro size={22} />} color="green" />
        <StatCard label="Réservations en attente" value={stats.pendingReservations} icon={<Calendar size={22} />} color="orange" />
      </div>

      <Card className="p-5">
        <h2 className="font-bold text-slate-900 mb-4">Commandes récentes</h2>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Aucune commande récente</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-slate-900">{order.order_number}</span>
                  <span className="text-sm text-slate-500">{order.customer_name || 'Client'}</span>
                  <Badge className={ORDER_STATUS_COLORS[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{formatDateTime(order.created_at)}</span>
                  <span className="font-semibold text-slate-900">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============= ADMIN ORDERS =============
function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, order_items:order_items(*), delivery:deliveries(*, delivery_person:profiles!deliveries_delivery_person_id_fkey(*))')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data } = await query;
    let result = (data as Order[]) || [];
    if (search) {
      const q = search.toUpperCase();
      result = result.filter(
        (o) => o.order_number.includes(q) || o.customer_name.toUpperCase().includes(search.toUpperCase())
      );
    }
    setOrders(result);
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Toutes les commandes</h1>
      <p className="text-sm text-slate-500 mb-6">Vue globale et suivi des commandes</p>

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="all">Tous les statuts</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="py-16"><LoadingSpinner size={32} /></div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<ClipboardList size={28} />} title="Aucune commande" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">N°</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Montant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Paiement</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold">{order.order_number}</td>
                  <td className="px-4 py-3">{order.customer_name || 'Client'}</td>
                  <td className="px-4 py-3">{ORDER_TYPE_LABELS[order.type]}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(order.total_amount)}</td>
                  <td className="px-4 py-3">
                    <Badge className={ORDER_STATUS_COLORS[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={PAYMENT_STATUS_COLORS[order.payment_status]}>
                      {PAYMENT_STATUS_LABELS[order.payment_status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(order.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setDetailOpen(true); }}>
                      <Eye size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={`Commande ${selectedOrder?.order_number || ''}`} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Client</p>
                <p className="font-semibold">{selectedOrder.customer_name}</p>
                <p className="text-sm text-slate-500">{selectedOrder.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Type</p>
                <p className="font-semibold">{ORDER_TYPE_LABELS[selectedOrder.type]}</p>
                {selectedOrder.delivery_address && <p className="text-sm text-slate-500">{selectedOrder.delivery_address}</p>}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              {selectedOrder.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1">
                  <span>{item.quantity}x {item.dish_name}</span>
                  <span className="font-medium">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatPrice(selectedOrder.total_amount)}</span>
              </div>
            </div>
            {(selectedOrder as any).delivery?.[0]?.delivery_person && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700">Livreur</p>
                <p className="text-sm text-blue-800">
                  {(selectedOrder as any).delivery[0].delivery_person.full_name} - {(selectedOrder as any).delivery[0].delivery_person.phone}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============= ADMIN DELIVERIES =============
function AdminDeliveries() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('deliveries')
      .select('*, order:orders(*), delivery_person:profiles!deliveries_delivery_person_id_fkey(*)')
      .order('created_at', { ascending: false });
    setDeliveries(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 10000);
    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Suivi des livraisons</h1>
      <p className="text-sm text-slate-500 mb-6">Toutes les livraisons en cours et terminées</p>

      {loading ? (
        <div className="py-16"><LoadingSpinner size={32} /></div>
      ) : deliveries.length === 0 ? (
        <EmptyState icon={<Bike size={28} />} title="Aucune livraison" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {deliveries.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-semibold text-sm">{d.order?.order_number}</span>
                <Badge className={(DELIVERY_STATUS_COLORS as any)[d.status]}>
                  {(DELIVERY_STATUS_LABELS as any)[d.status]}
                </Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-400" />
                  <span className="text-slate-700">{d.order?.customer_name || 'Client'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span className="text-slate-600">{d.order?.customer_phone}</span>
                </div>
                {d.order?.delivery_address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-400 mt-0.5" />
                    <span className="text-slate-600 text-xs">{d.order.delivery_address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Bike size={14} className="text-slate-400" />
                  <span className="text-slate-700 text-xs">
                    {d.delivery_person?.full_name || 'Non assigné'}
                  </span>
                </div>
                {d.delivered_at && (
                  <p className="text-xs text-slate-400">Livré le {formatDateTime(d.delivered_at)}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============= ADMIN RESERVATIONS =============
function AdminReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .order('reservation_date', { ascending: false });
    setReservations((data as Reservation[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('reservations').update({ status }).eq('id', id);
    fetch();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Réservations</h1>
      <p className="text-sm text-slate-500 mb-6">Gérez les réservations de tables</p>

      {loading ? (
        <div className="py-16"><LoadingSpinner size={32} /></div>
      ) : reservations.length === 0 ? (
        <EmptyState icon={<Calendar size={28} />} title="Aucune réservation" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Téléphone</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Personnes</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Heure</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.customer_phone}</td>
                  <td className="px-4 py-3">{r.party_size}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.reservation_date)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.reservation_time.substring(0, 5)}</td>
                  <td className="px-4 py-3">
                    <Badge className={RESERVATION_STATUS_COLORS[r.status]}>
                      {RESERVATION_STATUS_LABELS[r.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'en_attente' && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="success" onClick={() => updateStatus(r.id, 'confirmee')}>
                          <CheckCircle2 size={14} />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => updateStatus(r.id, 'annulee')}>
                          <X size={14} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============= ADMIN PROFILES =============
function AdminProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [codes, setCodes] = useState<RoleCode[]>([]);
  const [codeModal, setCodeModal] = useState(false);
  const [newCodeRole, setNewCodeRole] = useState<'caisse' | 'livreur'>('caisse');
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editModal, setEditModal] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (roleFilter !== 'all') query = query.eq('role', roleFilter);
    const { data } = await query;
    let result = (data as Profile[]) || [];
    if (search) {
      result = result.filter(
        (p) =>
          p.full_name.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    setProfiles(result);
    setLoading(false);
  }, [roleFilter, search]);

  const fetchCodes = useCallback(async () => {
    const { data } = await supabase.from('role_codes').select('*').order('created_at', { ascending: false });
    setCodes((data as RoleCode[]) || []);
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchCodes();
  }, [fetchProfiles, fetchCodes]);

  const updateProfileStatus = async (id: string, status: string) => {
    await supabase.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchProfiles();
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    fetchProfiles();
    setEditModal(false);
  };

  const generateCode = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    await supabase.from('role_codes').insert({ code, role: newCodeRole });
    setCodeModal(false);
    fetchCodes();
  };

  const deleteCode = async (id: string) => {
    await supabase.from('role_codes').delete().eq('id', id);
    fetchCodes();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des profils</h1>
          <p className="text-sm text-slate-500 mt-1">Validez et gérez les comptes utilisateurs</p>
        </div>
        <Button onClick={() => setCodeModal(true)}>
          <KeyRound size={16} className="mr-1" /> Générer un code
        </Button>
      </div>

      {/* Role codes section */}
      {codes.length > 0 && (
        <Card className="p-4 mb-4">
          <h3 className="font-semibold text-sm text-slate-900 mb-3">Codes de validation actifs</h3>
          <div className="grid grid-cols-3 gap-3">
            {codes.filter((c) => !c.used).map((code) => (
              <div key={code.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-mono font-bold text-slate-900">{code.code}</p>
                  <p className="text-xs text-slate-400">{ROLE_LABELS[code.role]}</p>
                </div>
                <button onClick={() => deleteCode(code.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-auto">
            <option value="all">Tous les rôles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="py-16"><LoadingSpinner size={32} /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Téléphone</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Rôle</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.full_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email}</td>
                  <td className="px-4 py-3 text-slate-600">{p.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={ROLE_COLORS[p.role]}>{ROLE_LABELS[p.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status === 'pending' && (
                        <Button size="sm" variant="success" onClick={() => updateProfileStatus(p.id, 'active')}>
                          <UserCheck size={14} />
                        </Button>
                      )}
                      {p.status === 'active' && p.role !== 'admin' && (
                        <Button size="sm" variant="outline" onClick={() => updateProfileStatus(p.id, 'suspended')}>
                          <UserX size={14} />
                        </Button>
                      )}
                      {p.status === 'suspended' && (
                        <Button size="sm" variant="success" onClick={() => updateProfileStatus(p.id, 'active')}>
                          <UserCheck size={14} />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setEditProfile(p); setEditModal(true); }}>
                        <Edit2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Code Modal */}
      <Modal open={codeModal} onClose={() => setCodeModal(false)} title="Générer un code de validation" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Ce code permettra à un nouvel utilisateur de créer un compte caissier ou livreur. L'admin doit communiquer ce code manuellement.
          </p>
          <Select label="Rôle" value={newCodeRole} onChange={(e) => setNewCodeRole(e.target.value as 'caisse' | 'livreur')}>
            <option value="caisse">Caissier</option>
            <option value="livreur">Livreur</option>
          </Select>
          <Button className="w-full" onClick={generateCode}>
            <KeyRound size={16} className="mr-1" /> Générer
          </Button>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Modifier le profil" size="sm">
        {editProfile && (
          <div className="space-y-4">
            <Input
              label="Nom complet"
              value={editProfile.full_name}
              onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })}
            />
            <Input
              label="Téléphone"
              value={editProfile.phone}
              onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
            />
            <Select
              label="Rôle"
              value={editProfile.role}
              onChange={(e) => setEditProfile({ ...editProfile, role: e.target.value as Profile['role'] })}
            >
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Button className="w-full" onClick={() => updateProfile(editProfile.id, editProfile)}>
              Enregistrer
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============= ADMIN DISHES =============
function AdminDishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'plat' as Dish['category'],
    image_url: '',
    is_active: true,
  });

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('dishes').select('*').order('category, name');
    setDishes((data as Dish[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDishes();
  }, [fetchDishes]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: 0, category: 'plat', image_url: '', is_active: true });
    setModal(true);
  };

  const openEdit = (dish: Dish) => {
    setEditing(dish);
    setForm({
      name: dish.name,
      description: dish.description,
      price: dish.price,
      category: dish.category,
      image_url: dish.image_url || '',
      is_active: dish.is_active,
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.name) return;
    if (editing) {
      await supabase.from('dishes').update(form).eq('id', editing.id);
    } else {
      await supabase.from('dishes').insert(form);
    }
    setModal(false);
    fetchDishes();
  };

  const toggleActive = async (dish: Dish) => {
    await supabase.from('dishes').update({ is_active: !dish.is_active }).eq('id', dish.id);
    fetchDishes();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalogue des plats</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les plats du restaurant</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1" /> Ajouter un plat
        </Button>
      </div>

      {loading ? (
        <div className="py-16"><LoadingSpinner size={32} /></div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {dishes.map((dish) => (
            <Card key={dish.id} className={cn('p-4', !dish.is_active && 'opacity-50')}>
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0">
                  {dish.image_url ? (
                    <img src={dish.image_url} alt={dish.name} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <Utensils size={24} className="text-orange-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-900">{dish.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{dish.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={DISH_CATEGORY_COLORS[dish.category]}>
                      {DISH_CATEGORY_LABELS[dish.category]}
                    </Badge>
                    <span className="font-bold text-sm text-orange-600">{formatPrice(dish.price)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <Button size="sm" variant="ghost" onClick={() => openEdit(dish)}>
                  <Edit2 size={14} /> Modifier
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(dish)}>
                  {dish.is_active ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le plat' : 'Nouveau plat'} size="md">
        <div className="space-y-4">
          <Input label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prix (€)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            <Select label="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Dish['category'] })}>
              {Object.entries(DISH_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <Input label="URL de l'image (optionnel)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
          <Button className="w-full" onClick={save}>{editing ? 'Enregistrer' : 'Créer'}</Button>
        </div>
      </Modal>
    </div>
  );
}

// ============= ADMIN REPORTS =============
function AdminReports() {
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [report, setReport] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    deliveryOrders: 0,
    onSiteOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    topDishes: [] as { name: string; quantity: number; revenue: number }[],
    ordersByDay: [] as { date: string; count: number; revenue: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date();
      let startDate: string;
      if (period === 'day') {
        startDate = now.toISOString().split('T')[0];
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
      }

      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      const allOrders = (orders as Order[]) || [];
      const paidOrders = allOrders.filter((o) => o.payment_status === 'paye');
      const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total_amount), 0);
      const deliveryOrders = allOrders.filter((o) => o.type === 'livraison').length;
      const onSiteOrders = allOrders.filter((o) => o.type === 'sur_place').length;

      const dishMap = new Map<string, { quantity: number; revenue: number }>();
      allOrders.forEach((o) => {
        o.order_items?.forEach((item: any) => {
          const existing = dishMap.get(item.dish_name) || { quantity: 0, revenue: 0 };
          existing.quantity += item.quantity;
          existing.revenue += Number(item.subtotal);
          dishMap.set(item.dish_name, existing);
        });
      });
      const topDishes = Array.from(dishMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      const dayMap = new Map<string, { count: number; revenue: number }>();
      allOrders.forEach((o) => {
        const day = o.created_at.split('T')[0];
        const existing = dayMap.get(day) || { count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += Number(o.total_amount);
        dayMap.set(day, existing);
      });
      const ordersByDay = Array.from(dayMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      setReport({
        totalRevenue,
        totalOrders: allOrders.length,
        avgOrderValue: allOrders.length > 0 ? totalRevenue / allOrders.length : 0,
        deliveryOrders,
        onSiteOrders,
        paidOrders: paidOrders.length,
        pendingOrders: allOrders.filter((o) => o.payment_status === 'en_attente').length,
        topDishes,
        ordersByDay,
      });
      setLoading(false);
    })();
  }, [period]);

  const exportReport = () => {
    const csv = [
      ['Métrique', 'Valeur'],
      ['Revenu total', report.totalRevenue.toFixed(2)],
      ['Nombre de commandes', report.totalOrders.toString()],
      ['Valeur moyenne', report.avgOrderValue.toFixed(2)],
      ['Commandes sur place', report.onSiteOrders.toString()],
      ['Commandes livraison', report.deliveryOrders.toString()],
      ['Commandes payées', report.paidOrders.toString()],
      ['Commandes en attente', report.pendingOrders.toString()],
      [],
      ['Top plats', 'Quantité', 'Revenu'],
      ...report.topDishes.map((d) => [d.name, d.quantity.toString(), d.revenue.toFixed(2)]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-16"><LoadingSpinner size={32} /></div>;
  }

  const maxDayRevenue = Math.max(...report.ordersByDay.map((d) => d.revenue), 1);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports de performance</h1>
          <p className="text-sm text-slate-500 mt-1">Statistiques et analyse de l'activité</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as 'day' | 'month' | 'year')} className="w-auto">
            <option value="day">Aujourd'hui</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download size={16} className="mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenu total" value={formatPrice(report.totalRevenue)} icon={<Euro size={22} />} color="green" />
        <StatCard label="Commandes" value={report.totalOrders} icon={<ShoppingBag size={22} />} color="blue" />
        <StatCard label="Valeur moyenne" value={formatPrice(report.avgOrderValue)} icon={<TrendingUp size={22} />} color="purple" />
        <StatCard label="Payées" value={report.paidOrders} icon={<CheckCircle2 size={22} />} color="teal" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Répartition par type</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Sur place</span>
                <span className="font-semibold">{report.onSiteOrders}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${report.totalOrders > 0 ? (report.onSiteOrders / report.totalOrders) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Livraison</span>
                <span className="font-semibold">{report.deliveryOrders}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${report.totalOrders > 0 ? (report.deliveryOrders / report.totalOrders) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Paiements</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Payées</span>
                <span className="font-semibold text-green-600">{report.paidOrders}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${report.totalOrders > 0 ? (report.paidOrders / report.totalOrders) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">En attente</span>
                <span className="font-semibold text-amber-600">{report.pendingOrders}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${report.totalOrders > 0 ? (report.pendingOrders / report.totalOrders) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">Évolution des commandes</h3>
        {report.ordersByDay.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Pas de données pour cette période</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {report.ordersByDay.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                <div
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                  style={{ height: `${(day.revenue / maxDayRevenue) * 100}%`, minHeight: '4px' }}
                  title={`${formatDate(day.date)}: ${formatPrice(day.revenue)}`}
                />
                <span className="text-[8px] text-slate-400 mt-1 hidden lg:inline">
                  {day.date.substring(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Top 10 des plats</h3>
        {report.topDishes.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Aucune donnée</p>
        ) : (
          <div className="space-y-2">
            {report.topDishes.map((dish, idx) => (
              <div key={dish.name} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="w-6 text-center font-bold text-slate-400">{idx + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm text-slate-900">{dish.name}</p>
                  <p className="text-xs text-slate-500">{dish.quantity} vendus</p>
                </div>
                <span className="font-semibold text-slate-900">{formatPrice(dish.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
