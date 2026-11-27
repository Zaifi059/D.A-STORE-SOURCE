import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import ProtectedRoute from './components/ProtectedRoute';
import ProductGrid from './components/ProductGrid';
import PageLoader from './components/PageLoader';
import Hero from './components/Hero';
import CollectionsPage from './pages/CollectionsPage';
import AdminShell from './components/admin/AdminShell';

// Route-level code splitting: these pages load only when visited.
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PosPage = lazy(() => import('./pages/PosPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));

function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="showroom-bg flex min-h-screen flex-col text-soft">
      <Navbar />
      <main key={pathname} className="page-enter mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-28 sm:px-6">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <ProductGrid title="The Collection" />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<ProductGrid title="Shop" />} />
        <Route path="new-arrivals" element={<ProductGrid title="New Arrivals" sortBy="newest" />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path="login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="checkout" element={<CheckoutPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminShell />}>
          <Route path="/dashboard" element={<Suspense fallback={<PageLoader admin />}><DashboardPage /></Suspense>} />
          <Route path="/pos" element={<Suspense fallback={<PageLoader admin />}><PosPage /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<PageLoader admin />}><AdminPage /></Suspense>} />
          <Route path="/payments" element={<Suspense fallback={<PageLoader admin />}><PaymentsPage /></Suspense>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
