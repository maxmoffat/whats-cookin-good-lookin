"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecipeActions({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", recipeId);
    router.push("/recipes");
    router.refresh();
  }

  return (
    <>
      {/* 3-dot menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-10 h-10 rounded-[6.667px] border border-[#3e260f] flex items-center justify-center hover:bg-[rgba(62,38,15,0.05)] transition-colors"
          aria-label="Recipe options"
        >
          <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
            <circle cx="2" cy="2" r="1.5" fill="#3e260f" />
            <circle cx="8" cy="2" r="1.5" fill="#3e260f" />
            <circle cx="14" cy="2" r="1.5" fill="#3e260f" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg border border-[rgba(62,38,15,0.1)] shadow-lg z-20 py-1">
            <Link
              href={`/recipes/${recipeId}/edit`}
              className="block px-4 py-2 text-sm text-[#3e260f] hover:bg-[#f8f0eb] transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Edit
            </Link>
            <button
              onClick={() => { setMenuOpen(false); setShowModal(true); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !deleting && setShowModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
            <h2 className="text-lg font-bold text-[#3e260f] mb-2">Delete recipe?</h2>
            <p className="text-sm text-[rgba(62,38,15,0.5)] mb-6">
              This can&apos;t be undone. The recipe will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#3e260f] border border-[rgba(62,38,15,0.2)] hover:border-[#3e260f] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
