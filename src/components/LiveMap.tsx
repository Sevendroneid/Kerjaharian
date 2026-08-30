import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface LiveMapProps {
  orderId: string;
  isWorker: boolean;
}

export function LiveMap({ orderId, isWorker }: LiveMapProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<string>('In-Progress');

  useEffect(() => {
    // Ambil status order terkini untuk mengecek apakah sudah Completed
    supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (data) setStatus(data.status);
      });

    let watchId: number | null = null;

    // Jika user adalah worker, kirim koordinat GPS secara live
    if (isWorker && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });

          // Update posisi ke Supabase realtime locations table
          await supabase.from('order_locations').upsert({
            order_id: orderId,
            lat,
            lng,
            updated_at: new Date(),
          });
        },
        (error) => console.error('GPS Error:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    // Subscribe untuk mendengarkan perubahan lokasi atau status order
    const channel = supabase
      .channel(`order-location:${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_locations', filter: `order_id=eq.${orderId}` },
        (payload: any) => {
          if (payload.new) {
            setLocation({ lat: payload.new.lat, lng: payload.new.lng });
          }
        }
      )
      .subscribe();

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId); // Stop otomatis saat komponen unmount / selesai
      }
      supabase.removeChannel(channel);
    };
  }, [orderId, isWorker]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-md border space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-700 text-sm">Pelacakan Lokasi GPS Realtime</h3>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
          {status === 'Completed' ? 'GPS Selesai (Nonaktif)' : 'GPS Aktif'}
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
