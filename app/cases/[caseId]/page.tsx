import { notFound } from "next/navigation";
import { getCaseWorkspace } from "@/lib/case-data";
import { InvestigationWorkspace } from "@/components/investigation-workspace";
import { getCurrentUser } from "@/lib/auth";
import { LoginPanel } from "@/components/login-panel";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return <LoginPanel />;
  }

  const { caseId } = await params;
  const dossier = await getCaseWorkspace(caseId);

  if (!dossier) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-archive-950 text-ink">
      <InvestigationWorkspace dossier={dossier} mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""} />
    </main>
  );
}
