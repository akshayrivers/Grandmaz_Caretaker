import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth";
import { Sidebar } from "~/components/sidebar";
import { LoadingSpinner } from "~/components/loading-spinner";

export default function Dashboard() {
  const { firebaseUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      navigate("/", { replace: true });
    }
  }, [firebaseUser, loading, navigate]);

  if (loading) return <LoadingSpinner />;

  if (!firebaseUser) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
