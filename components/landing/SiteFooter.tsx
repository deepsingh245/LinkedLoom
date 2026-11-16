import Link from "next/link";
import { Routes } from "@/lib/routes";
import { NAV_LINKS } from "./nav-links";
import { Wordmark } from "./Wordmark";

const COLUMNS = [
  { title: "Product", links: [...NAV_LINKS] },
  {
    title: "Account",
    links: [
      { href: Routes.REGISTER, label: "Create account" },
      { href: Routes.LOGIN, label: "Log in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-5">
          <Wordmark />
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
            Researched, sourced LinkedIn posts. Published when you approve them.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-[13px] font-medium text-muted-foreground">{column.title}</p>
              <ul className="mt-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="flex min-h-11 items-center text-[14.5px] hover:text-teal-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-[1200px] px-4 py-6 text-[13px] text-muted-foreground sm:px-6 lg:px-8">
          © 2026 LinkedLoom. LinkedIn is a trademark of LinkedIn Corporation; LinkedLoom is not affiliated with LinkedIn.
        </p>
      </div>
    </footer>
  );
}
