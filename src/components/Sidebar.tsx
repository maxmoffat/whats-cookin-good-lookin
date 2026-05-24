"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Nav icons ───────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.65688 0.111571C6.86146 -0.0371902 7.13854 -0.0371902 7.34312 0.111571L13.7598 4.77824C13.9107 4.88801 14 5.06337 14 5.25V13.4167C14 13.7388 13.7388 14 13.4167 14H9.33333C9.01116 14 8.75 13.7388 8.75 13.4167V10.5C8.75 10.0358 8.56561 9.59076 8.23742 9.26257C7.90924 8.93439 7.4641 8.75 7 8.75C6.5359 8.75 6.09076 8.93439 5.76256 9.26257C5.43437 9.59076 5.25 10.0358 5.25 10.5V13.4167C5.25 13.7388 4.98883 14 4.66667 14H0.583333C0.261167 14 0 13.7388 0 13.4167V5.25C0 5.06337 0.089299 4.88801 0.240233 4.77824L6.65688 0.111571ZM1.16667 5.54704V12.8333H4.08333V10.5C4.08333 9.72644 4.39062 8.98456 4.93761 8.43762C5.48459 7.89063 6.22644 7.58333 7 7.58333C7.77356 7.58333 8.51544 7.89063 9.06237 8.43762C9.60937 8.98456 9.91667 9.72644 9.91667 10.5V12.8333H12.8333V5.54704L7 1.30462L1.16667 5.54704Z"
        fill={active ? "#B9732C" : "#3E260F"}
      />
    </svg>
  );
}

function MealPlanIcon({ active }: { active: boolean }) {
  const color = active ? "#B9732C" : "#3E260F";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#mp-clip)">
        <path d="M1.5 2C1.23478 2 0.98043 2.10536 0.792893 2.29289C0.605357 2.48043 0.5 2.73478 0.5 3V12.5C0.5 12.7652 0.605357 13.0196 0.792893 13.2071C0.98043 13.3946 1.23478 13.5 1.5 13.5H12.5C12.7652 13.5 13.0196 13.3946 13.2071 13.2071C13.3946 13.0196 13.5 12.7652 13.5 12.5V3C13.5 2.73478 13.3946 2.48043 13.2071 2.29289C13.0196 2.10536 12.7652 2 12.5 2H10.5" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.5 0.5V3.5" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.5 0.5V3.5" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.5 2H8.5" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7.24872 4.65241L8.08533 6.33537C8.10404 6.37793 8.13371 6.41477 8.17131 6.44211C8.20891 6.46946 8.2531 6.48634 8.29935 6.49102L10.1574 6.77313C10.2105 6.78004 10.2606 6.80194 10.3017 6.83625C10.3429 6.87057 10.3734 6.91588 10.3897 6.9669C10.406 7.01792 10.4075 7.07254 10.3939 7.12436C10.3804 7.17618 10.3523 7.22307 10.3131 7.25953L8.94141 8.5631C8.92095 8.60211 8.91027 8.64551 8.91027 8.68956C8.91027 8.73362 8.92095 8.77701 8.94141 8.81603L9.20406 10.6644C9.21527 10.7178 9.21074 10.7733 9.19101 10.8242C9.17129 10.8751 9.13722 10.9192 9.09294 10.9511C9.04866 10.983 8.99607 11.0014 8.94154 11.0041C8.88702 11.0067 8.8329 10.9934 8.78576 10.9659L7.13198 10.0904C7.08918 10.0711 7.04276 10.0611 6.99579 10.0611C6.94882 10.0611 6.9024 10.0711 6.8596 10.0904L5.20582 10.9659C5.15868 10.9934 5.10456 11.0067 5.05004 11.0041C4.99551 11.0014 4.94292 10.983 4.89864 10.9511C4.85436 10.9192 4.82029 10.8751 4.80057 10.8242C4.78084 10.7733 4.77631 10.7178 4.78752 10.6644L5.09881 8.81603C5.1122 8.77313 5.11476 8.72758 5.10628 8.68345C5.09779 8.63932 5.07852 8.59797 5.05017 8.5631L3.67851 7.24981C3.64213 7.21295 3.61659 7.16679 3.6047 7.11639C3.59281 7.06598 3.59503 7.01328 3.6111 6.96404C3.62718 6.91481 3.65649 6.87096 3.69584 6.83728C3.73519 6.80361 3.78304 6.78141 3.83416 6.77313L5.69223 6.50074C5.73848 6.49606 5.78267 6.47919 5.82027 6.45184C5.85787 6.4245 5.88754 6.38766 5.90624 6.34509L6.74286 4.66214C6.76525 4.6145 6.80051 4.57407 6.84468 4.54542C6.88884 4.51678 6.94014 4.50106 6.99277 4.50005C7.0454 4.49904 7.09726 4.51277 7.14249 4.5397C7.18772 4.56662 7.22452 4.60566 7.24872 4.65241Z" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <defs>
        <clipPath id="mp-clip">
          <rect width="14" height="14" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

function GroceryListIcon({ active }: { active: boolean }) {
  const color = active ? "#B9732C" : "#3E260F";
  return (
    <svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.5574 3.08945C14.4217 4.5255 14.0486 5.75096 13.6956 6.60119C13.4211 7.26239 12.8442 7.72842 12.1415 7.86597C11.4216 8.00689 10.3306 8.14827 8.85081 8.14827C7.8095 8.14827 6.92781 8.07826 6.2228 7.98766C4.98182 7.82819 4.1067 6.81317 3.9071 5.578L3.32349 1.9668H13.4869C14.1076 1.9668 14.6159 2.4715 14.5574 3.08945Z" stroke={color} strokeWidth="1.1239" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.925 10.9582H6.68931C5.58676 10.9582 4.64698 10.1585 4.47049 9.07012L3.39696 2.45001C3.22047 1.36168 2.28067 0.562012 1.17814 0.562012H0.562012" stroke={color} strokeWidth="1.1239" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.45495 13.4737C6.14961 13.4737 6.71276 12.9106 6.71276 12.2159C6.71276 11.5212 6.14961 10.9581 5.45495 10.9581C4.76028 10.9581 4.19714 11.5212 4.19714 12.2159C4.19714 12.9106 4.76028 13.4737 5.45495 13.4737Z" stroke={color} strokeWidth="1.1239" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.9249 13.4737C13.6196 13.4737 14.1826 12.9106 14.1826 12.2159C14.1826 11.5212 13.6196 10.9581 12.9249 10.9581C12.2302 10.9581 11.6671 11.5212 11.6671 12.2159C11.6671 12.9106 12.2302 13.4737 12.9249 13.4737Z" stroke={color} strokeWidth="1.1239" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12L6 8L10 4" stroke="#3E260F" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4L10 8L6 12" stroke="#3E260F" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Nav items config ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/recipes",
    icon: HomeIcon,
    matchExact: true,
  },
  {
    label: "Meal Plan Calendar",
    href: "/recipes/meal-plan",
    icon: MealPlanIcon,
    matchExact: false,
  },
  {
    label: "Grocery List",
    href: "/recipes/grocery-list",
    icon: GroceryListIcon,
    matchExact: false,
  },
] as const;

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, matchExact: boolean) {
    if (matchExact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="fixed top-[80px] left-0 bottom-0 bg-white border-r border-[rgba(62,38,15,0.1)] flex flex-col z-40"
      style={{
        width: collapsed ? 56 : 200,
        transition: "width 0.2s ease",
      }}
    >
      {/* Nav items */}
      <nav className="flex-1 pt-[23px] px-[10px] flex flex-col gap-[4px]">
        {NAV_ITEMS.map(({ label, href, icon: Icon, matchExact }) => {
          const active = isActive(href, matchExact);
          return (
            <div key={href} className="relative group">
              <Link
                href={href}
                className={`flex items-center h-[40px] rounded-[8px] transition-colors ${
                  collapsed ? "justify-center" : "px-[13px] gap-[12px]"
                }`}
                style={{
                  background: active ? "rgba(185,115,44,0.15)" : "transparent",
                }}
              >
                {/* Icon — fixed width so it stays put when label hides */}
                <span className="flex-shrink-0 flex items-center justify-center w-[16px]">
                  <Icon active={active} />
                </span>

                {/* Label — hidden when collapsed */}
                <span
                  className="text-[13px] font-medium leading-none whitespace-nowrap overflow-hidden transition-all"
                  style={{
                    color: active ? "#B9732C" : "#3E260F",
                    fontWeight: active ? 600 : 500,
                    maxWidth: collapsed ? 0 : 200,
                    opacity: collapsed ? 0 : 1,
                    transition: "max-width 0.2s ease, opacity 0.15s ease",
                  }}
                >
                  {label}
                </span>
              </Link>

              {/* Hover tooltip when collapsed */}
              {collapsed && (
                <div className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-[200]">
                  <div className="bg-[#3e260f] text-white text-xs font-medium px-2.5 py-1.5 rounded-[6px] whitespace-nowrap shadow-md">
                    {label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-[48px] border-t border-[rgba(62,38,15,0.1)] hover:bg-[#f8f0eb] transition-colors flex-shrink-0"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ExpandIcon /> : <CollapseIcon />}
      </button>
    </aside>
  );
}
