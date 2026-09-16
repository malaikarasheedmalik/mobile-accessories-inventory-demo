'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppConfig, ChatMessage, ConnectionState, ContractResult, Product } from '@/lib/types';
import type { ChatApiResponse } from '@/lib/api';
import { loadInventory, sendInventoryCommand, getAppConfig } from '@/lib/api';
import { computeKpis, parseProducts, parseReport } from '@/lib/inventory';

interface InventoryContextValue {
  config: AppConfig | null;
  products: Product[];
  loaded: boolean;
  loadError: string | null;
  connection: ConnectionState;
  messages: ChatMessage[];
  chatBusy: boolean;
  modalProduct: Product | null;
  stockAction: { product: Product; type: 'add' | 'sale' } | null;
  reload: () => Promise<void>;
  sendChat: (text: string) => Promise<ContractResult>;
  openProduct: (p: Product | null) => void;
  openStockAction: (product: Product, type: 'add' | 'sale') => void;
  closeStockAction: () => void;
  appendChat: (msg: ChatMessage) => void;
  setConnection: (c: ConnectionState) => void;
  resetChat: () => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

let msgId = 0;

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connection, setConnectionState] = useState<ConnectionState>('connecting');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<{ product: Product; type: 'add' | 'sale' } | null>(null);

  const loadingRef = useRef(false);

  useEffect(() => {
    if (!config) {
      getAppConfig().then(setConfig).catch(() => setConfig(null));
    }
  }, [config]);

  const setConnection = useCallback((c: ConnectionState) => setConnectionState(c), []);

  const reload = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setConnectionState('connecting');
    try {
      const r = await loadInventory();
      if (!r.success) throw new Error(r.message || 'Inventory request failed.');
      setProducts(parseProducts(r.meta.text));
      setLoaded(true);
      setLoadError(null);
      setConnectionState('connected');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unknown error');
      setLoaded(false);
      setConnectionState('disconnected');
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const appendChat = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const sendChat = useCallback(
    async (text: string): Promise<ContractResult> => {
      const t = text.trim();
      appendChat({ id: String(++msgId), role: 'user', text: t, cls: 'info', createdAt: Date.now() });
      setChatBusy(true);
      try {
        const r: ChatApiResponse = await sendInventoryCommand(t);
        appendChat({
          id: String(++msgId),
          role: 'bot',
          text: r.meta.text || r.message,
          cls: r.meta.cls,
          products: r.meta.cls === 'products' ? ((r.data as Product[]) ?? parseProducts(r.meta.text)) : undefined,
          report: r.meta.cls === 'report' ? ((r.data[0] as import('@/lib/types').InventoryReport) ?? parseReport(r.meta.text)) : undefined,
          createdAt: Date.now()
        });
        if (r.success) setConnectionState('connected');
        else if (r.error === 'N8N_UNAVAILABLE') setConnectionState('disconnected');
        return r;
      } catch (err) {
        appendChat({ id: String(++msgId), role: 'bot', text: err instanceof Error ? err.message : 'Unable to process the inventory response. Please try again.', cls: 'error', createdAt: Date.now() });
        return { success: false, message: 'Unable to process the inventory response. Please try again.', data: [], error: 'CLIENT_ERROR', meta: { text: '', cls: 'error' } };
      } finally {
        setChatBusy(false);
      }
    },
    [appendChat]
  );

  const openProduct = useCallback((p: Product | null) => setModalProduct(p), []);
  const openStockAction = useCallback((product: Product, type: 'add' | 'sale') => {
    setModalProduct(null);
    setStockAction({ product, type });
  }, []);
  const closeStockAction = useCallback(() => setStockAction(null), []);
  const resetChat = useCallback(() => setMessages([]), []);

  const value = useMemo<InventoryContextValue>(
    () => ({
      config, products, loaded, loadError, connection,
      messages, chatBusy, modalProduct, stockAction,
      reload, sendChat, openProduct, openStockAction, closeStockAction,
      appendChat, setConnection, resetChat
    }),
    [config, products, loaded, loadError, connection, messages, chatBusy, modalProduct, stockAction,
      reload, sendChat, openProduct, openStockAction, closeStockAction, appendChat, setConnection, resetChat]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}

export { computeKpis };