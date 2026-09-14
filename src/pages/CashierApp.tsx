import { useState, useEffect, useCallback } from 'react';
import { ChefHat, ClipboardList, CalendarDays, LogOut, Search, Phone, MapPin, Bike, Utensils, Clock, Package, CircleCheck as CheckCircle2, X, Plus, Minus, Trash2, Eye, TrendingUp, Smartphone, Wallet, CreditCard, Banknote } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useDishes, createOrder } from '@/lib/hooks';
import type { CartItem } from '@/types';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_COLORS,
  DISH_CATEGORY_LABELS,
  formatPrice,
  formatDateTime,
} from '@/lib/constants';
import type { Order, DailyMenu, Dish, Profile, DeliveryStatus, PaymentMethod } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState, LoadingSpinner } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

type CashierPage = 'orders' | 'menu';

export function CashierApp() {
  const [page, setPage] = useState<CashierPage>('orders');
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-60 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-5 flex items-center gap-3 border-b border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <ChefHat size={22} />
          </div>
          <div>
            <p className="font-bold text-sm">Le Gourmet</p>
            <p className="text-xs text-slate-400">Espace Caissier</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavButton
            active={page === 'orders'}
            onClick={() => setPage('orders')}
            icon={<ClipboardList size={20} />}
            label="Commandes"
          />
          <NavButton
            active={page === 'menu'}
            onClick={() => setPage('menu')}
            icon={<CalendarDays size={20} />}
            label="Menu du jour"
          />
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'Caissier'}</p>
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

      <main className="flex-1 ml-60">
        {page === 'orders' && <OrdersManagement />}
        {page === 'menu' && <DailyMenuManagement />}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
        active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
      )}
    >
      {icon} {label}
    </button>
  );
}

// ============= ORDERS MANAGEMENT =============
function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [encaisseMethod, setEncaisseMethod] = useState<PaymentMethod>('especes');
  const [deliveryPersons, setDeliveryPersons] = useState<Profile[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [createCart, setCreateCart] = useState<CartItem[]>([]);
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createTable, setCreateTable] = useState('');
  const [createPaymentMethod, setCreatePaymentMethod] = useState<PaymentMethod>('especes');
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const { dishes, loading: dishesLoading } = useDishes();

  const addToCreateCart = (dish: Dish) => {
    setCreateCart((prev) => {
      const existing = prev.find((i) => i.dish_id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dish_id === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { dish_id: dish.id, dish_name: dish.name, unit_price: dish.price, quantity: 1, daily_menu_id: '' }];
    });
  };

  const updateCreateQty = (dishId: string, delta: number) => {
    setCreateCart((prev) =>
      prev
        .map((i) =>
          i.dish_id === dishId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const createTotal = createCart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleCreateOrder = async () => {
    if (!createName || !createPhone) return;
    if (createCart.length === 0) return;
    setCreating(true);
    const { order, error } = await createOrder({
      type: 'sur_place',
      customerName: createName,
      customerPhone: createPhone,
      tableNumber: createTable || undefined,
      paymentMethod: createPaymentMethod,
      items: createCart,
    });
    setCreating(false);
    if (error || !order) return;
    if (createPaymentMethod !== 'especes') {
      await supabase.from('orders').update({ payment_status: 'paye', status: 'en_preparation' }).eq('id', order.id);
    }
    setCreateSuccess(order.order_number);
    setCreateCart([]);
    setCreateName('');
    setCreatePhone('');
    setCreateTable('');
    fetchOrders();
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, order_items:order_items(*), delivery:deliveries(*, delivery_person:profiles!deliveries_delivery_person_id_fkey(*))')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('type', typeFilter);

    const { data } = await query;
    let result = (data as Order[]) || [];

    if (search) {
      const q = search.toUpperCase();
      result = result.filter(
        (o) =>
          o.order_number.includes(q) ||
          o.customer_name.toUpperCase().includes(search.toUpperCase()) ||
          o.customer_phone.includes(search)
      );
    }

    setOrders(result);
    setLoading(false);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const fetchDeliveryPersons = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'livreur')
      .eq('status', 'active');
    setDeliveryPersons((data as Profile[]) || []);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
    fetchOrders();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: status as Order['status'] });
    }
  };

  const markPaid = async (orderId: string, method: PaymentMethod) => {
    await supabase
      .from('orders')
      .update({
        payment_status: 'paye',
        payment_method: method,
        status: 'en_preparation',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    fetchOrders();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, payment_status: 'paye', payment_method: method, status: 'en_preparation' });
    }
    setPaymentModal(false);
  };

  const assignDelivery = async (orderId: string, deliveryPersonId: string) => {
    await supabase.from('orders').update({ status: 'en_livraison' }).eq('id', orderId);
    await supabase.from('deliveries').insert({
      order_id: orderId,
      delivery_person_id: deliveryPersonId,
      status: 'assigne',
    });
    fetchOrders();
    setAssignModal(false);
  };

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const stats = {
    pending: orders.filter((o) => o.status === 'en_attente').length,
    preparing: orders.filter((o) => o.status === 'en_preparation').length,
    ready: orders.filter((o) => o.status === 'pret').length,
    delivering: orders.filter((o) => o.status === 'en_livraison').length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Commandes</h1>
          <p className="text-sm text-slate-500 mt-1">Encaissez, suivez et assignez les commandes</p>
        </div>
        <Button onClick={() => { setCreateSuccess(null); setCreateModal(true); }}>
          <Plus size={16} className="mr-1" /> Nouvelle commande
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="En attente" value={stats.pending} icon={<Clock size={22} />} color="orange" />
        <StatCard label="En préparation" value={stats.preparing} icon={<ChefHat size={22} />} color="blue" />
        <StatCard label="Prêtes" value={stats.ready} icon={<Package size={22} />} color="teal" />
        <StatCard label="En livraison" value={stats.delivering} icon={<Bike size={22} />} color="purple" />
      </div>

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par numéro, nom, téléphone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="all">Tous les statuts</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-auto">
            <option value="all">Tous types</option>
            <option value="sur_place">Sur place</option>
            <option value="livraison">Livraison</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="py-16"><LoadingSpinner size={32} /></div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="Aucune commande"
          description="Les nouvelles commandes apparaîtront ici."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">N° Commande</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Montant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Paiement</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Heure</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{order.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{order.customer_name || 'Client'}</p>
                    <p className="text-xs text-slate-400">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600">{ORDER_TYPE_LABELS[order.type]}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatPrice(order.total_amount)}</td>
                  <td className="px-4 py-3">
                    <Badge className={ORDER_STATUS_COLORS[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={PAYMENT_STATUS_COLORS[order.payment_status]}>
                      {PAYMENT_STATUS_LABELS[order.payment_status]}
                    </Badge>
                    {order.payment_method && (
                      <span className="text-xs text-slate-400 block mt-0.5">
                        {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(order.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => openDetail(order)}>
                      <Eye size={14} /> Détails
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`Commande ${selectedOrder?.order_number || ''}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Client</p>
                <p className="font-semibold text-slate-900">{selectedOrder.customer_name || 'Client'}</p>
                <p className="text-sm text-slate-500">{selectedOrder.customer_phone}</p>
                {selectedOrder.customer_email && <p className="text-sm text-slate-500">{selectedOrder.customer_email}</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Type</p>
                <p className="font-semibold text-slate-900">{ORDER_TYPE_LABELS[selectedOrder.type]}</p>
                {selectedOrder.table_number && <p className="text-sm text-slate-500">Table: {selectedOrder.table_number}</p>}
                {selectedOrder.delivery_address && (
                  <p className="text-sm text-slate-500 flex items-start gap-1">
                    <MapPin size={14} className="mt-0.5" /> {selectedOrder.delivery_address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge className={ORDER_STATUS_COLORS[selectedOrder.status]}>
                {ORDER_STATUS_LABELS[selectedOrder.status]}
              </Badge>
              <Badge className={PAYMENT_STATUS_COLORS[selectedOrder.payment_status]}>
                {PAYMENT_STATUS_LABELS[selectedOrder.payment_status]}
              </Badge>
              {selectedOrder.payment_method && (
                <Badge className={PAYMENT_METHOD_COLORS[selectedOrder.payment_method as PaymentMethod]}>
                  {PAYMENT_METHOD_LABELS[selectedOrder.payment_method as PaymentMethod]}
                </Badge>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-slate-900 mb-2">Articles</h4>
              <div className="space-y-2">
                {selectedOrder.order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{item.quantity}x {item.dish_name}</span>
                    <span className="font-medium">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              {(selectedOrder as any).delivery_fee > 0 && (
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Frais de livraison</span>
                  <span className="font-medium">{formatPrice((selectedOrder as any).delivery_fee)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 mt-3 pt-3 flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg text-slate-900">{formatPrice(selectedOrder.total_amount)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-700">Notes du client</p>
                <p className="text-sm text-amber-800 mt-1">{selectedOrder.notes}</p>
              </div>
            )}

            {(selectedOrder as any).delivery?.[0]?.delivery_person && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700">Livreur assigné</p>
                <p className="text-sm text-blue-800 mt-1">
                  {(selectedOrder as any).delivery[0].delivery_person.full_name} - {(selectedOrder as any).delivery[0].delivery_person.phone}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className={ORDER_STATUS_COLORS[selectedOrder.status]}>
                  {ORDER_STATUS_LABELS[selectedOrder.status]}
                </Badge>
                <Badge className={PAYMENT_STATUS_COLORS[selectedOrder.payment_status]}>
                  {PAYMENT_STATUS_LABELS[selectedOrder.payment_status]}
                </Badge>
              </div>

              <div className="flex gap-2 flex-wrap">
                {selectedOrder.payment_status === 'en_attente' && (
                  <Button
                    variant="success"
                    onClick={() => {
                      setEncaisseMethod((selectedOrder.payment_method as PaymentMethod) || 'especes');
                      setPaymentModal(true);
                    }}
                    className="flex-1"
                  >
                    <CheckCircle2 size={16} className="mr-1" /> Encaisser
                  </Button>
                )}
                {selectedOrder.payment_status === 'paye' &&
                  selectedOrder.status === 'en_preparation' && (
                    <Button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'pret')}
                      className="flex-1"
                    >
                      <Package size={16} className="mr-1" /> Marquer prêt
                    </Button>
                  )}
                {selectedOrder.type === 'sur_place' &&
                  selectedOrder.status === 'pret' && (
                    <Button
                      variant="success"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'recupere')}
                      className="flex-1"
                    >
                      <CheckCircle2 size={16} className="mr-1" /> Marquer récupéré
                    </Button>
                  )}
                {selectedOrder.type === 'livraison' &&
                  selectedOrder.status === 'pret' &&
                  selectedOrder.payment_status === 'paye' && (
                    <Button
                      onClick={() => {
                        fetchDeliveryPersons();
                        setAssignModal(true);
                      }}
                      className="flex-1"
                    >
                      <Bike size={16} className="mr-1" /> Assigner un livreur
                    </Button>
                  )}
              </div>

              {(selectedOrder.status === 'livre' ||
                selectedOrder.status === 'recupere' ||
                selectedOrder.status === 'en_livraison') && (
                <p className="text-xs text-slate-400 text-center">
                  {selectedOrder.status === 'en_livraison'
                    ? 'Commande en cours de livraison par le livreur.'
                    : 'Cycle de la commande terminé.'}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment / Encaissement Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Encaisser le paiement" size="sm">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-400">Montant à encaisser</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{formatPrice(selectedOrder.total_amount)}</p>
              <p className="text-xs text-slate-500 mt-1">Commande {selectedOrder.order_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Mode de paiement</p>
              <div className="grid grid-cols-2 gap-2">
                {(['especes', 'wave', 'orange_money', 'carte'] as PaymentMethod[]).map((m) => {
                  const icons: Record<PaymentMethod, React.ReactNode> = {
                    especes: <Banknote size={18} />,
                    wave: <Smartphone size={18} />,
                    orange_money: <Wallet size={18} />,
                    carte: <CreditCard size={18} />,
                  };
                  return (
                    <button
                      key={m}
                      onClick={() => setEncaisseMethod(m)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-3 rounded-lg border-2 transition-all text-sm font-medium',
                        encaisseMethod === m
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      )}
                    >
                      {icons[m]}
                      <span>{PAYMENT_METHOD_LABELS[m]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              variant="success"
              className="w-full"
              size="lg"
              onClick={() => markPaid(selectedOrder.id, encaisseMethod)}
            >
              <CheckCircle2 size={18} className="mr-1" /> Confirmer l'encaissement
            </Button>
          </div>
        )}
      </Modal>

      {/* Assign Delivery Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assigner un livreur" size="sm">
        <div className="space-y-2">
          {deliveryPersons.length === 0 ? (
            <EmptyState
              icon={<Bike size={24} />}
              title="Aucun livreur disponible"
              description="Aucun livreur actif n'est disponible."
            />
          ) : (
            deliveryPersons.map((person) => (
              <button
                key={person.id}
                onClick={() => selectedOrder && assignDelivery(selectedOrder.id, person.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                  {person.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-slate-900">{person.full_name}</p>
                  <p className="text-xs text-slate-500">{person.phone}</p>
                </div>
                <Bike size={18} className="text-slate-300" />
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Create Order Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nouvelle commande sur place" size="lg">
        {createSuccess ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Commande créée !</h2>
            <p className="text-3xl font-bold text-orange-600 mt-3">{createSuccess}</p>
            <Button className="mt-6" onClick={() => { setCreateSuccess(null); setCreateModal(false); }}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nom du client" value={createName} onChange={(e) => setCreateName(e.target.value)} required />
              <Input label="Téléphone" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} required />
            </div>
            <Input label="Numéro de table" value={createTable} onChange={(e) => setCreateTable(e.target.value)} placeholder="Ex: Table 5" />

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Ajouter des plats</p>
              {dishesLoading ? (
                <div className="py-4"><LoadingSpinner /></div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
                  {dishes.map((dish) => (
                    <button
                      key={dish.id}
                      onClick={() => addToCreateCart(dish)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{dish.name}</p>
                        <p className="text-xs text-slate-400">{DISH_CATEGORY_LABELS[dish.category]}</p>
                      </div>
                      <span className="text-sm font-semibold text-orange-600 mr-2">{formatPrice(dish.price)}</span>
                      <Plus size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {createCart.length > 0 && (
              <div className="space-y-2 border border-slate-200 rounded-lg p-3">
                {createCart.map((item) => (
                  <div key={item.dish_id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-slate-700">{item.dish_name}</span>
                    <button onClick={() => updateCreateQty(item.dish_id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
                      <Minus size={14} />
                    </button>
                    <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateCreateQty(item.dish_id, 1)} className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 hover:bg-orange-200">
                      <Plus size={14} />
                    </button>
                    <span className="font-bold text-sm w-16 text-right">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-bold text-lg text-orange-600">{formatPrice(createTotal)}</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Mode de paiement</p>
              <div className="grid grid-cols-4 gap-2">
                {(['especes', 'wave', 'orange_money', 'carte'] as PaymentMethod[]).map((m) => {
                  const icons: Record<PaymentMethod, React.ReactNode> = {
                    especes: <Banknote size={16} />,
                    wave: <Smartphone size={16} />,
                    orange_money: <Wallet size={16} />,
                    carte: <CreditCard size={16} />,
                  };
                  return (
                    <button
                      key={m}
                      onClick={() => setCreatePaymentMethod(m)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border-2 transition-all text-xs font-medium',
                        createPaymentMethod === m
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      )}
                    >
                      {icons[m]}
                      <span>{PAYMENT_METHOD_LABELS[m]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateOrder}
              disabled={creating || !createName || !createPhone || createCart.length === 0}
            >
              {creating ? 'Création...' : `Créer — ${formatPrice(createTotal)}`}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============= DAILY MENU MANAGEMENT =============
function DailyMenuManagement() {
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [addModal, setAddModal] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState('');
  const [quantity, setQuantity] = useState(20);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('daily_menus')
      .select('*, dish:dishes(*)')
      .eq('menu_date', selectedDate)
      .order('created_at');
    setMenus((data as DailyMenu[]) || []);
    setLoading(false);
  }, [selectedDate]);

  const fetchDishes = useCallback(async () => {
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setDishes((data as Dish[]) || []);
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  useEffect(() => {
    fetchDishes();
  }, [fetchDishes]);

  const updateQuantity = async (menuId: string, newQty: number) => {
    if (newQty < 0) return;
    await supabase.from('daily_menus').update({ quantity_available: newQty }).eq('id', menuId);
    fetchMenus();
  };

  const removeDish = async (menuId: string) => {
    await supabase.from('daily_menus').delete().eq('id', menuId);
    fetchMenus();
  };

  const addDish = async () => {
    if (!selectedDishId) return;
    const { error } = await supabase.from('daily_menus').insert({
      dish_id: selectedDishId,
      menu_date: selectedDate,
      quantity_available: quantity,
    });
    if (!error) {
      setAddModal(false);
      setSelectedDishId('');
      setQuantity(20);
      fetchMenus();
    }
  };

  const availableDishes = dishes.filter(
    (d) => !menus.some((m) => m.dish_id === d.id)
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Menu du Jour</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez les plats disponibles et leurs quantités</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button onClick={() => setAddModal(true)}>
            <Plus size={16} className="mr-1" /> Ajouter un plat
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16"><LoadingSpinner size={32} /></div>
      ) : menus.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Aucun plat au menu"
          description="Ajoutez des plats du catalogue au menu du jour."
          action={
            <Button onClick={() => setAddModal(true)}>
              <Plus size={16} className="mr-1" /> Ajouter un plat
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {menus.map((menu) => {
            const remaining = menu.quantity_available - menu.quantity_sold;
            return (
              <Card key={menu.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0">
                    {menu.dish?.image_url ? (
                      <img src={menu.dish.image_url} alt={menu.dish.name} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <Utensils size={24} className="text-orange-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm text-slate-900">{menu.dish?.name}</h3>
                        {menu.dish && (
                          <Badge className={cn('mt-1', DISH_CATEGORY_LABELS[menu.dish.category] ? 'border-slate-200' : '')}>
                            {DISH_CATEGORY_LABELS[menu.dish.category]}
                          </Badge>
                        )}
                      </div>
                      <button
                        onClick={() => removeDish(menu.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{formatPrice(menu.dish?.price || 0)}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">Quantité disponible</span>
                    <span className={cn(
                      'text-xs font-medium',
                      remaining <= 3 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {remaining} restants
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(menu.id, menu.quantity_available - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={menu.quantity_available}
                      onChange={(e) => updateQuantity(menu.id, Number(e.target.value))}
                      className="w-16 text-center px-2 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => updateQuantity(menu.id, menu.quantity_available + 1)}
                      className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200"
                    >
                      <Plus size={14} />
                    </button>
                    <div className="flex-1 text-right">
                      <span className="text-xs text-slate-400">Vendus: {menu.quantity_sold}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dish Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Ajouter un plat au menu" size="md">
        <div className="space-y-4">
          {availableDishes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Tous les plats sont déjà au menu.</p>
          ) : (
            <>
              <Select
                label="Plat"
                value={selectedDishId}
                onChange={(e) => setSelectedDishId(e.target.value)}
              >
                <option value="">Sélectionner un plat...</option>
                {availableDishes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} - {formatPrice(d.price)}
                  </option>
                ))}
              </Select>
              <Input
                label="Quantité disponible"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <Button className="w-full" onClick={addDish} disabled={!selectedDishId}>
                Ajouter au menu
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
