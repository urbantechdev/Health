export interface UserIdentity {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  specialty?: string;
  specialistTitle?: string;
}

export function shouldShowPopupNotification(
  message: {
    senderId?: string;
    senderEmail?: string;
    targetType?: "all" | "department" | "role" | "individual" | "direct" | string;
    targetDepartment?: string;
    targetRole?: string;
    recipientId?: string;
    recipientEmail?: string;
    department?: string;
    priority?: string;
    [key: string]: any;
  },
  user: UserIdentity
): boolean {
  if (!message || !user) return false;

  // Don't notify the sender of their own message
  if (
    (user.id && message.senderId === user.id) ||
    (user.email && message.senderEmail?.toLowerCase() === user.email?.toLowerCase())
  ) {
    return false;
  }

  // Broadcast to all
  if (message.targetType === "all" || (!message.targetType && !message.recipientId && !message.recipientEmail && !message.targetDepartment && !message.targetRole)) {
    return true;
  }

  // Direct recipient match
  if (
    (user.id && message.recipientId === user.id) ||
    (user.email && message.recipientEmail?.toLowerCase() === user.email?.toLowerCase())
  ) {
    return true;
  }

  // Target Department match
  const userDept = (user.department || "").toLowerCase().trim();
  const targetDept = (message.targetDepartment || message.department || "").toLowerCase().trim();
  if (targetDept && targetDept === userDept) {
    return true;
  }

  // Target Role match
  const userRole = (user.role || "").toLowerCase().trim();
  const targetRole = (message.targetRole || "").toLowerCase().trim();
  if (targetRole && (targetRole === userRole || userRole.includes(targetRole) || targetRole.includes(userRole))) {
    return true;
  }

  return false;
}
