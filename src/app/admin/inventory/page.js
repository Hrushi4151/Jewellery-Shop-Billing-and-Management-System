import InventoryManagement from '@/components/Inventory/InventoryManagement';

export const metadata = {
  title: 'Inventory Management | Jewellery Billing System',
  description: 'Real-time stock levels and analytics',
};

export default function InventoryPage() {
  return (
    <main>
      <InventoryManagement />
    </main>
  );
}
