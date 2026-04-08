import AdminPanel from '@/components/Admin/AdminPanel';

export const metadata = {
  title: 'Admin Control Panel | Jewellery Billing System',
  description: 'System administration and monitoring',
};

export default function AdminPage() {
  return (
    <main>
      <AdminPanel />
    </main>
  );
}
