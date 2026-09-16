export type Status = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type ChatClass = 'success' | 'error' | 'report' | 'products' | 'empty' | 'info';

export interface Product {
  sku: string;
  product_name: string;
  current_stock: number;
  selling_price: number;
  status?: string;
  category?: string;
  brand?: string;
  compatibility?: string;
  reorder_level?: number;
  cost_price?: number;
  id?: number;
}

export interface Kpis {
  products: number;
  units: number;
  low: number;
  out: number;
  value: number;
}

export interface InventoryReport {
  products: number | null;
  units: number | null;
  inventory_cost: number | null;
  inventory_value: number | null;
  low_stock: number | null;
  out_of_stock: number | null;
}

export interface ContractResult {
  success: boolean;
  message: string;
  data: unknown[];
  error: string | null;
  meta: { text: string; cls: ChatClass };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  cls: ChatClass;
  products?: Product[];
  report?: InventoryReport;
  createdAt: number;
}

export interface AppConfigBrand {
  name: string;
  sub: string;
  tagline: string;
}

export interface AppConfig {
  brand: AppConfigBrand;
  api: { webhookUrl: string; timeoutMs: number };
  dashboard: { recentProductCount: number; lowStockCount: number };
  assistant: { title: string; subtitle: string; badges: string[]; suggestions: string[] };
  quickActions: { label: string; command: string }[];
  settings: { showWebhookEditor: boolean; connectionLabel: Record<string, string> };
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';