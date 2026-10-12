import type { Metadata } from "next";
import { LegalPage, CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
    title: "Privacy Policy | LinkedLoom",
    description: "How LinkedLoom collects, uses and deletes your data, including data from LinkedIn and Reddit.",
};

export default function PrivacyPage() {
    return (
        <LegalPage title="Privacy Policy">
            <section>
                <p>
                    LinkedLoom helps you write, schedule and publish your own posts to LinkedIn and Reddit.
                    This policy explains what we collect, why, who we share it with, and how you can delete it.
                </p>
            </section>

            <section>
                <h2>1. Information we collect</h2>
                <ul>
                    <li><strong>Account data:</strong> name, email address and profile details you provide when you sign up or edit your profile.</li>
                    <li><strong>Content you create:</strong> drafts, scheduled and published posts, tone and platform settings, and images you upload or generate.</li>
                    <li><strong>LinkedIn connection:</strong> when you connect LinkedIn, an access token and basic profile identifiers needed to publish on your behalf.</li>
                    <li>
                        <strong>Reddit connection:</strong> when you connect Reddit, your Reddit username and user ID, profile icon URL,
                        OAuth access and refresh tokens, and a log of posts we submitted for you (time, subreddit and post ID).
                        For your analytics dashboard we also read the score and comment count of <em>your own</em> recent submissions.
                    </li>
                    <li><strong>Technical data:</strong> basic usage and device information handled by our hosting and authentication providers.</li>
                </ul>
                <p className="mt-3">
                    We do <strong>not</strong> access your Reddit password, private messages, mod mail, email address, IP address, browsing history,
                    or other users&apos; content. We do not scrape Reddit.
                </p>
            </section>

            <section>
                <h2>2. How we use it</h2>
                <ul>
                    <li>To publish and schedule posts you create, only at your request and only to the accounts you connected.</li>
                    <li>To show you post history and analytics for your own posts.</li>
                    <li>To generate drafts and images with AI when you ask for it. Only the text you enter or the draft you select is sent to the AI provider.</li>
                    <li>To secure the service, prevent abuse (for example, a daily limit on Reddit posts per user) and fix problems.</li>
                </ul>
                <p className="mt-3">
                    We do not sell your data. We do not use Reddit data, or any data obtained from Reddit, to train, fine-tune or prompt
                    machine-learning or AI models, and we do not use it for advertising, profiling, or to track or monitor other users.
                </p>
            </section>

            <section>
                <h2>3. Service providers</h2>
                <p>We share data only with providers that run the service for us:</p>
                <ul>
                    <li>Google Firebase / Google Cloud (authentication, database, file storage, hosting and server functions).</li>
                    <li>Google AI services (Gemini / Vertex AI) to generate text and images when you request them.</li>
                    <li>LinkedIn and Reddit, when you publish or sync through the accounts you connected.</li>
                </ul>
                <p className="mt-3">We may also disclose information if required by law.</p>
            </section>

            <section>
                <h2>4. Reddit data and the Reddit User Agreement</h2>
                <p>
                    Use of Reddit through LinkedLoom is subject to Reddit&apos;s{" "}
                    <a href="https://www.redditinc.com/policies/user-agreement" target="_blank" rel="noreferrer">User Agreement</a>,{" "}
                    <a href="https://www.reddit.com/policies/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</a> and{" "}
                    <a href="https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy" target="_blank" rel="noreferrer">Responsible Builder Policy</a>.
                    Posts you publish on Reddit are public and governed by Reddit and the rules of each subreddit.
                    If you delete a post on Reddit, it is no longer shown in your LinkedLoom analytics.
                </p>
            </section>

            <section>
                <h2>5. Retention and deletion</h2>
                <ul>
                    <li>
                        <strong>Disconnect Reddit:</strong> in <em>Settings → Profile → Reddit → Disconnect</em>. We revoke your tokens at Reddit and
                        delete your stored Reddit credentials, Reddit post log and the linked username.
                    </li>
                    <li>You can revoke LinkedLoom&apos;s access at any time at <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noreferrer">reddit.com/prefs/apps</a>.</li>
                    <li>You can delete drafts and posts inside the app.</li>
                    <li>
                        To delete your whole account and all associated data, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                        We will process verified requests within 30 days.
                    </li>
                </ul>
                <p className="mt-3">We keep account data while your account is active and delete it after you close your account, except where we must keep it by law.</p>
            </section>

            <section>
                <h2>6. Security</h2>
                <p>
                    OAuth tokens are stored server-side and are not accessible from your browser. Access to your data is restricted to you and our backend.
                    No system is perfectly secure, but we work to protect your information.
                </p>
            </section>

            <section>
                <h2>7. Your rights</h2>
                <p>
                    Depending on where you live, you may have the right to access, correct, export or delete your data and to object to certain
                    processing. Contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                </p>
            </section>

            <section>
                <h2>8. Children</h2>
                <p>LinkedLoom is not intended for anyone under 16 and we do not knowingly collect their data.</p>
            </section>

            <section>
                <h2>9. Changes and contact</h2>
                <p>
                    We may update this policy and will change the date above when we do. Questions:{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                </p>
            </section>
        </LegalPage>
    );
}
