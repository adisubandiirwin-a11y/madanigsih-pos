import { Layout } from "@/components/Layout";
import LaporanPage from "@/pages/LaporanPage";
import MasterBarangPage from "@/pages/MasterBarangPage";
import PenjualanPage from "@/pages/PenjualanPage";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/penjualan" replace />,
});

const penjualanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/penjualan",
  component: PenjualanPage,
});

const masterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/master",
  component: MasterBarangPage,
});

const laporanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/laporan",
  component: LaporanPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  penjualanRoute,
  masterRoute,
  laporanRoute,
]);

const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
