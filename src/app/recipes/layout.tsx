import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { AddRecipeModalProvider } from "@/components/AddRecipeModal";

export default async function RecipesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <AddRecipeModalProvider>
      <div className="min-h-screen flex flex-col">
        <Nav userEmail={user.email ?? ""} />
        <main className="flex-1 w-full px-6 sm:px-8 lg:px-[120px] py-4">
          {children}
        </main>
      </div>
    </AddRecipeModalProvider>
  );
}
