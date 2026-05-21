"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAddRecipeModal } from "@/components/AddRecipeModal";

export default function Nav({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { open: openModal } = useAddRecipeModal();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="bg-[#f8f0eb] px-6 sm:px-8 lg:px-[120px] h-[120px] flex items-center justify-between">
      <Link href="/recipes" className="flex items-center gap-3">
        <Image src="/icons/wcgl-logo.svg" alt="WCGL logo" width={40} height={40} />
        <span className="hidden lg:block font-[family-name:var(--font-gloria)] text-[22px] text-[#3e260f] leading-tight">
          What&apos;s Cookin&apos;, Good Lookin&apos;?
        </span>
      </Link>

      <div className="flex items-center gap-6">
        <button
          onClick={openModal}
          className="h-10 px-5 rounded-lg bg-[#b9732c] text-white text-sm font-semibold hover:bg-[#a0621f] transition-colors"
        >
          + Add Recipe
        </button>

        <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm text-[#3e260f] hover:opacity-70 transition-opacity"
        >
          {userEmail}
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M1 1l4 4 4-4" stroke="#3e260f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-[rgba(62,38,15,0.1)] py-1 z-20">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
