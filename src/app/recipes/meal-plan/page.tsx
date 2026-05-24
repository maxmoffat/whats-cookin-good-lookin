import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MealPlanClient from "./MealPlanClient";

export default async function MealPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <MealPlanClient />;
}
