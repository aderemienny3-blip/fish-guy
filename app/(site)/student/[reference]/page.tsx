import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StudentUseButton } from "@/components/shop/student-use-button";
import { STUDENT_REF, getStudentRules } from "@/lib/student";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your student application | Fish Guy" };

const dateFmt = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" });

export default async function StudentStatusPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!STUDENT_REF.test(reference)) notFound();
  const [v, rules] = await Promise.all([db.studentVerification.findUnique({ where: { reference } }), getStudentRules()]);
  if (!v) notFound();

  const expired = v.status === "APPROVED" && !!v.expiresAt && v.expiresAt <= new Date();
  const active = v.status === "APPROVED" && !expired;

  return (
    <main className="page-width utility-page order-page">
      <p className="eyebrow">STUDENT APPLICATION {v.reference}</p>
      <h1>
        {active ? "You're verified" : v.status === "PENDING" ? "We're reviewing your application" : v.status === "REJECTED" ? "We could not approve this application" : expired ? "Your verification has expired" : "This discount is no longer active"}
      </h1>

      {v.status === "PENDING" && (
        <p className="utility-intro">Thanks, {v.fullName.split(" ")[0]}. Save this page. Come back to it and refresh to see the decision.</p>
      )}
      {active && (
        <>
          <p className="utility-intro">
            {rules.percent > 0 ? `${rules.percent}% comes off the food in your orders` : "The discount is paused right now"} until {v.expiresAt ? dateFmt.format(v.expiresAt) : ""}. It works with the phone number you applied with.
          </p>
          <StudentUseButton reference={v.reference} />
        </>
      )}
      {v.status === "REJECTED" && (
        <section className="order-card"><h2>Reason</h2><p>{v.rejectReason ?? "The ID could not be verified."}</p><p>You can apply again with a clearer photo.</p></section>
      )}
      {(expired || v.status === "REVOKED") && <p className="utility-intro">You can apply again at any time from the student discount page.</p>}
    </main>
  );
}
