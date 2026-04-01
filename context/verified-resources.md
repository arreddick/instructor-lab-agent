# Verified Resources
_Pre-checked URLs and sources by course and topic. Always cross-reference before writing a lab step that sends students to an external site. Confirm a site does what the lab claims before including it._

---

## How to Use This File
- **VERIFIED**: Tested and confirmed to work as described.
- **BROKEN / MISLEADING**: Do not use. Reason noted.
- **CAUTION**: Works but has caveats. Read the note before using.

---

## AZ-900 / Azure Labs

### Azure Portal
| Resource | URL | Status | Notes |
|----------|-----|--------|-------|
| Azure Portal | https://portal.azure.com | VERIFIED | Main portal. UI changes frequently; verify nav paths before finalizing lab steps. |
| Azure for Students | https://azure.microsoft.com/en-us/free/students | VERIFIED | Students sign in with @insideranken.org accounts. |
| Azure Pricing Calculator | https://azure.microsoft.com/en-us/pricing/calculator | VERIFIED | Used in cost management labs. |
| Azure TCO Calculator | https://azure.microsoft.com/en-us/pricing/tco/calculator | VERIFIED | Total Cost of Ownership tool. |
| Microsoft Learn AZ-900 Path | https://learn.microsoft.com/en-us/certifications/azure-fundamentals/ | VERIFIED | Official study path. |

### Known Azure Portal UI Changes
See `courses/az900.json` > `labs` > `known_issues` for the authoritative per-lab issue list. Summary:
- **Lab 10**: Container logs nav path changed. Verify current path before publishing.
- **Lab 12**: Feature deprecated. Lab needs replacement steps.
- **Lab 15 Task 2**: Anonymous blob access now disabled by default at storage account level. Task 1 must add a step to enable it first.
- **Lab 16 Task 2**: SQL firewall now shows an Allowlist server IP button inline. Use that, not manual firewall nav. SQL script requires AdventureWorksLT sample data at creation time.
- **Default region**: East US 2 for all labs.

---

## Security+ SY0-701 Labs

### Malware / Threat Intelligence
| Resource | URL | Status | Notes |
|----------|-----|--------|-------|
| VirusTotal | https://www.virustotal.com | VERIFIED | File upload and hash lookup both work. Clipboard from VM to host is blocked in classroom -- hash lookup requires manual typing or a hardcoded hash in the lab. |
| MalwareBazaar | https://bazaar.abuse.ch | VERIFIED | Browsable malware sample database. Works for browsing by tag and family. |
| Ransomware Notes (GitHub) | https://github.com/NextronSystems/ransomware-notes | VERIFIED | Dedicated repo with actual ransom note text files organized by ransomware family. Use for ransom note browsing tasks. |
| CISA Advisories | https://www.cisa.gov/news-events/cybersecurity-advisories | VERIFIED | Use for threat group research (e.g., LockBit advisory AA23-075A). |
| FBI IC3 | https://www.ic3.gov | VERIFIED | FBI flash alerts for ransomware groups. |
| ransomware.live | https://www.ransomware.live | CAUTION | Tracks active groups only. Seized or inactive groups (e.g., LockBit post-Operation Cronos Feb 2024) have sparse listings. Do not use for LockBit research tasks. |

### BROKEN / MISLEADING -- Do Not Use
| Resource | URL | Reason |
|----------|-----|--------|
| id-ransomware.malwarehunterteam.com | https://id-ransomware.malwarehunterteam.com | MISLEADING: Identification tool only (upload a ransom note to identify the strain). No browsable ransomware library. Never write lab steps that tell students to browse this site. |

### Network / Packet Analysis
| Resource | URL | Status | Notes |
|----------|-----|--------|-------|
| Wireshark | https://www.wireshark.org | VERIFIED | Used in network traffic analysis labs. |
| PCAP samples | https://www.malware-traffic-analysis.net | VERIFIED | Real-world PCAP files for analysis exercises. |

### Classroom Lab Environment Constraints
- **Clipboard**: Hyper-V clipboard between host and VMs is non-functional. No copy-paste of hashes, commands, or text between host and VM.
- **Hydra SSH**: Fails on Metasploitable 2 due to key exchange mismatch with modern Kali. Use Medusa or Ncrack instead.
- **vsftpd on Metasploitable 2**: No init script. Stop: `sudo pkill vsftpd`. Start: `sudo /usr/sbin/vsftpd /etc/vsftpd.conf &`

---

## VMware ESXi 7 Labs

- **Hosts**: LastName71 and LastName72 (student naming convention).
- **Removed features**: DRS, HA, vSAN, Lifecycle Manager are NOT covered. Do not include lab tasks for these.
- **Lab count**: 23 labs total.
- **Format**: Linear (not phase-nav).
- Each lab overview includes an info-box explaining: the concept, why it matters, real-world context.

---

## General IT Education
| Resource | URL | Status | Notes |
|----------|-----|--------|-------|
| Professor Messer Security+ | https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-training-course/ | VERIFIED | Free video course aligned to SY0-701. |
| CompTIA Exam Objectives | https://www.comptia.org/training/resources/exam-objectives | VERIFIED | Official exam objectives PDF. |
| Microsoft Learn | https://learn.microsoft.com | VERIFIED | Official Microsoft training for AZ-900 and AZ-104. |
| marczak.io AZ-900 Episodes | https://marczak.io/az-900/ | VERIFIED | Source for all 39 mini-lecture episodes used in AZ-900 homework. |

---

## Before Adding Any New URL to a Lab
1. Open the URL and confirm it loads.
2. Confirm the site does exactly what the lab step describes (browse, upload, search, download, etc.).
3. Confirm the feature works without login if students will not have accounts.
4. Note any caveats in this file and in the relevant `courses/*.json` before publishing.
