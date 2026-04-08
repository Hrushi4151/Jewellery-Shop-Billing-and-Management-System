import Header from '@/components/Common/Header';
import ReturnExchange from '@/components/Invoice/ReturnExchange';

export const metadata = {
  title: 'Return & Exchange - Laxmi Alankar',
  description: 'Manage returns and exchanges for invoices',
};

export default function ReturnsPage() {
  return (
    <>
      <Header />
      <main>
        <ReturnExchange />
      </main>
    </>
  );
}
