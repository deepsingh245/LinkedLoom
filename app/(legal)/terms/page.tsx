import type { Metadata } from "next";
import { LegalPage, CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
    title: "Terms of Service | LinkedLoom",
    description: "The rules for using LinkedLoom.",
};

export default function TermsPage() {
    return (
        <LegalPage title="Terms of Service">
            <section>
                <p>
                    By creating an account or using LinkedLoom you agree to these terms. If you do not agree, do not use the service.
                </p>
            </section>

            <section>
                <h2>1. The service</h2>
                <p>
                    LinkedLoom lets you draft posts (optionally with AI assistance), schedule them, and publish them to LinkedIn and Reddit accounts
                    that you connect. We act only on your instructions and only on accounts you authorize.
                </p>
            </section>

            <section>
                <h2>2. Your account and connected accounts</h2>
                <ul>
                    <li>You are responsible for your account and for everything published through it.</li>
                    <li>You may connect only accounts that you own or are authorized to manage.</li>
                    <li>You can disconnect any platform at any time in Settings.</li>
                </ul>
            </section>

            <section>
                <h2>3. Acceptable use</h2>
                <p>You agree not to use LinkedLoom to:</p>
                <ul>
                    <li>spam, post repetitive or unsolicited promotional content, or evade a community&apos;s rules;</li>
                    <li>manipulate votes, engagement or visibility, or operate fake or multiple accounts;</li>
                    <li>harass, deceive or mislead people, or publish illegal, hateful, sexually explicit or infringing content;</li>
                    <li>scrape, collect or resell platform data, or use platform data to train AI models;</li>
                    <li>profile, track or monitor other users;</li>
                    <li>bypass rate limits, posting caps or security measures.</li>
                </ul>
                <p className="mt-3">
                    You must follow the rules of every platform and community you post to, including{" "}
                    <a href="https://www.redditinc.com/policies/user-agreement" target="_blank" rel="noreferrer">Reddit&apos;s User Agreement</a>,{" "}
                    <a href="https://www.linkedin.com/legal/user-agreement" target="_blank" rel="noreferrer">LinkedIn&apos;s User Agreement</a> and each
                    subreddit&apos;s rules. Many subreddits restrict self-promotion or AI-generated content. That is your responsibility to check.
                </p>
            </section>

            <section>
                <h2>4. Posting limits</h2>
                <p>
                    To prevent spam and respect platform limits we cap automated Reddit posts per user (currently 5 per 24 hours) and may adjust
                    or add limits. Posts may fail or be delayed if a platform rejects or rate-limits them.
                </p>
            </section>

            <section>
                <h2>5. AI-generated content</h2>
                <p>
                    AI output can be inaccurate or similar to other content. You are responsible for reviewing, editing and approving everything before
                    it is published, and for disclosing AI use where a platform or community requires it.
                </p>
            </section>

            <section>
                <h2>6. Your content</h2>
                <p>
                    You keep ownership of the content you create. You grant us a limited license to store, process and transmit it only to operate
                    the service for you (for example, to publish it to the platforms you choose).
                </p>
            </section>

            <section>
                <h2>7. Third-party platforms</h2>
                <p>
                    LinkedIn and Reddit are independent services. LinkedLoom is not affiliated with or endorsed by them. They may change their APIs,
                    limits or policies, or suspend your access, which can affect features here. We are not liable for actions taken by those platforms.
                </p>
            </section>

            <section>
                <h2>8. Termination</h2>
                <p>
                    You can stop using LinkedLoom at any time. We may suspend or end access if you violate these terms or the rules of a connected
                    platform, or to protect the service or other users.
                </p>
            </section>

            <section>
                <h2>9. Disclaimers and liability</h2>
                <p>
                    The service is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by law, LinkedLoom is not
                    liable for indirect or consequential damages, lost profits, or content removal and account actions taken by third-party platforms.
                </p>
            </section>

            <section>
                <h2>10. Changes and contact</h2>
                <p>
                    We may update these terms; continued use after a change means you accept it. Questions:{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our <a href="/privacy">Privacy Policy</a>.
                </p>
            </section>
        </LegalPage>
    );
}
