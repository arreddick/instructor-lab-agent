# Ranken Technical College -- Syllabus Rules Framework
_General rules for building syllabi for any Ranken course. Before starting any syllabus, collect the required course info below. Never assume defaults -- always ask._

---

## Step 1: Collect Course Info Before Starting

Ask the instructor for the following before generating anything:

### Course Identity
- Course code and name (e.g., INF 2014 -- System Administration 1)
- Department
- Credit hours
- Instructor name, email, office location, office hours
- Room number and building
- Term / semester

### Schedule Type
- How many instructional days total? (Common: 80-day semester, 56-day Mon-Thu summer, 54-day Mon-Fri summer)
- What days of the week does the class meet?
- What are the start and end dates?
- Are there any holidays, no-school days, or special events to exclude?
- Are there any field trips, certification days, or guest speaker days to include?

### Content Structure
- How many modules or units?
- What are the module names and topics?
- What certifications or exams does the course align to (if any)?
- Are there official exam objectives or a textbook to reference?

### Assessments
- What types of assessments are used? (Labs, HOTs, written exams, quizzes, projects, etc.)
- How many of each?
- What are the point values or weights?
- Are any assessments tied to specific days or milestones?

### Labs
- How many labs total?
- What are the lab names and titles?
- Are labs tied to specific modules?
- Must all labs for a module be completed before that module's exam?

### Homework / Self-Study
- Is there a homework component?
- What does homework reference? (Videos, episodes, study guides, textbook chapters, etc.)
- Does the homework reference change when the module changes?

### Grading Scale
- Confirm grading scale. Default Ranken scale unless told otherwise:

  | Grade | Range |
  |-------|-------|
  | A | 90-100% |
  | B | 80-89% |
  | C | 70-79% |
  | D | 60-69% |
  | F | Below 60% |

### Branding
- Confirm logo(s) to use. Default: Ranken logo top-right on all pages.
- Are there any partner or event logos for special days? (e.g., WWT logo for a field trip day)

---

## Step 2: Apply Universal Scheduling Rules

These rules apply to every Ranken syllabus regardless of course:

### Rule 1: Content Moves, Dates Do Not
When inserting or removing a day (holiday, field trip, cancellation), shift content between day slots only. Dates are fixed to the calendar. Day numbers stay tied to their calendar dates. Never reassign a date.

### Rule 2: Homework References the Active Module
Homework on any given day references the module being studied on that day. The reference flips to the next module on the same day as the current module's final assessment, not the day after. All homework elements flip together: videos, episodes, study guides, chapters, etc.

### Rule 3: Labs Precede Their Module's Assessment
All labs assigned to a module must be scheduled before that module's written exam or final assessment. If a lab would land on or after an assessment day, move it to an earlier available day.

### Rule 4: Assessment Days Are Anchored
Once an assessment day (exam, HOT, quiz, project due date) is placed, treat it as an anchor. Move content around it. Never move the assessment to accommodate content.

### Rule 5: Special Day Handling (Field Trips, Guest Speakers, Certification Days)
- Mark the special day clearly with any relevant labels or logos provided.
- Cascade all content planned for that day forward by one slot.
- The final day of the cascade absorbs the content of the day it displaced.
- No content is lost; it is always redistributed.

### Rule 6: No Em Dashes
Never use em dashes anywhere in generated syllabus content. Use colons, semicolons, commas, or periods instead.

---

## Step 3: Apply DOCX Technical Rules (if generating a Word file)

### Paragraph Tag Detection
Before editing any existing DOCX XML, check which paragraph tag style is used:
- Plain style: `<w:p>` -- use `rfind('<w:p>', 0, position)`
- Attributed style: `<w:p w:rsidR="...">` -- use `rfind('<w:p ', 0, position)` (note the trailing space)

Never assume the style. Always inspect the file first.

### Content Block Extraction
1. Find end of the date header paragraph: `content.find('</w:p>', day_pos) + len('</w:p>')`
2. Find the start of the next day: `rfind('<w:p[space or >]', 0, next_day_pos)` using the correct style above
3. Apply all replacements back-to-front (highest index first) to preserve absolute positions.

### pPr Element Order
Inside `<w:pPr>`, always order elements as: `spacing` then `ind` then `jc`. Wrong order causes Word validation errors on open.

### Table Row Cloning
Extract rows with `re.findall(r'<w:tr\b.*?</w:tr>', content, re.DOTALL)`. Replace cell text with `row.replace(f'>{old}<', f'>{new}<', 1)`.

### After Editing
Word repair dialogs on first open after unpack/repack are cosmetic (XML whitespace). Click Close, save, and reopen. They will not return.

---

## Step 4: Standard Syllabus Sections

Every Ranken syllabus should include these sections:

1. **Header block**: Course name, code, term, instructor info, room, schedule days and times
2. **Course description**: 2-3 sentence overview of what the course covers
3. **Student learning outcomes / CLOs**: Numbered list of what students will demonstrate by the end
4. **Required materials**: Textbooks, software, accounts, tools, equipment
5. **Grading breakdown**: Assessment types, point values, total points, grade scale table
6. **Daily schedule table**: At minimum -- day number, date, topics and activities
   - Highlight written exam rows
   - Highlight major assessment rows (HOTs, projects, finals)
   - Mark special days (field trips, guest speakers) with labels or logos
7. **Course policies**: Attendance, late work, academic integrity, disability accommodations
8. **Homework or self-study block** (if applicable): Listed per day or per module within the schedule

---

## Step 5: Confirm Before Generating

Before writing any content, summarize back to the instructor:
- Course name, code, and schedule type
- Total instructional days and date range
- Module list and assessment schedule
- Any special days (holidays, field trips, partner events)
- Grading scale being used

Wait for explicit confirmation before proceeding.
