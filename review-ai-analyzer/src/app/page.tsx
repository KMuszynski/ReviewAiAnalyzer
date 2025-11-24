import { createClient } from "@/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import HomeClient from "@/components/HomeClient";

interface AnalysisStat {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
}

interface AnalysisData {
  title: string;
  stats: AnalysisStat[];
  fullTranscription?: string;
  sentimentDetails?: Record<string, unknown>;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialAnalyses: AnalysisData[] = [];

  try {
    const { data: sentiments, error: sentimentsError } = await supabase
      .from("sentiments")
      .select(
        "analysis_title, analysis_stats, full_transcription, sentiment_details"
      )
      .order("created_at", { ascending: false });

    if (sentimentsError) {
      console.error("Failed to load saved sentiments", sentimentsError);
      // If table doesn't exist yet, just use empty array
      initialAnalyses = [];
    } else {
      initialAnalyses =
        sentiments?.map((row) => ({
          title: row.analysis_title ?? "Video Analysis",
          stats: (row.analysis_stats as AnalysisStat[]) ?? [],
          fullTranscription: (row.full_transcription as string) ?? "",
          sentimentDetails:
            (row.sentiment_details as Record<string, unknown>) ?? {},
        })) ?? [];
    }
  } catch (error) {
    console.error("Error loading sentiments:", error);
    initialAnalyses = [];
  }

  return (
    <div className="font-sans grid grid-rows-[auto_1fr_auto] min-h-screen min-w-screen">
      <header className="p-4 bg-gray-200 row-start-1 flex justify-between items-center w-full m-0">
        <h1 className="text-2xl font-bold">Review AI Analyzer</h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Welcome, {user.email}
              </span>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      <main className="row-start-2 w-full h-full px-4">
        <HomeClient
          userId={user?.id ?? null}
          initialAnalyses={initialAnalyses}
        />
      </main>
    </div>
  );
}
