#!/usr/bin/env python3
"""
Attendance Consultation Form Filler
============================================================
Overlays student data onto the existing attendance_consultation_form.pdf
without modifying the original form in any way.

Usage:
  python scripts/generate-attendance-forms.py
  python scripts/generate-attendance-forms.py --xlsx path/to/Attendance.xlsx
  python scripts/generate-attendance-forms.py --all

Place attendance_consultation_form.pdf in assets/ or agent root folder.
"""

import sys
import os
import argparse
import io
import pandas as pd
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

# ── CONFIG ───────────────────────────────────────────────────────────────────
CONFIG = {
    "ATTENDANCE_XLSX":  None,  # Auto-detected from --xlsx arg or by scanning agent folder
    "FORM_TEMPLATE":    "assets/attendance_consultation_form.pdf",
    "OUTPUT_DIR":       "attendance",
    "COURSE_NUMBER":    "",    # Read from xlsx or set manually
    "SEMESTER":         "",    # Read from xlsx or set manually
    "ALLOWABLE_ABSENCES": 6,
    "TOTAL_COURSE_DAYS":  80,
}
# ─────────────────────────────────────────────────────────────────────────────

# Exact field positions derived from pdfplumber coordinate scan
# x = left edge to start typing, y = reportlab coords (792 - pdfplumber_top - 2)
FIELDS = {
    "name":           (104, 659),
    "student_id":     (414, 659),
    "course_name":    (137, 634),
    "course_num":     (407, 634),
    "semester":       (410, 610),
    "absences_line":  (122, 563),
    "tardies_line":   (112, 539),
    "total_sessions": (284, 453),
    "allowable":      (490, 453),
    # Each counseling row: (number_x, number_y, date_x, date_y)
    "row_instructor": (78, 405, 459, 405),
    "row_dept_chair": (78, 298, 459, 298),
    "row_advisor":    (78, 190, 459, 190),
}

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--xlsx", help="Path to attendance Excel file")
    p.add_argument("--form", help="Path to the blank form PDF template")
    p.add_argument("--out",  help="Output directory")
    p.add_argument("--all",  action="store_true",
                   help="Generate forms for all students including zero absences")
    p.add_argument("--min",  type=int, default=1,
                   help="Minimum absences to generate a form (default 1)")
    return p.parse_args()

def load_attendance(xlsx_path):
    df          = pd.read_excel(xlsx_path, sheet_name="Attendance", header=None)
    course_name = str(df.iloc[0, 0]).strip().replace("L    01 ", "").replace("L 01 ", "").strip()
    instructor  = str(df.iloc[1, 0]).strip().replace("Leaders: ", "").strip()
    headers     = df.iloc[3].tolist()

    name_col     = next(i for i, h in enumerate(headers) if str(h).strip() == "Name")
    id_col       = next(i for i, h in enumerate(headers) if str(h).strip() == "ID#")
    total_col    = next(i for i, h in enumerate(headers) if "Total" in str(h))
    absent_col   = next(i for i, h in enumerate(headers) if str(h).strip() == "Absent")
    tardy_col    = next(i for i, h in enumerate(headers) if str(h).strip() == "Tardy")
    appealed_col = next(i for i, h in enumerate(headers) if "Appealed" in str(h))
    date_cols    = [(i, h) for i, h in enumerate(headers)
                   if i > appealed_col and isinstance(h, datetime)]

    students = []
    for row_idx in range(4, len(df)):
        row  = df.iloc[row_idx]
        name = str(row.iloc[name_col]).strip()
        if name in ("nan", "", "Name", "Withdrawn Students"):
            continue
        if str(row.iloc[id_col]).strip() in ("nan", "", "ID#"):
            continue
        if "Withdrawn" in [str(row.iloc[i]).strip() for i, _ in date_cols]:
            continue

        try:
            sid = str(int(float(str(row.iloc[id_col])))).strip()
        except Exception:
            sid = str(row.iloc[id_col]).strip()

        def si(v):
            try: return int(float(str(v)))
            except: return 0

        absence_dates = []
        tardy_dates   = []
        for i, h in date_cols:
            val = str(row.iloc[i]).strip()
            if val == "Absent" and isinstance(h, datetime):
                absence_dates.append(h.strftime("%-m/%-d/%Y"))
            elif val == "Tardy" and isinstance(h, datetime):
                tardy_dates.append(h.strftime("%-m/%-d/%Y"))

        students.append({
            "name": name, "id": sid,
            "total_sessions": si(row.iloc[total_col]),
            "absences":  si(row.iloc[absent_col]),
            "tardies":   si(row.iloc[tardy_col]),
            "absence_dates": absence_dates,
            "tardy_dates":   tardy_dates,
        })
    return course_name, instructor, students

def counseling_thresholds(allowable):
    return allowable - 2, allowable - 1, allowable

def safe_filename(name):
    return name.replace(",","").replace(".","").replace(" ","_") + "_AttendanceForm.pdf"

def build_overlay(student, course_name, course_number, semester,
                  allowable, total_course_days):
    """Build a transparent text overlay PDF in memory."""
    buf = io.BytesIO()
    c   = canvas.Canvas(buf, pagesize=letter)
    F   = FIELDS

    # ── Header fields ────────────────────────────────────────────────────
    c.setFont("Helvetica", 10)
    c.drawString(F["name"][0],       F["name"][1],       student["name"])
    c.drawString(F["student_id"][0], F["student_id"][1], student["id"])
    c.drawString(F["course_name"][0],F["course_name"][1],course_name)
    c.drawString(F["course_num"][0], F["course_num"][1], course_number)
    c.drawString(F["semester"][0],   F["semester"][1],   semester)

    # ── Absences / Tardies ────────────────────────────────────────────────
    c.setFont("Helvetica", 9)
    abs_str   = ", ".join(student["absence_dates"]) if student["absence_dates"] else "None"
    tardy_str = ", ".join(student["tardy_dates"])   if student["tardy_dates"]   else "None"

    def draw_wrapped(text, x, y, max_w=382, lh=11):
        words, line, cy = text.split(", "), "", y
        for w in words:
            test = line + (", " if line else "") + w
            if c.stringWidth(test, "Helvetica", 9) > max_w and line:
                c.drawString(x, cy, line)
                cy -= lh
                line = w
            else:
                line = test
        if line:
            c.drawString(x, cy, line)

    draw_wrapped(abs_str,   F["absences_line"][0], F["absences_line"][1])
    draw_wrapped(tardy_str, F["tardies_line"][0],  F["tardies_line"][1])

    # ── Sessions / Allowable ─────────────────────────────────────────────
    c.setFont("Helvetica", 10)
    c.drawString(F["total_sessions"][0], F["total_sessions"][1], str(total_course_days))
    c.drawString(F["allowable"][0],      F["allowable"][1],      str(allowable))

    # ── Counseling rows ───────────────────────────────────────────────────
    inst_t, chair_t, advisor_t = counseling_thresholds(allowable)
    rows = [
        (inst_t,    F["row_instructor"]),
        (chair_t,   F["row_dept_chair"]),
        (advisor_t, F["row_advisor"]),
    ]

    for absence_num, coords in rows:
        nx, ny, dx, dy = coords

        # Fill the _____ blank with the threshold number
        c.setFont("Helvetica-Bold", 10)
        c.drawString(nx, ny, str(absence_num))

        # Fill the Date _________ with the triggering absence date
        if (student["absences"] >= absence_num and
                len(student["absence_dates"]) >= absence_num):
            c.setFont("Helvetica", 10)
            c.drawString(dx, dy, student["absence_dates"][absence_num - 1])

    c.save()
    buf.seek(0)
    return buf

def generate_forms(xlsx_path, form_path, output_dir, config,
                   include_all=False, min_absences=1):
    os.makedirs(output_dir, exist_ok=True)

    print(f"\nReading: {xlsx_path}")
    course_name, instructor, students = load_attendance(xlsx_path)
    print(f"Course:     {course_name}")
    print(f"Instructor: {instructor}")
    print(f"Students:   {len(students)} active\n")

    allowable     = config["ALLOWABLE_ABSENCES"]
    total_days    = config["TOTAL_COURSE_DAYS"]
    course_number = config["COURSE_NUMBER"]
    semester      = config["SEMESTER"]

    generated = skipped = 0

    for student in sorted(students, key=lambda s: s["name"]):
        if not include_all and student["absences"] < min_absences:
            skipped += 1
            continue

        # Build overlay and merge onto template
        overlay_buf     = build_overlay(student, course_name, course_number,
                                        semester, allowable, total_days)
        template_reader = PdfReader(form_path)
        overlay_reader  = PdfReader(overlay_buf)
        writer          = PdfWriter()

        page = template_reader.pages[0]
        page.merge_page(overlay_reader.pages[0])
        writer.add_page(page)

        fname    = safe_filename(student["name"])
        out_path = os.path.join(output_dir, fname)
        with open(out_path, "wb") as f:
            writer.write(f)

        inst_t, chair_t, advisor_t = counseling_thresholds(allowable)
        flag = ""
        if   student["absences"] >= advisor_t: flag = "  *** SUCCESS ADVISOR ***"
        elif student["absences"] >= chair_t:   flag = "  ** DEPT CHAIR **"
        elif student["absences"] >= inst_t:    flag = "  * INSTRUCTOR *"

        print(f"  {fname}  (Abs: {student['absences']}, Tardy: {student['tardies']}){flag}")
        generated += 1

    print(f"\nDone. {generated} form(s) saved to: {output_dir}")
    if skipped:
        print(f"Skipped {skipped} with 0 absences. Use --all to include.")

    print("\n--- Counseling Summary ---")
    inst_t, chair_t, advisor_t = counseling_thresholds(allowable)
    for s in sorted(students, key=lambda x: -x["absences"]):
        if s["absences"] >= inst_t:
            level = ("INSTRUCTOR" if s["absences"] < chair_t else
                     "DEPT CHAIR" if s["absences"] < advisor_t else "SUCCESS ADVISOR")
            print(f"  {s['name']:<45} {s['absences']} abs -> {level}")

if __name__ == "__main__":
    args   = parse_args()
    config = CONFIG.copy()

    xlsx = args.xlsx or config["ATTENDANCE_XLSX"]
    if not os.path.exists(xlsx):
        for root, _, files in os.walk("."):
            for f in files:
                if f.lower().startswith("attendance") and f.endswith(".xlsx"):
                    xlsx = os.path.join(root, f); break

    form = args.form or config["FORM_TEMPLATE"]
    if not os.path.exists(form):
        for c in ["attendance_consultation_form.pdf",
                  "assets/attendance_consultation_form.pdf"]:
            if os.path.exists(c):
                form = c; break

    if not os.path.exists(xlsx):
        print(f"ERROR: Attendance file not found: {xlsx}"); sys.exit(1)
    if not os.path.exists(form):
        print(f"ERROR: Form template not found: {form}")
        print("Place attendance_consultation_form.pdf in the agent root or assets/ folder.")
        sys.exit(1)

    generate_forms(xlsx, form, args.out or config["OUTPUT_DIR"],
                   config, include_all=args.all, min_absences=args.min)
