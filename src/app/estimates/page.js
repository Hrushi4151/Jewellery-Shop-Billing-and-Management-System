import Header from '@/components/Common/Header';
import ManageEstimates from '@/components/Invoice/ManageEstimates';

export const metadata = {
  title: 'Manage Estimates - Laxmi Alankar',
  description: 'Create, view, and convert estimates to invoices',
};

export default function EstimatesPage() {
  return (
    <>
      <Header />
      <main>
        <ManageEstimates />
      </main>
    </>
  );
}
