import Link from "next/link";
import { Plus } from "lucide-react";
import { Routes } from "@/lib/routes";
import { Reveal } from "./Reveal";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Will LinkedLoom post without asking me?",
    a: "Not unless you turn that on. Every persona starts with manual approval. Auto-publish is a per-persona setting that stays off until you enable it and confirm, and the stop switch still overrides it.",
  },
  {
    q: "Which platforms does it support?",
    a: "LinkedIn. Other networks aren't supported today, and LinkedLoom never shows an account as connected until you've authorised it.",
  },
  {
    q: "Where does Autopilot get its ideas?",
    a: "From the sources you give each persona: RSS feeds and websites, plus optional web search. Each draft lists the sources it used and when they were fetched.",
  },
  {
    q: "Which AI models does it use?",
    a: "Google Gemini by default. Autopilot can also run on your own Gemini or OpenAI API key instead of LinkedLoom credits.",
  },
  {
    q: "What does “early access” mean?",
    a: "Autopilot is new and still being rolled out. The AI writer, LinkedIn previews, calendar and analytics are available as soon as you create an account.",
  },
  {
    q: "What happens to my data?",
    a: (
      <>
        We store what&apos;s needed to run your workspace: drafts, sources, schedules and your LinkedIn connection.
        The details are in our{" "}
        <Link href="/privacy" className="font-medium text-teal-ink underline underline-offset-4">
          privacy policy
        </Link>
        .
      </>
    ),
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 border-t border-border bg-card/40">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-28">
        <Reveal className="lg:col-span-4">
          <h2 id="faq-heading" className="text-[28px] font-semibold leading-tight sm:text-[34px]">
            Questions, answered.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            Anything else? Create an account and look around. Nothing is published unless you approve it.
          </p>
          <Link
            href={Routes.REGISTER}
            className="mt-4 inline-flex min-h-11 items-center text-[15px] font-medium text-teal-ink underline-offset-4 hover:underline"
          >
            Create a free account
          </Link>
        </Reveal>

        <Reveal className="lg:col-span-8">
          <div className="divide-y divide-border border-y border-border">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-[16px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  {q}
                  <Plus
                    className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="max-w-[65ch] pb-5 text-[15px] leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
