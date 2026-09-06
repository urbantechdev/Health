import { InternalMessage } from "../types";

export interface UserIdentity {
  id?: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  specialty?: string;
  specialistTitle?: string;
}

/**
 * Normalizes a doctor/nurse/staff member's name by stripping honorifics and non-alphanumeric chars.
 */
export function normalizeName(name?: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/^(dr\.|dr|doctor|nurse|mr\.|mr|mrs\.|mrs|ms\.|ms|pharm\.|pharm|co\.|clinical officer)\s+/i, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Robustly matches two user/staff names, taking into account honorifics, titles, and full name variations.
 */
export function namesMatch(name1?: string, name2?: string): boolean {
  if (!name1 || !name2) return false;
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  const parts1 = n1.split(" ").filter((p) => p.length > 2);
  const parts2 = n2.split(" ").filter((p) => p.length > 2);

  // If both have first and last names, check for two matching tokens
  if (parts1.length >= 2 && parts2.length >= 2) {
    const common = parts1.filter((p) => parts2.includes(p));
    if (common.length >= 2) return true;
  }

  // Check substring match for names with sufficient length
  if (n1.length > 5 && n2.length > 5 && (n1.includes(n2) || n2.includes(n1))) {
    return true;
  }

  return false;
}

/**
 * Checks if a user's role or department matches a target role.
 * Strictly prevents Super Admin from receiving notifications meant for specific clinical roles.
 */
export function doesUserMatchTargetRole(
  targetRoleRaw?: string,
  userRoleRaw?: string,
  userDeptRaw?: string
): boolean {
  if (!targetRoleRaw) return false;
  const target = targetRoleRaw.toLowerCase().trim();
  const role = (userRoleRaw || "").toLowerCase().trim();
  const dept = (userDeptRaw || "").toLowerCase().trim();

  if (target === "all") return false;

  // Direct exact match
  if (role === target || dept === target) return true;

  // Medical / Doctor
  if (
    target.includes("doctor") ||
    target.includes("physician") ||
    target.includes("consultant") ||
    target.includes("medical officer") ||
    target.includes("specialist")
  ) {
    return (
      role.includes("doctor") ||
      role.includes("physician") ||
      role.includes("consultant") ||
      role.includes("medical officer") ||
      dept.includes("medical") ||
      dept.includes("doctor")
    );
  }

  // Pharmacy
  if (target.includes("pharmacy") || target.includes("pharmacist")) {
    return role.includes("pharm") || dept.includes("pharm");
  }

  // Laboratory
  if (target.includes("lab") || target.includes("patholog")) {
    return role.includes("lab") || dept.includes("lab");
  }

  // Radiology / Imaging
  if (
    target.includes("radiolog") ||
    target.includes("imaging") ||
    target.includes("x-ray") ||
    target.includes("ultrasound")
  ) {
    return role.includes("radio") || dept.includes("radio") || dept.includes("imaging");
  }

  // Nursing / Triage
  if (target.includes("nurse") || target.includes("triage")) {
    return (
      role.includes("nurse") ||
      role.includes("triage") ||
      dept.includes("nurse") ||
      dept.includes("triage")
    );
  }

  // Reception / Front Desk / Records
  if (target.includes("reception") || target.includes("front desk") || target.includes("records")) {
    return role.includes("recept") || role.includes("front") || dept.includes("reception");
  }

  // Billing / Accounts / Finance / Cashier
  if (
    target.includes("billing") ||
    target.includes("account") ||
    target.includes("cashier") ||
    target.includes("finance")
  ) {
    return (
      role.includes("bill") ||
      role.includes("account") ||
      role.includes("cashier") ||
      role.includes("finance") ||
      dept.includes("finance") ||
      dept.includes("billing")
    );
  }

  // Administration: ONLY matches if target explicitly requested admin
  if (target.includes("admin") || target.includes("management") || target.includes("director")) {
    return role.includes("admin");
  }

  return false;
}

/**
 * Checks if a user's role or department matches a target department.
 */
export function doesUserMatchTargetDepartment(
  targetDeptRaw?: string,
  userRoleRaw?: string,
  userDeptRaw?: string
): boolean {
  if (!targetDeptRaw) return false;
  const target = targetDeptRaw.toLowerCase().trim();
  const dept = (userDeptRaw || "").toLowerCase().trim();
  const role = (userRoleRaw || "").toLowerCase().trim();

  if (target === "all") return false;

  if (dept === target || role === target) return true;

  if (target.includes("pharm")) return dept.includes("pharm") || role.includes("pharm");
  if (target.includes("lab")) return dept.includes("lab") || role.includes("lab");
  if (target.includes("radio") || target.includes("imaging")) {
    return dept.includes("radio") || role.includes("radio");
  }
  if (target.includes("doc") || target.includes("medic") || target.includes("cardio") || target.includes("surg")) {
    return dept.includes("medic") || dept.includes("doc") || role.includes("doc");
  }
  if (
    target.includes("nurse") ||
    target.includes("triage") ||
    target.includes("inpatient") ||
    target.includes("icu") ||
    target.includes("maternity")
  ) {
    return dept.includes("nurse") || dept.includes("triage") || role.includes("nurse") || role.includes("triage");
  }
  if (target.includes("bill") || target.includes("finance") || target.includes("cashier")) {
    return dept.includes("finance") || dept.includes("bill") || role.includes("bill") || role.includes("cashier");
  }
  if (target.includes("recept")) return dept.includes("recept") || role.includes("recept");
  if (target.includes("admin")) return dept.includes("admin") || role.includes("admin");

  return false;
}

/**
 * Determines whether a popup notification banner should be displayed to the current user.
 * Strictly adheres to the rule: ONLY show popup notification to the specific person intended, NOT everyone.
 */
export function shouldShowPopupNotification(
  msg: InternalMessage,
  user: UserIdentity
): boolean {
  const myId = (user.id || "").toLowerCase().trim();
  const myEmail = (user.email || "").toLowerCase().trim();
  const myName = (user.name || "").toLowerCase().trim();
  const myRole = (user.role || "").toLowerCase().trim();
  const myDept = (user.department || "").toLowerCase().trim();
  const mySpecialty = (user.specialty || user.specialistTitle || "").toLowerCase().trim();

  // 1. NEVER show popup to the author/sender of the message
  const senderId = (msg.senderId || "").toLowerCase().trim();
  const senderName = (msg.senderName || "").toLowerCase().trim();
  const senderEmail = ((msg as any).senderEmail || "").toLowerCase().trim();
  if (
    (myId && senderId && myId === senderId) ||
    (myEmail && (senderEmail === myEmail || senderId === myEmail)) ||
    (myName && senderName && (myName === senderName || namesMatch(myName, senderName)))
  ) {
    return false;
  }

  // 2. NEVER show popup if already read by current user
  const readBy = Array.isArray(msg.readBy)
    ? msg.readBy.map((r) => String(r).toLowerCase().trim())
    : [];
  if (
    (myEmail && readBy.includes(myEmail)) ||
    (myId && readBy.includes(myId)) ||
    (myName && readBy.includes(myName))
  ) {
    return false;
  }

  // 3. SPECIFIC PERSON TARGETING
  // If the message specifies an individual recipient (Direct message, target user ID/name/email,
  // or a specific doctor/specialist assigned on an attached ticket):
  const targetUserId = (msg.targetUserId || "").toLowerCase().trim();
  const targetUserName = msg.targetUserName?.trim();
  const targetUserEmail = (msg.targetUserEmail || "").toLowerCase().trim();
  const specialistId = (msg.ticketAttachment?.toSpecialistId || "").toLowerCase().trim();
  const specialistName = msg.ticketAttachment?.toSpecialistName?.trim();

  const isSpecificPersonTargeted =
    msg.targetType === "direct" ||
    Boolean(targetUserId) ||
    Boolean(targetUserName) ||
    Boolean(targetUserEmail) ||
    Boolean(specialistId) ||
    Boolean(specialistName);

  if (isSpecificPersonTargeted) {
    // ONLY the designated person gets the popup. Nobody else (no other colleagues, and NOT super admin).
    const matchesId = Boolean(
      myId &&
        ((targetUserId && myId === targetUserId) || (specialistId && myId === specialistId))
    );
    const matchesEmail = Boolean(
      myEmail &&
        ((targetUserEmail && myEmail === targetUserEmail) || (targetUserId && myEmail === targetUserId))
    );
    const matchesName = Boolean(
      (targetUserName && namesMatch(targetUserName, user.name)) ||
      (specialistName &&
        (namesMatch(specialistName, user.name) ||
          (mySpecialty && specialistName.toLowerCase().includes(mySpecialty))))
    );

    return matchesId || matchesEmail || matchesName;
  }

  // 4. ROLE TARGETING (No specific individual specified)
  if (msg.targetType === "role" || msg.targetRole) {
    const targetRole = msg.targetRole || "";
    // If targetRole is "all", it's a general broadcast: DO NOT popup unless emergency
    if (targetRole.toLowerCase().trim() === "all") {
      return msg.priority === "stat_emergency";
    }
    return doesUserMatchTargetRole(targetRole, myRole, myDept);
  }

  // 5. DEPARTMENT TARGETING
  if (msg.targetType === "department" || msg.targetDepartment) {
    const targetDept = msg.targetDepartment || msg.channelId || "";
    if (targetDept.toLowerCase().trim() === "all") {
      return msg.priority === "stat_emergency";
    }
    return doesUserMatchTargetDepartment(targetDept, myRole, myDept);
  }

  // 6. BROADCAST / ALL CHANNEL
  if (msg.targetType === "all" || msg.channelId === "all") {
    // Normal / standard messages sent to "all" do NOT popup on everyone's screen.
    // ONLY true STAT Code Red life-safety emergencies broadcast a screen popup.
    return msg.priority === "stat_emergency";
  }

  return false;
}
