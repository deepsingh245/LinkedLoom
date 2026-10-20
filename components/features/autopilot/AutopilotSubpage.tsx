import { AutopilotNav } from "@/components/features/autopilot/AutopilotNav"

interface AutopilotSubpageProps {
    /** Small line above the title, e.g. "Autopilot / AI keys". */
    eyebrow: React.ReactNode
    title: string
    description: React.ReactNode
    /** Buttons on the right of the header. */
    actions?: React.ReactNode
    children: React.ReactNode
}

/**
 * One layout for Autopilot's secondary pages (Persona Studio, AI keys, Credits & usage): the same width as the
 * other workspace pages, with "Back to Autopilot" always in the same place (top left, above the title).
 */
export function AutopilotSubpage({ eyebrow, title, description, actions, children }: AutopilotSubpageProps) {
    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-6 text-[#20242b] md:space-y-7">
            <AutopilotNav />
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">{eyebrow}</div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">{title}</h1>
                    <p className="mt-1 max-w-[650px] text-sm leading-6 text-[#748087]">{description}</p>
                </div>
                {actions}
            </header>
            {children}
        </div>
    )
}
