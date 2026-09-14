import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DailyMenu, Dish, Order, OrderItem, CartItem, Reservation, PaymentMethod } from '@/types';

export function useDailyMenu(date?: string) {
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_menus')
      .select('*, dish:dishes(*)')
      .eq('menu_date', targetDate)
      .order('created_at');
    setMenus((data as DailyMenu[]) || []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { menus, loading, refetch: fetch };
}

export function useDishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .eq('is_active', true)
      .order('category, name');
    setDishes(data as Dish[] || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { dishes, loading, refetch: fetch };
}

export async function createOrder(params: {
  type: 'sur_place' | 'livraison';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId?: string;
  tableNumber?: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryFee?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  items: CartItem[];
}): Promise<{ order: Order | null; error: string | null }> {
  const { data: orderNumber } = await supabase.rpc('generate_order_number');
  if (!orderNumber) return { order: null, error: 'Erreur génération numéro commande' };

  const subtotal = params.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const deliveryFee = params.deliveryFee || 0;
  const total = subtotal + deliveryFee;

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      type: params.type,
      status: 'en_attente',
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      customer_email: params.customerEmail || null,
      customer_id: params.customerId || null,
      table_number: params.tableNumber || null,
      delivery_address: params.deliveryAddress || null,
      delivery_lat: params.deliveryLat || null,
      delivery_lng: params.deliveryLng || null,
      delivery_fee: deliveryFee,
      total_amount: total,
      payment_status: 'en_attente',
      payment_method: params.paymentMethod || null,
      notes: params.notes || null,
    })
    .select()
    .single();

  if (orderError) return { order: null, error: orderError.message };
  const order = orderData as Order;

  const orderItems = params.items.map((item) => ({
    order_id: order.id,
    dish_id: item.dish_id,
    dish_name: item.dish_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.unit_price * item.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) return { order: null, error: itemsError.message };

  for (const item of params.items) {
    const { data: menu } = await supabase
      .from('daily_menus')
      .select('quantity_sold')
      .eq('id', item.daily_menu_id)
      .maybeSingle();
    if (menu) {
      await supabase
        .from('daily_menus')
        .update({ quantity_sold: (menu as any).quantity_sold + item.quantity })
        .eq('id', item.daily_menu_id);
    }
  }

  return { order, error: null };
}

export async function fetchOrderByNumber(orderNumber: string): Promise<{
  order: (Order & { order_items?: OrderItem[]; delivery?: any }) | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items:order_items(*), delivery:deliveries(*, delivery_person:profiles!deliveries_delivery_person_id_fkey(*))')
    .eq('order_number', orderNumber.toUpperCase())
    .maybeSingle();

  if (error) return { order: null, error: error.message };
  return { order: data as any, error: null };
}

export async function createReservation(params: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId?: string;
  partySize: number;
  date: string;
  time: string;
  notes?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reservations').insert({
    customer_name: params.customerName,
    customer_phone: params.customerPhone,
    customer_email: params.customerEmail || null,
    customer_id: params.customerId || null,
    party_size: params.partySize,
    reservation_date: params.date,
    reservation_time: params.time,
    notes: params.notes || null,
  });
  return { error: error?.message ?? null };
}

export function useReservations(customerId?: string) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('customer_id', customerId)
      .order('reservation_date', { ascending: false });
    setReservations((data as Reservation[]) || []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { reservations, loading, refetch: fetch };
}
