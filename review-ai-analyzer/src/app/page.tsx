import Image from "next/image";
import { createClient } from "@/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import UrlProcessor from "@/components/UrlProcessor";
import ReviewTable from "@/components/ReviewTable";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
        <HomeClient />
      </main>
    </div>
  );
}
