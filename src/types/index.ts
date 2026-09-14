export type UserRole = 'admin' | 'caisse' | 'client' | 'livreur';
export type UserStatus = 'pending' | 'active' | 'suspended';

export type DishCategory = 'entree' | 'plat' | 'dessert' | 'boisson';

export type OrderType = 'sur_place' | 'livraison';

export type OrderStatus =
  | 'en_attente'
  | 'en_preparation'
  | 'pret'
  | 'en_livraison'
  | 'livre'
  | 'paye'
  | 'annule';

export type PaymentMethod = 'wave' | 'orange_money' | 'carte' | 'especes';

export type PaymentStatus = 'en_attente' | 'paye';

export type DeliveryStatus = 'assigne' | 'en_cours' | 'livre';

export type ReservationStatus = 'en_attente' | 'confirmee' | 'annulee';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: DishCategory;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DailyMenu {
  id: string;
  dish_id: string;
  menu_date: string;
  quantity_available: number;
  quantity_sold: number;
  created_at: string;
  dish?: Dish;
}

export interface Order {
  id: string;
  order_number: string;
  type: OrderType;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_id: string | null;
  table_number: string | null;
  delivery_address: string | null;
  total_amount: number;
  delivery_fee: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  delivery?: Delivery;
}

export interface OrderItem {
  id: string;
  order_id: string;
  dish_id: string | null;
  dish_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  delivery_person_id: string | null;
  status: DeliveryStatus;
  assigned_at: string;
  delivered_at: string | null;
  created_at: string;
  delivery_person?: Profile;
  order?: Order;
}

export interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_id: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
}

export interface RoleCode {
  id: string;
  code: string;
  role: 'caisse' | 'livreur';
  used: boolean;
  used_by: string | null;
  created_at: string;
}

export interface CartItem {
  dish_id: string;
  dish_name: string;
  unit_price: number;
  quantity: number;
  daily_menu_id: string;
}
