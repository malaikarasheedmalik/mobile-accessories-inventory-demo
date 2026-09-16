'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AiChat from '@/components/AiChat';
import { useInventory } from '@/store/useInventory';

export default function AssistantClient() {
  const { config, sendChat, chatBusy } = useInventory();
  const params = useSearchParams();
  const prompt = params.get('q');
  const sent = useRef(false);

  useEffect(() => {
    if (prompt && !sent.current && !chatBusy) {
      sent.current = true;
      sendChat(prompt);
      window.history.replaceState({}, '', '/assistant');
    }
  }, [prompt, chatBusy, sendChat]);

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="card-title">{config?.assistant.title ?? 'Inventory AI'}</h3>
        <span className="text-[11px] text-slate-400">{config?.assistant.subtitle ?? 'Ask anything about your inventory'}</span>
      </div>
      <AiChat />
    </div>
  );
}