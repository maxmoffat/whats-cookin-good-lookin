"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

const COLLAPSED_KEY = "sidebar-collapsed";
const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = 200;

export default function AppShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  // Start expanded (matches SSR default) — update after mount from localStorage
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function handleToggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const sidebarWidth = mounted && collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <div className="min-h-screen bg-[#f8f0eb]">
      <Header userEmail={userEmail} />
      <Sidebar collapsed={mounted ? collapsed : false} onToggle={handleToggle} />

      {/* Main content — shifts with sidebar */}
      <main
        className="min-h-[calc(100vh-80px)]"
        style={{
          marginTop: 80,
          marginLeft: sidebarWidth,
          padding: 40,
          transition: "margin-left 0.2s ease",
        }}
      >
        {children}
      </main>
    </div>
  );
}
