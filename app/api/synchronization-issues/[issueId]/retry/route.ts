import { proxyLaravelRequest } from "@/lib/api/laravel-proxy";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const { issueId } = await params;
  return proxyLaravelRequest(
    `/synchronization-issues/${encodeURIComponent(issueId)}/retry`,
    { method: "POST" },
  );
}
