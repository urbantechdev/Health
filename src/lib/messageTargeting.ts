export interface UserIdentity {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  specialty?: string;
  specialistTitle?: string;
  [key: string]: any;
}

export function shouldShowPopupNotification(msg: any, user: UserIdentity | null | undefined): boolean {
  if (!msg || !user) return false;

  // Never notify self of own outgoing messages
  if (user.id && msg.senderId && String(msg.senderId) === String(user.id)) {
    return false;
  }
  if (user.email && msg.senderEmail && msg.senderEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) {
    return false;
  }

  // Broadcast to all hospital staff
  if (msg.targetType === "all" || msg.recipientId === "all" || (!msg.targetType && !msg.recipientId && !msg.recipientRole)) {
    return true;
  }

  // Direct recipient by user ID or email
  if (msg.targetType === "user" || msg.targetType === "individual" || msg.recipientId) {
    if (user.id && msg.recipientId && String(msg.recipientId) === String(user.id)) return true;
    if (user.email && msg.recipientEmail && msg.recipientEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) return true;
    if (user.id && msg.targetUserId && String(msg.targetUserId) === String(user.id)) return true;
  }

  // Role targeted (e.g., all Nurses, Doctors, Pharmacists)
  if (msg.targetType === "role" || msg.targetRole || msg.recipientRole) {
    const roleTarget = (msg.targetRole || msg.recipientRole || "").toLowerCase().trim();
    if (user.role && user.role.toLowerCase().trim() === roleTarget) return true;
  }

  // Department targeted (e.g., Casualty, Maternity, Pharmacy)
  if (msg.targetType === "department" || msg.targetDepartment || msg.recipientDepartment) {
    const deptTarget = (msg.targetDepartment || msg.recipientDepartment || "").toLowerCase().trim();
    if (user.department && user.department.toLowerCase().trim() === deptTarget) return true;
  }

  return false;
}
