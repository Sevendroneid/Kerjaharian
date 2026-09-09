import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface LiveMapProps {
  orderId: string;
  isWorker: boolean;
}

export function LiveMap({ orderId, isWorker }: LiveMapProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<string>('In-Progress');
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;

    const stopGps = () => {
      if (watchRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };

    const loadStatus = async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
      if (!disposed && data) {
        setStatus(data.status);
        if (data.status === 'completed') stopGps();
      }
    };

    void loadStatus();

    if (isWorker && 'geolocation' in navigator) {
      watchRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          if (disposed) return;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
          setLocation({ lat, lng });

          // order_locations already has the job's initial row. Workers may only
          // UPDATE their own related row; INSERT/DELETE are intentionally blocked.
          const { error } = await supabase
            .from('order_locations')
            .update({ lat, lng, updated_at: new Date().toISOString() })
            .eq('order_id', orderId);
          if (error) console.warn('GPS order location update:', error.message);
        },
        (error) => console.warn('GPS Error:', error.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    const locationChannel = supabase
      .channel(`order-location:${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_locations', filter: `order_id=eq.${orderId}` },
        (payload: any) => {
          const lat = Number(payload.new?.lat);
          const lng = Number(payload.new?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) setLocation({ lat, lng });
        }
      )
      .subscribe();

    const orderChannel = supabase
      .channel(`order-status:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: any) => {
          const nextStatus = String(payload.new?.status || '');
          if (!nextStatus) return;
          setStatus(nextStatus);
          if (nextStatus === 'completed') stopGps();
        }
      )
      .subscribe();

    return () => {
      disposed = true;
      stopGps();
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [orderId, isWorker]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-md border space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-700 text-sm">Pelacakan Lokasi GPS Realtime</h3>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
          {status === 'completed' ? 'GPS Selesai (Nonaktif)' : 'GPS Aktif'}
        </span>
      </div>

      <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center border relative overflow-hidden">
        {location ? (
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-gray-800">Koordinat Terkini:</p>
            <p className="text-xs text-gray-600 bg-white px-3 py-1 rounded shadow-sm inline-block">
              Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}
            </p>
            <p className="text-[10px] text-green-600 font-medium">Terhubung dengan Supabase Realtime</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Menunggu sinyal GPS...</p>
        )}
      </div>
      <p className="text-[11px] text-gray-500">
        * GPS otomatis berhenti melacak saat status pesanan berubah menjadi Completed sesuai protokol keamanan.
      </p>
    </div>
  );
}