import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth";
import { Sidebar } from "~/components/sidebar";
import { LoadingSpinner } from "~/components/loading-spinner";

export default function Dashboard() {
  const { firebaseUser, user, loading } = useAuth();
  const navigate = useNavigate();
  const signedIn = Boolean(firebaseUser) || Boolean(user);

  useEffect(() => {
    if (!loading && !signedIn) {
      navigate("/", { replace: true });
    }
  }, [signedIn, loading, navigate]);

  if (loading) return <LoadingSpinner />;

  if (!signedIn) return null;

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
