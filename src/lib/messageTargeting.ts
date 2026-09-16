import { InternalMessage, SystemRole } from "../types";

export interface UserIdentity {
  id?: string;
  name?: string;
  email?: string;
  role?: SystemRole | string;
  specialty?: string;
  department?: string;
  [key: string]: any;
}

export function isMessageTargetedToUser(message: InternalMessage | any, user: UserIdentity): boolean {
  if (!message || !user) return false;

  // If user is sender, do not notify self
  const senderId = message.senderId || message.senderEmail;
  const userId = user.id || user.email;
  if (senderId && userId && senderId === userId) return false;
  if (message.senderName && user.name && message.senderName.trim().toLowerCase() === user.name.trim().toLowerCase()) return false;

  // Broadcast to all
  if (!message.targetRole && !message.targetSpecialist && !message.targetUserId) {
    return true;
  }

  // Direct user target
  if (message.targetUserId && user.id && message.targetUserId === user.id) {
    return true;
  }
  if (message.targetEmail && user.email && message.targetEmail.toLowerCase() === user.email.toLowerCase()) {
    return true;
  }

  // Role match
  const userRole = (user.role || "").toLowerCase();
  const targetRole = (message.targetRole || "").toLowerCase();
  const roleMatch = !targetRole || targetRole === "all" || targetRole === userRole;

  // Specialist / Name match
  if (message.targetSpecialist) {
    const targetSpec = message.targetSpecialist.toLowerCase().trim();
    const userName = (user.name || "").toLowerCase().trim();
    if (userName.includes(targetSpec) || targetSpec.includes(userName)) {
      return true;
    }
    return false;
  }

  return roleMatch;
}

export function shouldShowPopupNotification(message: InternalMessage | any, user: UserIdentity): boolean {
  if (!isMessageTargetedToUser(message, user)) return false;

  // If already read by user
  const identifier = user.email || user.id || user.name;
  if (identifier && Array.isArray(message.readBy) && message.readBy.includes(identifier)) {
    return false;
  }

  return true;
}

export function getMessageAudienceDisplay(message: InternalMessage | any): string {
  if (!message) return "Everyone";
  if (message.targetSpecialist) return `Dr. ${message.targetSpecialist}`;
  if (message.targetRole && message.targetRole !== "all") return `${message.targetRole} Department`;
  return "All Staff";
}
