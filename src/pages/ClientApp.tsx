import { useState, useEffect, useRef } from 'react';
import { ChefHat, Chrome as Home, Utensils, Search, ShoppingCart, CalendarPlus, User, Clock, MapPin, Phone, Package, CircleCheck as CheckCircle2, X, Plus, Minus, Trash2, ArrowRight, Bike, Info, CreditCard, Wallet, Smartphone, Navigation, Loader as Loader2, LocateFixed, Banknote, Printer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDailyMenu, useDishes, createOrder, fetchOrderByNumber, createReservation } from '@/lib/hooks';
import {
  DISH_CATEGORY_LABELS,
  DISH_CATEGORY_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_COLORS,
  formatPrice,
  formatDate,
  formatTime,
  DELIVERY_FEE_BASE,
  DELIVERY_FEE_PER_KM,
} from '@/lib/constants';
import type { CartItem, DailyMenu, Dish, DishCategory, Order, PaymentMethod } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState, LoadingSpinner } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

// Restaurant coordinates (default center for map)
const RESTAURANT_LAT = 14.6928;
const RESTAURANT_LNG = -17.4467;

type ClientPage = 'home' | 'menu' | 'cart' | 'tracking' | 'reservation' | 'profile';

export function ClientApp({ onStaffLogin }: { onStaffLogin?: () => void }) {
  const [page, setPage] = useState<ClientPage>('home');
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish_id === item.dish_id);
      if (existing) {
        return prev.map((i) =>
          i.dish_id === item.dish_id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  };

  const updateQty = (dishId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.dish_id === dishId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (dishId: string) => {
    setCart((prev) => prev.filter((i) => i.dish_id !== dishId));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto">
      <ClientHeader cartCount={cartCount} onNav={setPage} page={page} onStaffLogin={onStaffLogin} />
      <div className="flex-1 pb-20">
        {page === 'home' && <HomePage onNav={setPage} />}
        {page === 'menu' && <MenuPage onAddToCart={addToCart} cart={cart} />}
        {page === 'cart' && (
          <CartPage
            cart={cart}
            cartTotal={cartTotal}
            onUpdateQty={updateQty}
            onRemove={removeFromCart}
            onClear={clearCart}
            onNav={setPage}
          />
        )}
        {page === 'tracking' && <TrackingPage />}
        {page === 'reservation' && <ReservationPage />}
        {page === 'profile' && <ProfilePage onNav={setPage} />}
      </div>
      <ClientBottomNav page={page} onNav={setPage} cartCount={cartCount} />
    </div>
  );
}

function ClientHeader({
  cartCount,
  onNav,
  page,
  onStaffLogin,
}: {
  cartCount: number;
  onNav: (p: ClientPage) => void;
  page: ClientPage;
  onStaffLogin?: () => void;
}) {
  const { profile, signOut } = useAuth();

  const titles: Record<ClientPage, string> = {
    home: 'Le Gourmet',
    menu: 'Notre Carte',
    cart: 'Mon Panier',
    tracking: 'Suivi Commande',
    reservation: 'Réservation',
    profile: 'Mon Profil',
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => onNav('home')} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center">
            <ChefHat size={20} />
          </div>
          <span className="font-bold text-slate-900">{titles[page]}</span>
        </button>
        <div className="flex items-center gap-2">
          {profile && (
            <span className="text-sm text-slate-500 hidden sm:inline">{profile.full_name}</span>
          )}
          {profile ? (
            <button
              onClick={() => signOut()}
              className="text-sm text-slate-400 hover:text-red-600 px-2"
            >
              Déconnexion
            </button>
          ) : onStaffLogin ? (
            <button
              onClick={onStaffLogin}
              className="text-sm text-slate-400 hover:text-slate-600 px-2"
            >
              Staff
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ClientBottomNav({
  page,
  onNav,
  cartCount,
}: {
  page: ClientPage;
  onNav: (p: ClientPage) => void;
  cartCount: number;
}) {
  const items: { id: ClientPage; icon: React.ReactNode; label: string }[] = [
    { id: 'home', icon: <Home size={22} />, label: 'Accueil' },
    { id: 'menu', icon: <Utensils size={22} />, label: 'Carte' },
    { id: 'cart', icon: <ShoppingCart size={22} />, label: 'Panier' },
    { id: 'tracking', icon: <Search size={22} />, label: 'Suivi' },
    { id: 'profile', icon: <User size={22} />, label: 'Profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 z-30">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors relative',
              page === item.id ? 'text-orange-600' : 'text-slate-400'
            )}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
            {item.id === 'cart' && cartCount > 0 && (
              <span className="absolute -top-1 right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ============= HOME PAGE =============
function HomePage({ onNav }: { onNav: (p: ClientPage) => void }) {
  const { menus, loading } = useDailyMenu();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMenus = menus.filter((m) => {
    if (!m.dish) return false;
    const q = searchQuery.toLowerCase();
    return (
      m.dish.name.toLowerCase().includes(q) ||
      m.dish.description.toLowerCase().includes(q)
    );
  });

  const availableMenus = filteredMenus.filter((m) => m.quantity_available - m.quantity_sold > 0);

  const categories = Array.from(new Set(menus.map((m) => m.dish?.category).filter(Boolean)));

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white px-4 pt-10 pb-8">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }} />
        <div className="relative">
          <p className="text-orange-100 text-sm">Bienvenue{profile ? `, ${profile.full_name}` : ''} !</p>
          <h1 className="text-3xl font-bold mt-1">Le Gourmet</h1>
          <p className="text-orange-100 mt-2 text-sm">
            Cuisine raffinée, préparée avec passion. Découvrez notre menu du jour.
          </p>
          <div className="flex gap-3 mt-5">
            <Button
              onClick={() => onNav('menu')}
              className="bg-white text-orange-600 hover:bg-orange-50"
              size="sm"
            >
              <Utensils size={16} className="mr-1" /> Voir la carte
            </Button>
            <Button
              onClick={() => onNav('reservation')}
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10"
              size="sm"
            >
              <CalendarPlus size={16} className="mr-1" /> Réserver
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un plat..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Menu du jour */}
      <div className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-orange-600" />
          <h2 className="text-lg font-bold text-slate-900">Menu du Jour</h2>
          <span className="text-xs text-slate-400">{formatDate(new Date().toISOString())}</span>
        </div>

        {loading ? (
          <div className="py-12"><LoadingSpinner /></div>
        ) : availableMenus.length === 0 ? (
          <EmptyState
            icon={<Utensils size={28} />}
            title="Aucun plat disponible"
            description="Le menu du jour n'a pas encore de plats disponibles."
          />
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const items = availableMenus.filter((m) => m.dish?.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2 mt-4">
                    <Badge className={DISH_CATEGORY_COLORS[cat as DishCategory]}>
                      {DISH_CATEGORY_LABELS[cat as DishCategory]}
                    </Badge>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  {items.map((m) => (
                <DailyMenuCard key={m.id} menu={m} onNav={onNav} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-8 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Accès Rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionCard
            icon={<Search size={24} />}
            title="Suivre commande"
            description="Entrez votre numéro"
            color="bg-blue-50 text-blue-600"
            onClick={() => onNav('tracking')}
          />
          <QuickActionCard
            icon={<CalendarPlus size={24} />}
            title="Réserver une table"
            description="Pour une date future"
            color="bg-teal-50 text-teal-600"
            onClick={() => onNav('reservation')}
          />
        </div>
      </div>
    </div>
  );
}

function DailyMenuCard({ menu, onNav }: { menu: DailyMenu; onNav: (p: ClientPage) => void }) {
  const remaining = menu.quantity_available - menu.quantity_sold;
  if (!menu.dish) return null;

  return (
    <Card className="p-4 mb-2.5">
      <div className="flex gap-3">
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0">
          {menu.dish.image_url ? (
            <img src={menu.dish.image_url} alt={menu.dish.name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <Utensils size={28} className="text-orange-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 text-sm">{menu.dish.name}</h3>
            <span className="font-bold text-orange-600 text-sm whitespace-nowrap">
              {formatPrice(menu.dish.price)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{menu.dish.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className={cn(
              'text-xs font-medium',
              remaining <= 3 ? 'text-red-600' : 'text-green-600'
            )}>
              {remaining > 0 ? `${remaining} dispo` : 'Épuisé'}
            </span>
            <Button
              size="sm"
              onClick={() => onNav('menu')}
              disabled={remaining <= 0}
              className="h-7 px-3 text-xs"
            >
              <Plus size={14} className="mr-0.5" /> Ajouter
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <Card className="p-4" onClick={onClick}>
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3', color)}>
        {icon}
      </div>
      <h3 className="font-semibold text-sm text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </Card>
  );
}

// ============= MENU PAGE =============
function MenuPage({
  onAddToCart,
  cart,
}: {
  onAddToCart: (item: CartItem) => void;
  cart: CartItem[];
}) {
  const { menus, loading } = useDailyMenu();
  const [category, setCategory] = useState<DishCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = menus.filter((m) => {
    if (!m.dish) return false;
    if (category !== 'all' && m.dish.category !== category) return false;
    if (search && !m.dish.name.toLowerCase().includes(search.toLowerCase())) return false;
    return m.quantity_available - m.quantity_sold > 0;
  });

  const categories: (DishCategory | 'all')[] = ['all', 'entree', 'plat', 'dessert', 'boisson'];

  return (
    <div className="px-4 pt-4">
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              category === cat
                ? 'bg-orange-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            )}
          >
            {cat === 'all' ? 'Tout' : DISH_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Utensils size={28} />}
          title="Aucun plat trouvé"
          description="Essayez une autre catégorie ou recherche."
        />
      ) : (
        <div className="space-y-3 pb-4">
          {filtered.map((m) => (
            <MenuDishCard
              key={m.id}
              menu={m}
              onAdd={() =>
                onAddToCart({
                  dish_id: m.dish_id,
                  dish_name: m.dish?.name || '',
                  unit_price: m.dish?.price || 0,
                  quantity: 1,
                  daily_menu_id: m.id,
                })
              }
              inCart={cart.find((c) => c.dish_id === m.dish_id)?.quantity || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuDishCard({
  menu,
  onAdd,
  inCart,
}: {
  menu: DailyMenu;
  onAdd: () => void;
  inCart: number;
}) {
  if (!menu.dish) return null;
  const remaining = menu.quantity_available - menu.quantity_sold;

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0">
          {menu.dish.image_url ? (
            <img src={menu.dish.image_url} alt={menu.dish.name} className="w-full h-full object-cover" />
          ) : (
            <Utensils size={28} className="text-orange-400" />
          )}
        </div>
        <div className="flex-1 p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-slate-900">{menu.dish.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{menu.dish.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-bold text-orange-600">{formatPrice(menu.dish.price)}</span>
              <span className="text-xs text-slate-400 ml-2">{remaining} restants</span>
            </div>
            <Button
              size="sm"
              onClick={onAdd}
              disabled={remaining <= 0}
              className="h-8 px-3"
            >
              {inCart > 0 ? (
                <><Plus size={14} className="mr-0.5" /> {inCart}</>
              ) : (
                <><Plus size={14} className="mr-0.5" /> Ajouter</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============= Haversine distance =============
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeDeliveryFee(km: number): number {
  return DELIVERY_FEE_BASE + Math.round(km) * DELIVERY_FEE_PER_KM;
}

// ============= CART PAGE =============
function CartPage({
  cart,
  cartTotal,
  onUpdateQty,
  onRemove,
  onClear,
  onNav,
}: {
  cart: CartItem[];
  cartTotal: number;
  onUpdateQty: (dishId: string, delta: number) => void;
  onRemove: (dishId: string) => void;
  onClear: () => void;
  onNav: (p: ClientPage) => void;
}) {
  const { profile } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderType, setOrderType] = useState<'sur_place' | 'livraison'>('sur_place');
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wave');
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [deliveryKm, setDeliveryKm] = useState<number | null>(null);

  const deliveryFee = deliveryKm !== null ? computeDeliveryFee(deliveryKm) : 0;
  const grandTotal = cartTotal + (orderType === 'livraison' ? deliveryFee : 0);

  const useMyLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée sur cet appareil.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDeliveryLat(lat);
        setDeliveryLng(lng);
        const km = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
        setDeliveryKm(km);
        if (!deliveryAddress) {
          setDeliveryAddress(`Position GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setLocating(false);
      },
      (err) => {
        setError('Impossible d\'obtenir votre position: ' + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const estimateDeliveryFromAddress = async () => {
    if (!deliveryAddress.trim()) {
      setDeliveryKm(null);
      setDeliveryLat(null);
      setDeliveryLng(null);
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(deliveryAddress)}&limit=1`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setDeliveryLat(lat);
        setDeliveryLng(lng);
        const km = haversineKm(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
        setDeliveryKm(km);
      } else {
        setDeliveryKm(null);
      }
    } catch {
      setDeliveryKm(null);
    }
  };

  useEffect(() => {
    if (orderType === 'livraison' && deliveryAddress.trim() && deliveryLat === null) {
      const timer = setTimeout(() => estimateDeliveryFromAddress(), 1200);
      return () => clearTimeout(timer);
    }
  }, [deliveryAddress, orderType]);

  const handleCheckout = async () => {
    if (!name || !phone) {
      setError('Nom et téléphone sont requis.');
      return;
    }
    if (orderType === 'livraison') {
      if (!deliveryAddress) {
        setError('L\'adresse de livraison est requise.');
        return;
      }
      if (deliveryKm === null) {
        setError('Impossible de calculer l\'itinéraire. Utilisez "Ma position" ou vérifiez l\'adresse.');
        return;
      }
    }
    setSubmitting(true);
    setError(null);

    const { order, error: err } = await createOrder({
      type: orderType,
      customerName: name,
      customerPhone: phone,
      customerEmail: email || undefined,
      customerId: profile?.id,
      tableNumber: orderType === 'sur_place' ? tableNumber || undefined : undefined,
      deliveryAddress: orderType === 'livraison' ? deliveryAddress : undefined,
      deliveryLat: orderType === 'livraison' ? deliveryLat || undefined : undefined,
      deliveryLng: orderType === 'livraison' ? deliveryLng || undefined : undefined,
      deliveryFee: orderType === 'livraison' ? deliveryFee : 0,
      paymentMethod,
      notes: notes || undefined,
      items: cart,
    });

    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccessOrder(order);
    onClear();
    setCheckoutOpen(false);
  };

  if (successOrder) {
    return (
      <div className="px-4 pt-8">
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Commande confirmée !</h2>
          <p className="text-slate-500 text-sm mt-2">
            Conservez votre numéro de commande pour suivre sa préparation.
          </p>
          <div className="mt-6 w-full">
            <Card className="p-6 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Votre numéro de commande</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{successOrder.order_number}</p>
              <p className="text-sm text-slate-500 mt-3">
                {ORDER_TYPE_LABELS[successOrder.type]} • {formatPrice(successOrder.total_amount)}
              </p>
              {successOrder.payment_method && (
                <p className="text-xs text-slate-400 mt-1">
                  Paiement: {PAYMENT_METHOD_LABELS[successOrder.payment_method]}
                </p>
              )}
            </Card>
          </div>
          <div className="flex gap-3 mt-6 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSuccessOrder(null);
                onNav('home');
              }}
            >
              Retour à l'accueil
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setSuccessOrder(null);
                onNav('tracking');
              }}
            >
              Suivre ma commande
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="px-4 pt-4">
        <EmptyState
          icon={<ShoppingCart size={28} />}
          title="Votre panier est vide"
          description="Parcourez notre carte et ajoutez des plats à votre commande."
          action={
            <Button onClick={() => onNav('menu')}>
              <Utensils size={16} className="mr-1" /> Voir la carte
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">{cart.length} article(s)</h2>
        <button
          onClick={onClear}
          className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
        >
          <Trash2 size={14} /> Vider
        </button>
      </div>

      <div className="space-y-2.5">
        {cart.map((item) => (
          <Card key={item.dish_id} className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900">{item.dish_name}</h3>
                <p className="text-xs text-slate-500">{formatPrice(item.unit_price)} / unité</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQty(item.dish_id, -1)}
                  className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                >
                  <Minus size={14} />
                </button>
                <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQty(item.dish_id, 1)}
                  className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 hover:bg-orange-200"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="text-right w-16">
                <p className="font-bold text-sm text-slate-900">
                  {formatPrice(item.unit_price * item.quantity)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="text-2xl font-bold text-orange-600">{formatPrice(cartTotal)}</span>
          </div>
        </Card>
      </div>

      <Button
        className="w-full mt-4"
        size="lg"
        onClick={() => setCheckoutOpen(true)}
      >
        <ArrowRight size={18} className="mr-1" /> Commander
      </Button>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Finaliser la commande" size="lg">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Order type */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Type de commande</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType('sur_place')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all text-sm font-medium',
                  orderType === 'sur_place'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 text-slate-500'
                )}
              >
                <Utensils size={16} /> Sur place
              </button>
              <button
                onClick={() => setOrderType('livraison')}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all text-sm font-medium',
                  orderType === 'livraison'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 text-slate-500'
                )}
              >
                <Bike size={16} /> Livraison
              </button>
            </div>
          </div>

          <Input label="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input
            label="Email (optionnel)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {orderType === 'sur_place' ? (
            <Input
              label="Numéro de table"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Ex: Table 5"
            />
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Adresse de livraison</label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    setDeliveryKm(null);
                    setDeliveryLat(null);
                    setDeliveryLng(null);
                  }}
                  placeholder="123 rue de Paris, Dakar"
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                />
                <button
                  onClick={useMyLocation}
                  disabled={locating}
                  className="px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                  Ma position
                </button>
              </div>

              {/* Delivery map preview */}
              <DeliveryMapPreview
                deliveryLat={deliveryLat}
                deliveryLng={deliveryLng}
                deliveryKm={deliveryKm}
              />

              {deliveryKm !== null && (
                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">
                      Distance: {deliveryKm.toFixed(1)} km
                    </span>
                  </div>
                  <span className="text-sm font-bold text-blue-700">
                    Frais: {formatPrice(deliveryFee)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Payment method */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              <PaymentMethodButton
                method="wave"
                selected={paymentMethod === 'wave'}
                onClick={() => setPaymentMethod('wave')}
                icon={<Smartphone size={18} />}
                label="Wave"
              />
              <PaymentMethodButton
                method="orange_money"
                selected={paymentMethod === 'orange_money'}
                onClick={() => setPaymentMethod('orange_money')}
                icon={<Wallet size={18} />}
                label="Orange Money"
              />
              <PaymentMethodButton
                method="carte"
                selected={paymentMethod === 'carte'}
                onClick={() => setPaymentMethod('carte')}
                icon={<CreditCard size={18} />}
                label="Carte bancaire"
              />
              <PaymentMethodButton
                method="especes"
                selected={paymentMethod === 'especes'}
                onClick={() => setPaymentMethod('especes')}
                icon={<Banknote size={18} />}
                label="Espèces"
              />
            </div>
            {paymentMethod === 'carte' && !profile && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <Info size={12} /> Le paiement par carte nécessite un compte client.
              </p>
            )}
          </div>

          <Textarea
            label="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Allergies, préférences..."
            rows={2}
          />

          {/* Total summary */}
          <Card className="p-4 bg-slate-50">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Sous-total</span>
                <span className="font-medium text-slate-900">{formatPrice(cartTotal)}</span>
              </div>
              {orderType === 'livraison' && deliveryKm !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Frais de livraison</span>
                  <span className="font-medium text-slate-900">{formatPrice(deliveryFee)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                <span className="font-semibold text-slate-900">Total à payer</span>
                <span className="text-xl font-bold text-orange-600">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting ? 'Envoi...' : `Confirmer — ${formatPrice(grandTotal)}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function PaymentMethodButton({
  method,
  selected,
  onClick,
  icon,
  label,
}: {
  method: PaymentMethod;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-3 rounded-lg border-2 transition-all text-sm font-medium',
        selected
          ? 'border-orange-500 bg-orange-50 text-orange-700'
          : 'border-slate-200 text-slate-500 hover:border-slate-300'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ============= DELIVERY MAP PREVIEW =============
function DeliveryMapPreview({
  deliveryLat,
  deliveryLng,
  deliveryKm,
}: {
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryKm: number | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);

  useEffect(() => {
    if (deliveryLat === null || deliveryLng === null) {
      setMapUrl(null);
      return;
    }
    const delta = 0.01;
    const bbox = `${RESTAURANT_LNG - delta},${RESTAURANT_LAT - delta},${RESTAURANT_LNG + delta},${RESTAURANT_LAT + delta}`;
    const markerRest = `${RESTAURANT_LNG},${RESTAURANT_LAT}`;
    const markerDest = `${deliveryLng},${deliveryLat}`;
    setMapUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${markerRest},${markerDest}&layer=mapnik`
    );
  }, [deliveryLat, deliveryLng]);

  if (deliveryLat === null || deliveryLng === null) {
    return (
      <div className="w-full h-32 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
        <div className="text-center">
          <MapPin size={24} className="text-slate-400 mx-auto mb-1" />
          <p className="text-xs text-slate-400">
            {deliveryKm === null ? 'Entrez l\'adresse ou utilisez votre position' : 'Calcul de l\'itinéraire...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
      {mapUrl && (
        <iframe
          title="Delivery map"
          src={mapUrl}
          className="w-full h-full"
          style={{ border: 0 }}
          loading="lazy"
        />
      )}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-medium text-slate-700 flex items-center gap-1">
        <Navigation size={12} className="text-blue-600" />
        {deliveryKm !== null ? `${deliveryKm.toFixed(1)} km` : '...'}
      </div>
    </div>
  );
}

// ============= TRACKING PAGE =============
function TrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    const { order: o, error: err } = await fetchOrderByNumber(orderNumber);
    setLoading(false);
    if (err) {
      setError(err);
      setOrder(null);
    } else if (!o) {
      setError('Aucune commande trouvée avec ce numéro.');
      setOrder(null);
    } else {
      setOrder(o);
    }
  };

  const statusSteps = order?.type === 'livraison'
    ? ['en_attente', 'en_preparation', 'pret', 'en_livraison', 'livre']
    : ['en_attente', 'en_preparation', 'pret', 'recupere'];
  const currentStep = order ? statusSteps.indexOf(order.status) : -1;

  const printReceipt = () => {
    if (!order) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    const items = order.order_items || [];
    const dateStr = new Date(order.created_at).toLocaleString('fr-FR');
    const methodLabel = order.payment_method ? PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod] : '—';
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recu ${order.order_number}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:'Courier New',monospace;}
      body{padding:24px;color:#1e293b;font-size:13px;line-height:1.5;}
      .header{text-align:center;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;}
      .header h1{font-size:20px;font-weight:bold;}.header p{font-size:11px;color:#64748b;margin-top:2px;}
      .info{margin-bottom:16px;}.info p{font-size:12px;margin:1px 0;}
      .items{width:100%;margin-bottom:16px;border-collapse:collapse;}
      .items th{text-align:left;font-size:11px;color:#64748b;border-bottom:1px solid #cbd5e1;padding:4px 0;}
      .items td{font-size:12px;padding:3px 0;}.items .qty{width:30px;}.items .price{text-align:right;}
      .totals{border-top:2px solid #1e293b;padding-top:8px;margin-top:8px;}
      .totals p{display:flex;justify-content:space-between;font-size:12px;margin:2px 0;}
      .totals .grand{font-size:16px;font-weight:bold;margin-top:6px;border-top:1px solid #cbd5e1;padding-top:6px;}
      .footer{text-align:center;margin-top:24px;font-size:10px;color:#94a3b8;}
      @media print{body{padding:8px;}}
    </style></head><body>
    <div class="header"><h1>Le Gourmet</h1><p>Recu de paiement</p></div>
    <div class="info">
      <p><strong>N° ${order.order_number}</strong></p>
      <p>Date: ${dateStr}</p>
      <p>Client: ${order.customer_name || '—'}</p>
      <p>Telephone: ${order.customer_phone || '—'}</p>
      ${order.table_number ? `<p>Table: ${order.table_number}</p>` : ''}
      ${order.delivery_address ? `<p>Adresse: ${order.delivery_address}</p>` : ''}
    </div>
    <table class="items"><thead><tr><th class="qty">Qt.</th><th>Article</th><th class="price">Prix</th></tr></thead><tbody>
    ${items.map((i: any) => `<tr><td class="qty">${i.quantity}</td><td>${i.dish_name}</td><td class="price">${formatPrice(i.subtotal)}</td></tr>`).join('')}
    </tbody></table>
    <div class="totals">
      ${order.delivery_fee > 0 ? `<p><span>Livraison</span><span>${formatPrice(order.delivery_fee)}</span></p>` : ''}
      <p class="grand"><span>TOTAL</span><span>${formatPrice(order.total_amount)}</span></p>
      <p><span>Reglement</span><span>${methodLabel}</span></p>
      <p><span>Statut</span><span>${order.payment_status === 'paye' ? 'Paye' : 'En attente'}</span></p>
    </div>
    <div class="footer"><p>Merci de votre visite !</p><p>Le Gourmet - Restaurant</p></div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="px-4 pt-4">
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="CMD-XXXXXX"
          className="w-full pl-10 pr-24 py-3 rounded-xl bg-white border border-slate-200 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={loading}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8"
        >
          {loading ? '...' : 'Suivre'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {!searched && !order && (
        <EmptyState
          icon={<Package size={28} />}
          title="Suivez votre commande"
          description="Entrez votre numéro de commande (ex: CMD-ABC123) pour suivre son statut en temps réel."
        />
      )}

      {order && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-slate-400">Commande</p>
                <p className="text-lg font-bold text-slate-900">{order.order_number}</p>
              </div>
              <Badge className={ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}>
                {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{ORDER_TYPE_LABELS[order.type as keyof typeof ORDER_TYPE_LABELS]}</span>
              <span>•</span>
              <span>{formatPrice(order.total_amount)}</span>
              <span>•</span>
              <span>{formatDate(order.created_at)}</span>
            </div>
            {order.payment_method && (
              <div className="mt-2">
                <Badge className={PAYMENT_METHOD_COLORS[order.payment_method as PaymentMethod]}>
                  {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
                </Badge>
              </div>
            )}
          </Card>

          {/* Status timeline */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-4">Suivi de votre commande</h3>
            <div className="space-y-1">
              {statusSteps.map((step, idx) => {
                const isDone = idx <= currentStep;
                const isCurrent = idx === currentStep;
                const label = ORDER_STATUS_LABELS[step as keyof typeof ORDER_STATUS_LABELS];
                const icons: Record<string, React.ReactNode> = {
                  en_attente: <Clock size={16} />,
                  en_preparation: <ChefHat size={16} />,
                  pret: <Package size={16} />,
                  en_livraison: <Bike size={16} />,
                  livre: <CheckCircle2 size={16} />,
                  recupere: <CheckCircle2 size={16} />,
                };
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                          isDone
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 text-slate-400',
                          isCurrent && 'ring-4 ring-orange-100'
                        )}
                      >
                        {icons[step]}
                      </div>
                      {idx < statusSteps.length - 1 && (
                        <div
                          className={cn(
                            'w-0.5 h-8',
                            idx < currentStep ? 'bg-orange-500' : 'bg-slate-200'
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isDone ? 'text-slate-900' : 'text-slate-400'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Order items */}
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Détails de la commande</h3>
            <div className="space-y-2">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {item.quantity}x {item.dish_name}
                  </span>
                  <span className="font-medium text-slate-900">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-100">
                <span className="text-slate-500">Frais de livraison</span>
                <span className="font-medium text-slate-900">{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 mt-3 pt-3 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-orange-600">{formatPrice(order.total_amount)}</span>
            </div>
          </Card>

          {/* Print receipt button */}
          {order.payment_status === 'paye' && (
            <Button variant="outline" className="w-full" onClick={printReceipt}>
              <Printer size={16} className="mr-2" /> Imprimer le recu
            </Button>
          )}

          {/* Delivery info */}
          {order.type === 'livraison' && order.delivery?.[0] && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Bike size={18} className="text-blue-600" />
                <h3 className="font-semibold text-sm text-slate-900">Informations du livreur</h3>
              </div>
              {order.delivery[0].delivery_person ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={16} className="text-slate-400" />
                    <span className="text-slate-700">{order.delivery[0].delivery_person.full_name || 'Non assigné'}</span>
                  </div>
                  {order.delivery[0].delivery_person.phone && (
                    <a
                      href={`tel:${order.delivery[0].delivery_person.phone}`}
                      className="flex items-center gap-2 text-sm text-blue-600 font-medium"
                    >
                      <Phone size={16} />
                      {order.delivery[0].delivery_person.phone}
                    </a>
                  )}
                  {order.delivery_address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={16} className="text-slate-400 mt-0.5" />
                      <span className="text-slate-600">{order.delivery_address}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Un livreur sera assigné prochainement.</p>
              )}
            </Card>
          )}

          {order.type === 'sur_place' && order.table_number && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm">
                <Info size={16} className="text-slate-400" />
                <span className="text-slate-600">Table: <strong>{order.table_number}</strong></span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ============= RESERVATION PAGE =============
function ReservationPage() {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !date) {
      setError('Veuillez remplir tous les champs requis.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await createReservation({
      customerName: name,
      customerPhone: phone,
      customerEmail: email || undefined,
      customerId: profile?.id,
      partySize,
      date,
      time,
      notes: notes || undefined,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="px-4 pt-8">
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Réservation envoyée !</h2>
          <p className="text-slate-500 text-sm mt-2">
            Nous vous contacterons pour confirmer votre réservation.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setSuccess(false);
              setName(profile?.full_name || '');
              setPhone(profile?.phone || '');
              setDate('');
              setNotes('');
            }}
          >
            Faire une autre réservation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <div className="mb-6">
        <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
          <CalendarPlus size={24} className="text-teal-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Réserver une table</h2>
        <p className="text-sm text-slate-500 mt-1">
          Réservez votre table pour une date future. Nous confirmerons votre demande par téléphone.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Input
          label="Email (optionnel)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre de personnes"
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            required
          />
          <Input
            label="Date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <Select label="Heure" value={time} onChange={(e) => setTime(e.target.value)}>
          {['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Textarea
          label="Notes (optionnel)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Occasion spéciale, préférences..."
          rows={2}
        />
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Envoi...' : 'Envoyer la réservation'}
        </Button>
      </form>
    </div>
  );
}

// ============= PROFILE PAGE =============
function ProfilePage({ onNav }: { onNav: (p: ClientPage) => void }) {
  const { profile, session, signOut } = useAuth();

  if (!profile) {
    return (
      <div className="px-4 pt-8">
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <User size={28} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Vous n'êtes pas connecté</h2>
          <p className="text-sm text-slate-500 mt-1">
            Créez un compte pour accéder à votre historique et vos réservations.
          </p>
          <p className="text-xs text-slate-400 mt-3">
            Vous pouvez commander sans compte depuis la carte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-3">
          <User size={36} className="text-orange-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{profile.full_name || 'Client'}</h2>
        <p className="text-sm text-slate-500">{profile.email}</p>
        {profile.phone && <p className="text-sm text-slate-400">{profile.phone}</p>}
      </div>

      <div className="space-y-3 mt-6">
        <Card className="p-4" onClick={() => onNav('tracking')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-slate-900">Suivre une commande</h3>
              <p className="text-xs text-slate-500">Entrez votre numéro de commande</p>
            </div>
            <ArrowRight size={18} className="text-slate-300" />
          </div>
        </Card>

        <Card className="p-4" onClick={() => onNav('reservation')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <CalendarPlus size={20} className="text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-slate-900">Nouvelle réservation</h3>
              <p className="text-xs text-slate-500">Réserver une table</p>
            </div>
            <ArrowRight size={18} className="text-slate-300" />
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => signOut()}
        >
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
