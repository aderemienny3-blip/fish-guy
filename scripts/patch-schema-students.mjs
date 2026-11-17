// Adds the student-discount tables and fields to prisma/schema.prisma.
// Safe to run more than once. Run:  node scripts/patch-schema-students.mjs
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "prisma/schema.prisma";
let s = readFileSync(FILE, "utf8");
let changed = 0;

function addToModel(model, marker, lines) {
  const start = s.indexOf(`model ${model} {`);
  if (start === -1) throw new Error(`model ${model} not found in ${FILE}`);
  const end = s.indexOf("\n}", start);
  const body = s.slice(start, end);
  if (body.includes(marker)) return;
  s = s.slice(0, end) + "\n" + lines.map((l) => "  " + l).join("\n") + s.slice(end);
  changed++;
}

addToModel("Order", "discountKobo", [
  "discountKobo           Int                  @default(0)",
  "studentVerificationId  String?",
  "studentVerification    StudentVerification? @relation(fields: [studentVerificationId], references: [id])",
]);

addToModel("StoreSettings", "studentDiscountPercent", [
  "studentDiscountPercent Int      @default(0) // 0 = student discount is off",
  "studentDiscountMaxKobo Int? // optional cap per order, in kobo",
  "studentValidityDays    Int      @default(365)",
]);

if (!s.includes("model StudentVerification")) {
  s += `

// ---- FISH GUY STUDENT DISCOUNT ----

enum InstitutionType {
  UNIVERSITY
  POLYTECHNIC
  COLLEGE_OF_EDUCATION
  OTHER
}

enum StudentStatus {
  PENDING
  APPROVED
  REJECTED
  REVOKED
}

model Institution {
  id            String                @id @default(cuid())
  name          String                @unique
  type          InstitutionType
  active        Boolean               @default(true)
  createdAt     DateTime              @default(now())
  verifications StudentVerification[]
}

model StudentVerification {
  id               String        @id @default(cuid())
  reference        String        @unique
  fullName         String
  phone            String
  email            String
  institutionId    String?
  otherInstitution String?
  matricNumber     String
  idPath           String?
  status           StudentStatus @default(PENDING)
  rejectReason     String?
  approvedAt       DateTime?
  expiresAt        DateTime?
  reviewedAt       DateTime?
  createdAt        DateTime      @default(now())
  institution      Institution?  @relation(fields: [institutionId], references: [id])
  orders           Order[]

  @@index([phone])
  @@index([status, createdAt])
}
`;
  changed++;
}

writeFileSync(FILE, s);
console.log(changed ? `Schema updated (${changed} change${changed > 1 ? "s" : ""}).` : "Schema already up to date.");
