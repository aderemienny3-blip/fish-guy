import { db } from "@/lib/db";
import { StudentApplyForm } from "@/components/shop/student-apply-form";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { naira } from "@/lib/shop/format";
import { getStudentRules } from "@/lib/student";

export const dynamic = "force-dynamic";
export const metadata = { title: "Student discount | Fish Guy", description: "Students in Lagos save on frozen food. Verify once and the discount applies to your orders." };

export default async function StudentPage() {
  const [rules, institutions] = await Promise.all([
    getStudentRules(),
    db.institution.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
  ]);

  return (
    <main className="page-width utility-page">
      <p className="eyebrow">FISH GUY FOR STUDENTS</p>
      {rules.percent > 0 ? (
        <>
          <h1>Students save {rules.percent}%</h1>
          <p className="utility-intro">
            If you study at a university, polytechnic or college of education in Lagos, verify once and {rules.percent}% comes off the food in every order
            {rules.maxKobo ? ` (up to ${naira(rules.maxKobo)} per order)` : ""}. Delivery fees are not discounted.
          </p>
          <ol className="delivery-steps student-steps">
            <li className="delivery-step"><span className="step-number">01</span><h3>Send your details</h3><p>Fill the form below with a clear photo of your student ID.</p></li>
            <li className="delivery-step"><span className="step-number">02</span><h3>We check it</h3><p>We review applications and let you know on your status page.</p></li>
            <li className="delivery-step"><span className="step-number">03</span><h3>Save on every order</h3><p>Once approved, the discount applies at checkout automatically.</p></li>
          </ol>
          <StudentApplyForm institutions={institutions} />
          <p className="field-note student-fineprint">
            Approved for {rules.validityDays} days, then you verify again. The discount works only with the phone number on your application.
          </p>
        </>
      ) : (
        <>
          <h1>Student discount</h1>
          <ShopEmptyState title="Opening soon" description="We are getting the student discount ready. Please check back shortly." actionHref="/shop" actionLabel="Shop now" />
        </>
      )}
    </main>
  );
}
