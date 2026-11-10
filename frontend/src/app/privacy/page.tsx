// Privacy notice. TEMPLATE: have it reviewed by a qualified advisor and fill in the
// bracketed details before go-live (Kenya Data Protection Act, 2019).
import Link from 'next/link';

export const metadata = { title: 'Privacy Notice — Urban Security Solutions' };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-gray-700">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-2xl font-bold text-gray-900">Privacy Notice</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: [DATE]</p>

        <Section title="Who we are">
          <p>
            Urban Security Solutions ([REGISTERED COMPANY NAME], [ADDRESS]) is the data controller for the personal data
            processed in this platform. Data Protection contact: [NAME / EMAIL]. ODPC registration number: [NUMBER].
          </p>
        </Section>

        <Section title="What we collect and why">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Account details</strong> (name, email, phone, profile photo): to give staff and clients access.</li>
            <li>
              <strong>Location at shift check-in and check-out only</strong> (GPS coordinates, reported accuracy), plus the
              device&apos;s IP address and browser identifier: to verify guards are on site, which our clients contract us to
              provide. Location is <em>not</em> tracked continuously.
            </li>
            <li><strong>Shift records</strong> (times, hours worked, handovers): for scheduling, payroll and client billing.</li>
            <li><strong>Incident reports and photos</strong>: to document and resolve security incidents at client sites.</li>
            <li><strong>Security and audit logs</strong> (sign-ins, changes made): to protect the system and investigate disputes.</li>
          </ul>
        </Section>

        <Section title="Who can see it">
          <p>
            Administrators see operational data. Guards see their own shifts and reports. Clients see shifts, incidents and
            reports for the sites they contract, and their own invoices. We use [HOSTING / STORAGE PROVIDERS] to run the
            service; they process data only on our instructions.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Precise check-in location and device data is removed after [12] months. Shift, incident and invoice records are
            kept for [7] years for legal and accounting purposes. Accounts are deactivated when employment or a contract ends.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You may ask to access, correct or delete your personal data, or object to its processing, by contacting [EMAIL].
            You may also complain to the Office of the Data Protection Commissioner (www.odpc.go.ke).
          </p>
        </Section>

        <Section title="Security">
          <p>
            Data is encrypted in transit, evidence files are stored privately, passwords are hashed, and access is limited by
            role and recorded in an audit log.
          </p>
        </Section>

        <p className="mt-10 text-sm">
          <Link href="/" className="font-semibold text-indigo-700 hover:underline">← Back to sign in</Link>
        </p>
      </article>
    </main>
  );
}
