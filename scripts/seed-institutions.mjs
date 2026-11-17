// Adds a starting list of Lagos institutions. Safe to re-run (existing names are skipped).
// Anything missing can be added in Admin > Students > Institutions, and students can also type "Other".
import { PrismaClient } from "@prisma/client";

const LIST = [
  ["University of Lagos (UNILAG)", "UNIVERSITY"],
  ["Lagos State University (LASU)", "UNIVERSITY"],
  ["Lagos State University of Science and Technology (LASUSTECH)", "UNIVERSITY"],
  ["Lagos State University of Education (LASUED)", "UNIVERSITY"],
  ["Pan-Atlantic University", "UNIVERSITY"],
  ["Caleb University", "UNIVERSITY"],
  ["Augustine University", "UNIVERSITY"],
  ["Anchor University", "UNIVERSITY"],
  ["Eko University of Medicine and Health Sciences", "UNIVERSITY"],
  ["National Open University of Nigeria (NOUN)", "UNIVERSITY"],
  ["Yaba College of Technology (YABATECH)", "POLYTECHNIC"],
  ["Lagos City Polytechnic", "POLYTECHNIC"],
  ["Grace Polytechnic", "POLYTECHNIC"],
  ["Federal College of Education (Technical), Akoka", "COLLEGE_OF_EDUCATION"],
  ["Michael Otedola College of Primary Education (MOCPED), Epe", "COLLEGE_OF_EDUCATION"],
  ["St. Augustine College of Education, Yaba", "COLLEGE_OF_EDUCATION"],
];

const db = new PrismaClient();
try {
  const r = await db.institution.createMany({ data: LIST.map(([name, type]) => ({ name, type })), skipDuplicates: true });
  console.log(`Added ${r.count} institutions (${LIST.length - r.count} already existed).`);
} finally {
  await db.$disconnect();
}
