import AdminGate from "@/app/admin/admin-gate";
import MogobeAdminDashboard from "@/components/MogobeAdminDashboard";
export const metadata = { title: "Mogobe Admin", robots: { index: false, follow: false } };
export default function AdminPage() { return <AdminGate><MogobeAdminDashboard /></AdminGate>; }
