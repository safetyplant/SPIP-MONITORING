import AdminNav from '@/components/AdminNav';

export default function AdminLayout({ children }) {
  return (
    <>
      <AdminNav />
      <main className="wrap page">{children}</main>
    </>
  );
}
