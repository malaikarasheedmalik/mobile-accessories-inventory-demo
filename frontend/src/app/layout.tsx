import type { Metadata, Viewport } from 'next';
import './globals.css';
import { InventoryProvider } from '@/store/useInventory';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProductModal from '@/components/ProductModal';
import StockModal from '@/components/StockModal';

export const metadata: Metadata = {
  title: 'Mobile Inventory — AI-Powered Inventory Management',
  description: 'Mobile Accessories Inventory Management System powered by n8n and Gemini.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f6f7f9]">
        <InventoryProvider>
          <Sidebar />
          <div className="lg:pl-60">
            <Topbar />
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
          </div>
          <ProductModal />
          <StockModal />
        </InventoryProvider>
      </body>
    </html>
  );
}