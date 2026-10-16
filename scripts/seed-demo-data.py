#!/usr/bin/env python3
"""Book a realistic week of demo appointments through the public API.

    python3 scripts/seed-demo-data.py                       # docker compose (localhost:8000)
    python3 scripts/seed-demo-data.py http://clinicdesk.local  # through the Kubernetes ingress
"""
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")

PATIENTS = [
    ("Rahul Mehta", "+91 98765 43210", "Chest pain follow-up", "follow_up"),
    ("Neha Iyer", "+91 99887 66554", "Skin rash on forearm", "consultation"),
    ("Aarav Gupta", "+91 91234 56780", "Vaccination (age 4)", "procedure"),
    ("Priya Sharma", "+91 90000 11223", "Knee pain after running", "consultation"),
    ("Kabir Singh", "+91 98111 22334", "ECG review", "follow_up"),
    ("Ananya Das", "+91 97777 88990", "Acne treatment plan", "follow_up"),
    ("Ishaan Verma", "+91 96666 55443", "High fever, 3 days", "emergency"),
    ("Sara Thomas", "+91 95555 44332", "Fractured wrist check", "follow_up"),
    ("Dev Patel", "+91 94444 33221", "Annual cardiac screening", "consultation"),
    ("Meera Joshi", "+91 93333 22110", "Mole removal", "procedure"),
]
# (day offset, hour, minute, patient index, doctor index, final status)
SCHEDULE = [
    (-2, 10, 0, 0, 0, "completed"), (-2, 11, 30, 3, 3, "completed"), (-1, 9, 30, 1, 1, "completed"),
    (-1, 15, 0, 5, 1, "no_show"), (-1, 16, 0, 7, 3, "cancelled"),
    (0, 9, 0, 4, 0, "completed"), (0, 10, 0, 2, 2, "completed"), (0, 11, 0, 6, 2, "checked_in"),
    (0, 17, 30, 8, 0, "scheduled"), (0, 18, 15, 9, 1, "scheduled"), (0, 19, 0, 3, 3, "scheduled"),
    (1, 10, 0, 0, 0, "scheduled"), (1, 12, 0, 5, 1, "scheduled"), (2, 9, 30, 2, 2, "scheduled"),
    (3, 14, 0, 7, 3, "scheduled"), (4, 11, 0, 9, 1, "scheduled"),
]


def call(method: str, path: str, body: dict | None = None) -> dict | list | None:
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


def main() -> None:
    doctors = call("GET", "/api/doctors")
    if len(doctors) < 4:
        sys.exit("Expected the 4 demo doctors from migration 0002")
    today = datetime.now(ZoneInfo("Asia/Kolkata")).replace(second=0, microsecond=0, tzinfo=None)
    booked = 0
    for day, hour, minute, p, d, status in SCHEDULE:
        name, phone, reason, visit_type = PATIENTS[p]
        when = (today + timedelta(days=day)).replace(hour=hour, minute=minute)
        try:
            appt = call("POST", "/api/appointments", {
                "patient_name": name, "patient_phone": phone, "doctor_id": doctors[d]["id"],
                "scheduled_at": when.isoformat(), "duration_minutes": 30,
                "visit_type": visit_type, "reason": reason,
            })
        except urllib.error.HTTPError as exc:
            print(f"skip {name} {when:%d %b %H:%M}: {exc.code} {exc.read().decode()}")
            continue
        if status != "scheduled":
            call("PUT", f"/api/appointments/{appt['id']}", {"status": status})
        booked += 1
    print(f"Booked {booked} appointments via {BASE}")
    print(json.dumps(call("GET", "/api/appointments/stats"), indent=2))


if __name__ == "__main__":
    main()
