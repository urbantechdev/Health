import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Key, 
  Camera, 
  Upload, 
  Trash2, 
  Save, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Lock, 
  Building, 
  BadgeCheck, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Stethoscope,
  Briefcase,
  IdCard
} from "lucide-react";
import { Employee, SystemRole } from "../types";
import { SYSTEM_ROLES_DIRECTORY } from "../constants/roles";
import { doc, updateDoc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    email: string;
    displayName: string;
    photoURL?: string;
    isSimulated?: boolean;
  };
  employeeRecord?: Employee | null;
  isSuperAdmin: boolean;
  onUpdateUserProfile: (updatedData: {
    displayName: string;
    email: string;
    photoURL?: string;
    phone?: string;
    nationalId?: string;
    specialty?: string;
    systemRole?: SystemRole;
    department?: string;
  }) => void;
}

const AVATAR_PRESETS = [
  {
    name: "Dr. Female Executive",
    url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=160&auto=format&fit=crop&q=80",
    role: "Doctor / CMO"
  },
  {
    name: "Dr. Male Specialist",
    url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=160&auto=format&fit=crop&q=80",
    role: "Doctor / Surgeon"
  },
  {
    name: "Clinical Nurse Specialist",
    url: "https://images.unsplash.com/photo-1594824813576-965306637e6f?w=160&auto=format&fit=crop&q=80",
    role: "Nursing & Triage"
  },
  {
    name: "Pharmacist / Lab Technologist",
    url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=160&auto=format&fit=crop&q=80",
    role: "Diagnostics & Pharmacy"
  },
  {
    name: "Hospital Administrator",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80",
    role: "Admin & Operations"
  },
  {
    name: "Finance & Accounts Director",
    url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&auto=format&fit=crop&q=80",
    role: "Finance & Procurement"
  }
];

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  employeeRecord,
  isSuperAdmin,
  onUpdateUserProfile
}: UserProfileModalProps) {
  // Form State
  const [displayName, setDisplayName] = useState(currentUser.displayName || "");
  const [email, setEmail] = useState(currentUser.email || "");
  const [phone, setPhone] = useState(employeeRecord?.phone || "+254 712 345 678");
  const [nationalId, setNationalId] = useState(employeeRecord?.nationalId || "24189342");
  const [specialty, setSpecialty] = useState(employeeRecord?.specialty || "Consulting Physician & CMO");
  const [department, setDepartment] = useState(employeeRecord?.department || "administration");
  const [systemRole, setSystemRole] = useState<SystemRole>(
    (employeeRecord?.systemRole as SystemRole) || 
    (employeeRecord?.role as SystemRole) || 
    (isSuperAdmin ? "Super Admin" : "Reception")
  );

  // Profile Image State
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || employeeRecord?.photoURL || employeeRecord?.avatarUrl || "");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "credentials" | "security">("general");

  // Credentials / Security State
  const [pin, setPin] = useState(employeeRecord?.pin || "1234");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens with fresh user data
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.displayName || employeeRecord?.name || "");
      setEmail(currentUser.email || employeeRecord?.email || "");
      setPhone(employeeRecord?.phone || "+254 712 345 678");
      setNationalId(employeeRecord?.nationalId || "");
      setSpecialty(employeeRecord?.specialty || "");
      setDepartment(employeeRecord?.department || "administration");
      setSystemRole(
        (employeeRecord?.systemRole as SystemRole) || 
        (employeeRecord?.role as SystemRole) || 
        (isSuperAdmin ? "Super Admin" : "Reception")
      );
      setPhotoURL(currentUser.photoURL || employeeRecord?.photoURL || employeeRecord?.avatarUrl || "");
      setPin(employeeRecord?.pin || "1234");
      setNewPassword("");
      setConfirmPassword("");
      setFeedbackMessage(null);
    }
  }, [isOpen, currentUser, employeeRecord, isSuperAdmin]);

  if (!isOpen) return null;

  // Process File Upload for Photo
  const processImageFile = (file?: File) => {
    setFeedbackMessage(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedbackMessage({ type: "error", text: "Please upload a valid image file (PNG, JPG, WebP, GIF)." });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setFeedbackMessage({ type: "error", text: "Image is larger than 3MB. Please select a smaller photo." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPhotoURL(result);
        setFeedbackMessage({ type: "success", text: "Profile image loaded. Click 'Save Profile' to commit changes." });
      }
    };
    reader.onerror = () => {
      setFeedbackMessage({ type: "error", text: "Failed to read image file." });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processImageFile(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setFeedbackMessage({ type: "error", text: "Display name cannot be empty." });
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setFeedbackMessage({ type: "error", text: "Please provide a valid corporate email address." });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setFeedbackMessage({ type: "error", text: "New passwords do not match. Please verify and re-enter." });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update in Firestore employees collection
      let employeeDocId = employeeRecord?.id;

      if (!employeeDocId) {
        // Find employee by email in Firestore
        const empQuery = query(collection(db, "employees"), where("email", "==", currentUser.email.toLowerCase()));
        const snap = await getDocs(empQuery);
        if (!snap.empty) {
          employeeDocId = snap.docs[0].id;
        }
      }

      const updatePayload: Partial<Employee> = {
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        specialty: specialty.trim(),
        photoURL: photoURL.trim(),
        avatarUrl: photoURL.trim(),
        pin: pin.trim(),
        department: department,
        systemRole: systemRole,
        role: systemRole
      };

      if (newPassword) {
        updatePayload.password = newPassword;
      }

      if (employeeDocId) {
        await updateDoc(doc(db, "employees", employeeDocId), updatePayload);
      } else {
        // If it's a standalone super admin or new account, persist with setDoc
        const newRef = doc(collection(db, "employees"));
        await setDoc(newRef, {
          ...updatePayload,
          salary: employeeRecord?.salary || 380000,
          status: "active",
          hireDate: employeeRecord?.hireDate || new Date().toISOString().split("T")[0],
          accessLevel: isSuperAdmin ? "Super Admin" : "Standard Staff",
          createdAt: new Date().toISOString()
        });
      }

      // 2. Propagate updates to parent auth state in App.tsx
      onUpdateUserProfile({
        displayName: cleanName,
        email: cleanEmail,
        photoURL: photoURL.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        specialty: specialty.trim(),
        systemRole: systemRole,
        department: department
      });

      setFeedbackMessage({
        type: "success",
        text: "Account profile and credentials successfully updated and synchronized with Cloud Firestore!"
      });

      // Auto close after brief display
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Error saving user profile:", err);
      setFeedbackMessage({
        type: "error",
        text: `Failed to save changes: ${err.message || "Network error. Please try again."}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with Gradient Accent */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shrink-0">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/30 backdrop-blur-md">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black uppercase tracking-tight text-white">Account Profile & Security</h2>
                  {isSuperAdmin && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase tracking-wider">
                      Super Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">Manage your credentials, clinical title, and profile image</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 border-b border-white/10 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "general"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>General Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("credentials")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "credentials"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Profile Image & Avatar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "security"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Security & PIN</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Feedback message banner */}
          {feedbackMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-fade-in ${
                feedbackMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-rose-50 text-rose-900 border border-rose-200"
              }`}
            >
              {feedbackMessage.type === "success" ? (
                <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="flex-1 leading-relaxed">{feedbackMessage.text}</p>
            </div>
          )}

          {/* TAB 1: General Profile & Identity */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="relative group shrink-0">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt="Profile Avatar"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                      {displayName.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab("credentials")}
                    className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-full shadow-md transition-all cursor-pointer"
                    title="Change Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 truncate">{displayName || "Staff Member"}</h3>
                  <p className="text-xs text-slate-500 font-mono truncate">{email || "No email assigned"}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      {systemRole}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-semibold">
                      Dept: {department}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Full Name & Title</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Naisiae"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Login Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Corporate Login Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. urbaninteriorkenya@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number (Kenyan Format)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +254 712 345 678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* National ID / Staff ID */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>National ID / Staff Reg ID</span>
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. 24189342"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Clinical Specialty / Cadre */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                    <span>Specialty / Professional Title</span>
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Consulting Physician & CMO"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* System Role */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>System Role & RBAC Access</span>
                  </label>
                  {isSuperAdmin ? (
                    <select
                      value={systemRole}
                      onChange={(e) => setSystemRole(e.target.value as SystemRole)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-emerald-500 focus:bg-white transition-all cursor-pointer"
                    >
                      {SYSTEM_ROLES_DIRECTORY.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.role} ({r.department})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>{systemRole}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Assigned by Admin</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Profile Image & Avatar Customization */}
          {activeTab === "credentials" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="relative group shrink-0">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt="Avatar Preview"
                      className="w-24 h-24 rounded-3xl object-cover border-4 border-emerald-500 shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-slate-800 text-white flex items-center justify-center font-black text-3xl shadow-xl">
                      {displayName.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}

                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => setPhotoURL("")}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg transition-all cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <h4 className="text-sm font-bold text-slate-900">Live Profile Image Preview</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload a high-resolution portrait or choose from verified executive medical avatars. Your photo will appear in patient consultation notes, prescription signatures, and the top navigation bar.
                  </p>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50/60"
                    : "border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                />
                <div className="p-3 bg-white text-emerald-600 rounded-2xl shadow-sm border border-slate-200">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drag and drop image here
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Supports PNG, JPG, WebP, GIF (Max size: 3MB)
                  </p>
                </div>
              </div>

              {/* Direct Image URL Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Or Paste External Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://example.com/my-photo.jpg"
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-emerald-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customImageUrl.trim()) {
                        setPhotoURL(customImageUrl.trim());
                        setCustomImageUrl("");
                        setFeedbackMessage({ type: "success", text: "External image URL applied to preview!" });
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    Apply URL
                  </button>
                </div>
              </div>

              {/* Curated Preset Avatars Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Choose from Clinical Avatars</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">1-Click Selection</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPhotoURL(preset.url);
                        setFeedbackMessage({ type: "success", text: `Selected avatar: ${preset.name}` });
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        photoURL === preset.url
                          ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate leading-tight">{preset.name}</p>
                        <span className="text-[9px] text-slate-500 truncate block mt-0.5">{preset.role}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Login Security, Password & Terminal PIN */}
          {activeTab === "security" && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <span>Enterprise Security & Multi-Factor Access</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Your credentials protect clinical EHR patient data, pharmaceutical dispensing records, and financial invoices. Keep your password and quick-authorization PIN secure.
                </p>
              </div>

              {/* 4-6 Digit Quick Authorization PIN */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Terminal Quick Authorization PIN</h4>
                      <p className="text-[10px] text-slate-500">Used for fast clinical signatures, pharmacy dispense bypass, and split billing approvals</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="max-w-xs">
                  <input
                    type={showPin ? "text" : "password"}
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 4 to 6 digits"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-slate-900 focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Password Change Fields */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-700" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Change Portal Password</h4>
                      <p className="text-[10px] text-slate-500">Leave blank if you do not wish to change your current login password</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">New Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Confirm New Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Active Session Info Box */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Active Login Method:</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    {currentUser.isSimulated ? "Enterprise Staff SSO / Master Auth" : "Google Cloud Workspace"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">System Role Level:</span>
                  <span className="font-mono text-slate-900 font-bold">{systemRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Data Encryption:</span>
                  <span className="text-slate-900">256-bit TLS / Firestore Rules Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                isSaving
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-500/20"
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving & Synchronizing...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
