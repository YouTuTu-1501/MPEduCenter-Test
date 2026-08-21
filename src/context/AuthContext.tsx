import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  User,
  UserRole,
  PermissionKey,
  INITIAL_USERS,
  ROLE_PERMISSIONS,
} from "../types/auth";
import { useToast } from "./ToastContext";
import {
  subscribeUsers,
  saveUserToFirestore,
  deleteUserFromFirestore,
  seedInitialUsers,
} from "../services/firestoreService";

interface AuthContextType {
  currentUser: User;
  users: User[];
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  hasPermission: (perm: PermissionKey) => boolean;
  getUserPermissions: (user: User) => PermissionKey[];
  setUserRole: (userId: string, newRole: UserRole) => void;
  updateUserPermissions: (userId: string, permissions: PermissionKey[]) => void;
  toggleUserPermission: (userId: string, perm: PermissionKey) => void;
  switchRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  login: (email: string) => boolean;
  logout: () => void;
  addUser: (userData: Omit<User, "id" | "createdAt">) => void;
  updateUser: (userId: string, partial: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  toggleUserStatus: (userId: string) => void;
  resetUsers: () => void;
  showRoleModal: boolean;
  setShowRoleModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem("edutest_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("edutest_current_user_id");
      if (saved) return saved;
    } catch {}
    // Mặc định khởi tạo tài khoản Giáo viên hoặc Admin để dễ trải nghiệm
    return INITIAL_USERS[1].id; // ThS. Trần Văn Toán
  });

  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  // Đồng bộ Firestore theo thời gian thực (Real-time Firestore Subscription)
  useEffect(() => {
    const unsubscribe = subscribeUsers((firestoreUsers) => {
      if (firestoreUsers && firestoreUsers.length > 0) {
        setUsers(firestoreUsers);
      }
    });
    return () => unsubscribe();
  }, []);

  // Lưu users vào LocalStorage để cache offline
  useEffect(() => {
    try {
      localStorage.setItem("edutest_users", JSON.stringify(users));
    } catch {}
  }, [users]);

  // Lưu currentUserId
  useEffect(() => {
    try {
      localStorage.setItem("edutest_current_user_id", currentUserId);
    } catch {}
  }, [currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || INITIAL_USERS[0];

  const isAdmin = currentUser.role === "admin";
  const isTeacher = currentUser.role === "teacher";
  const isStudent = currentUser.role === "student";

  const getUserPermissions = (user: User): PermissionKey[] => {
    const defaultPerms = ROLE_PERMISSIONS[user.role] || [];
    if (user.customPermissions && Array.isArray(user.customPermissions)) {
      return Array.from(new Set([...defaultPerms, ...user.customPermissions]));
    }
    return defaultPerms;
  };

  const hasPermission = (perm: PermissionKey): boolean => {
    const perms = getUserPermissions(currentUser);
    return perms.includes(perm);
  };

  // Cấp đổi vai trò trực tiếp (Admin -> Teacher, Teacher -> Student, Student -> Teacher, etc.)
  const setUserRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const roleLabel = newRole === "admin" ? "Quản trị viên" : newRole === "teacher" ? "Giáo viên" : "Học sinh";
          toast.success(
            "Cấp quyền vai trò thành công!",
            `Đã chuyển tài khoản "${u.name}" sang vai trò: ${roleLabel}.`
          );
          return {
            ...u,
            role: newRole,
            // Nếu chuyển sang giáo viên mà chưa có môn, gán mặc định
            subject: newRole === "teacher" ? u.subject || "Toán học THPT" : u.subject,
            // Nếu chuyển sang học sinh mà chưa có lớp, gán mặc định
            schoolClass: newRole === "student" ? u.schoolClass || "12A1" : u.schoolClass,
          };
        }
        return u;
      })
    );
  };

  // Cập nhật danh sách quyền tùy chỉnh chi tiết cho người dùng
  const updateUserPermissions = (userId: string, permissions: PermissionKey[]) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          toast.success(
            "Cập nhật phân quyền thành công!",
            `Đã lưu thiết lập ${permissions.length} quyền hạn cho tài khoản "${u.name}".`
          );
          return {
            ...u,
            customPermissions: permissions,
          };
        }
        return u;
      })
    );
  };

  // Bật/tắt một quyền cụ thể cho một người dùng
  const toggleUserPermission = (userId: string, perm: PermissionKey) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const currentCustom = u.customPermissions || ROLE_PERMISSIONS[u.role] || [];
          const exists = currentCustom.includes(perm);
          const nextPerms = exists
            ? currentCustom.filter((p) => p !== perm)
            : [...currentCustom, perm];
          
          toast.info(
            exists ? "Đã thu hồi quyền" : "Đã cấp thêm quyền",
            `Tài khoản "${u.name}" ${exists ? "đã bị thu hồi" : "đã được cấp"} quyền này.`
          );

          return {
            ...u,
            customPermissions: nextPerms,
          };
        }
        return u;
      })
    );
  };

  // Đổi vai trò nhanh
  const switchRole = (targetRole: UserRole) => {
    const targetUser = users.find((u) => u.role === targetRole && u.status === "active") || users.find((u) => u.role === targetRole);
    if (targetUser) {
      setCurrentUserId(targetUser.id);
      toast.info(
        "Đã chuyển đổi vai trò",
        `Đang xem với tư cách: ${targetUser.name} (${targetRole === "admin" ? "Quản trị viên" : targetRole === "teacher" ? "Giáo viên" : "Học sinh"})`
      );
    }
  };

  // Đổi sang một người dùng cụ thể
  const switchUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      if (user.status === "locked") {
        toast.error("Tài khoản đang bị khóa", "Vui lòng liên hệ Quản trị viên để được mở khóa.");
        return;
      }
      setCurrentUserId(userId);
      toast.success(
        "Đăng nhập thành công",
        `Xin chào ${user.name} (${user.role === "admin" ? "Quản trị viên" : user.role === "teacher" ? "Giáo viên" : `Học sinh ${user.schoolClass || ""}`})`
      );
    }
  };

  const login = (email: string): boolean => {
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      if (found.status === "locked") {
        toast.error("Tài khoản đang bị khóa", "Tài khoản này đã bị Quản trị viên tạm khóa.");
        return false;
      }
      setCurrentUserId(found.id);
      toast.success("Đăng nhập thành công", `Chào mừng ${found.name} trở lại hệ thống!`);
      return true;
    }
    toast.error("Không tìm thấy tài khoản", `Email ${email} chưa được đăng ký trong hệ thống.`);
    return false;
  };

  const logout = () => {
    // Chuyển về học sinh mặc định hoặc mở modal đăng nhập
    const student = users.find((u) => u.role === "student") || users[0];
    setCurrentUserId(student.id);
    toast.info("Đã đăng xuất", "Đã quay trở lại chế độ học sinh.");
  };

  const addUser = (userData: Omit<User, "id" | "createdAt">) => {
    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
      status: userData.status || "active",
      avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name)}`,
    };
    setUsers((prev) => [newUser, ...prev]);
    saveUserToFirestore(newUser).catch((e) => console.warn(e));
    toast.success("Thêm người dùng thành công", `Tài khoản ${newUser.name} (${newUser.email}) đã được tạo.`);
  };

  const updateUser = (userId: string, partial: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, ...partial };
          saveUserToFirestore(updated).catch((e) => console.warn(e));
          return updated;
        }
        return u;
      })
    );
    toast.success("Cập nhật thành công", "Thông tin tài khoản đã được lưu.");
  };

  const deleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      toast.error("Không thể xóa", "Bạn không thể tự xóa tài khoản đang đăng nhập hiện tại.");
      return;
    }
    const target = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    deleteUserFromFirestore(userId).catch((e) => console.warn(e));
    toast.info("Đã xóa tài khoản", target ? `Đã xóa người dùng ${target.name}.` : undefined);
  };

  const toggleUserStatus = (userId: string) => {
    if (userId === currentUser.id) {
      toast.error("Không thể khóa", "Bạn không thể tự khóa tài khoản của chính mình.");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus: "active" | "locked" = u.status === "active" ? "locked" : "active";
          const updated: User = { ...u, status: newStatus };
          saveUserToFirestore(updated).catch((e) => console.warn(e));
          toast.info(
            newStatus === "locked" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
            `Tài khoản ${u.name} hiện ${newStatus === "locked" ? "bị tạm dừng" : "đang hoạt động"}.`
          );
          return updated;
        }
        return u;
      })
    );
  };

  const resetUsers = () => {
    setUsers(INITIAL_USERS);
    setCurrentUserId(INITIAL_USERS[1].id);
    seedInitialUsers().catch((e) => console.warn(e));
    localStorage.removeItem("edutest_users");
    localStorage.removeItem("edutest_current_user_id");
    toast.success("Đã khôi phục dữ liệu gốc", "Danh sách tài khoản mẫu 3 cấp đã được thiết lập lại.");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAdmin,
        isTeacher,
        isStudent,
        hasPermission,
        getUserPermissions,
        setUserRole,
        updateUserPermissions,
        toggleUserPermission,
        switchRole,
        switchUser,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUsers,
        showRoleModal,
        setShowRoleModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
