FISH GUY - STUDENT DISCOUNT
===========================
Run these in PowerShell, inside C:\Users\Chairman Enny\fish-guy

1) Unzip over the project
   Expand-Archive -Force "$env:USERPROFILE\Downloads\fish-guy-students.zip" -DestinationPath .

2) Add the new tables to the schema (safe to run twice)
   node scripts/patch-schema-students.mjs

3) Create the tables in your database
   npx prisma migrate dev --name students

4) Add the Lagos school list (you can edit it later in Admin > Students > Schools list)
   node scripts/seed-institutions.mjs

5) Check it builds, then publish
   npm run build
   git add .
   git commit -m "Student discount"
   git push

6) Turn it on: Admin > Settings > Student discount. Type the percentage you choose
   (0 = off). Optionally set a maximum naira discount per order, and how long
   a verification lasts (default 365 days). Save.

HOW IT WORKS
- Students apply at /student with a photo of their ID. You review them in Admin > Students
  (Approve, or Reject with a reason). The ID photo is deleted after your decision.
- Once approved, the student's phone number gets the discount at checkout.
  It only works with the phone number they applied with.
- The discount is taken off the food total, never the delivery fee.
- Nothing is shown to customers until you set a percentage above 0.
