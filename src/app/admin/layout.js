import Header from '@/components/Common/Header';
import '@/app/globals.css';

export const metadata = {
  title: 'Admin | Jewellery Billing System',
  description: 'Admin Control Panel and Inventory Management',
};

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
