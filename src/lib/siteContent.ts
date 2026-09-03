import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type Content = { content_key: string; value_id: string; value_en: string };

export function useSiteContent(lang: 'id' | 'en') {
  const [items, setItems] = useState<Record<string, Content>>({});
  useEffect(() => {
    let active = true;
    void supabase.from('site_content').select('content_key,value_id,value_en').then(({ data }) => {
      if (!active || !data) return;
      setItems(Object.fromEntries((data as Content[]).map((x) => [x.content_key, x])));
    });
    return () => { active = false; };
  }, []);
  return (key: string, fallback: string) => items[key]?.[lang === 'id' ? 'value_id' : 'value_en'] || fallback;
}
