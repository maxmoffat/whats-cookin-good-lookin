import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AddRecipeModalProvider } from "@/components/AddRecipeModal";
import { AddMealModalProvider } from "@/components/AddMealModal";
import AppShell from "@/components/AppShell";

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
      <AddMealModalProvider>
        <AppShell userEmail={user.email ?? ""}>
          {children}
        </AppShell>
      </AddMealModalProvider>
    </AddRecipeModalProvider>
  );
}
