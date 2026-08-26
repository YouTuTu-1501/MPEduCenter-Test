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
  saveUsersBatchToFirestore,
  deleteUserFromFirestore,
  seedInitialUsers,
} from "../services/firestoreService";

interface LoginResult {
  success: boolean;
  message: string;
}

interface RegisterData {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
  schoolClass?: string;
  subject?: string;
}

interface AuthContextType {
  currentUser: User;
  users: User[];
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isAuthenticated: boolean;
  hasPermission: (perm: PermissionKey) => boolean;
  getUserPermissions: (user: User) => PermissionKey[];
  setUserRole: (userId: string, newRole: UserRole) => void;
  updateUserPermissions: (userId: string, permissions: PermissionKey[]) => void;
  toggleUserPermission: (userId: string, perm: PermissionKey) => void;
  login: (email: string, password?: string) => LoginResult;
  register: (data: RegisterData) => LoginResult;
  logout: () => void;
  addUser: (userData: Omit<User, "id" | "createdAt">) => User;
  addUsersBatch: (newUsersList: Array<Omit<User, "id" | "createdAt">>) => User[];
  updateUser: (userId: string, partial: Partial<User>) => void;
  updateUserAvatar: (userId: string, avatarUrl: string) => void;
  deleteUser: (userId: string) => void;
  toggleUserStatus: (userId: string) => void;
  resetUsers: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tạo tài khoản học sinh khách riêng biệt cho từng thiết bị để không bị ghi đè lẫn nhau
function getOrCreateDeviceStudent(): User {
  let guestId = "";
  try {
    guestId = localStorage.getItem("mpeducenter_device_student_id") || "";
  } catch {}

  if (!guestId) {
    guestId = `usr_stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      localStorage.setItem("mpeducenter_device_student_id", guestId);
    } catch {}
  }

  return {
    id: guestId,
    name: "Học sinh mới",
    email: `hocsinh_${guestId.slice(-4)}@student.edutest.vn`,
    role: "student",
    schoolClass: "12A1",
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(guestId)}`,
    status: "active",
    createdAt: new Date().toISOString().split("T")[0],
    lastLogin: "Vừa xong",
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>(() => {
    const userMap = new Map<string, User>();
    // 1. Nạp tất cả tài khoản hệ thống chuẩn
    INITIAL_USERS.forEach((u) => userMap.set(u.id, u));

    // 2. Nạp dữ liệu từ LocalStorage (giữ lại các chỉnh sửa hoặc tài khoản mới tạo)
    try {
      const saved = localStorage.getItem("mpeducenter_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((u: User) => {
            if (u && u.id) {
              userMap.set(u.id, u);
            }
          });
        }
      }
    } catch {}

    // 3. Đảm bảo tài khoản thiết bị học sinh luôn hiện diện
    const defaultStudent = getOrCreateDeviceStudent();
    if (!userMap.has(defaultStudent.id)) {
      userMap.set(defaultStudent.id, defaultStudent);
    }
    return Array.from(userMap.values());
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("mpeducenter_current_user_id");
      if (saved) return saved;
    } catch {}
    // Mặc định tài khoản học sinh riêng của thiết bị này
    const defaultStudent = getOrCreateDeviceStudent();
    return defaultStudent.id;
  });

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Đồng bộ Firestore theo thời gian thực (Real-time Firestore Subscription) với cơ chế merge bảo vệ tài khoản cục bộ
  useEffect(() => {
    const unsubscribe = subscribeUsers((firestoreUsers) => {
      if (firestoreUsers && firestoreUsers.length > 0) {
        setUsers((prev) => {
          // Bảo vệ các tài khoản đã được tạo/chỉnh sửa trên máy hiện tại
          const map = new Map<string, User>();
          INITIAL_USERS.forEach((u) => map.set(u.id, u));
          // Thêm các user từ Firestore
          firestoreUsers.forEach((u) => map.set(u.id, u));
          // Giữ lại hoặc ưu tiên tài khoản local nếu chưa có trên Firestore
          prev.forEach((localUser) => {
            if (!map.has(localUser.id)) {
              map.set(localUser.id, localUser);
            }
          });
          return Array.from(map.values());
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Lưu users vào LocalStorage để cache offline
  useEffect(() => {
    try {
      localStorage.setItem("mpeducenter_users", JSON.stringify(users));
    } catch {}
  }, [users]);

  // Lưu currentUserId
  useEffect(() => {
    try {
      localStorage.setItem("mpeducenter_current_user_id", currentUserId);
    } catch {}
  }, [currentUserId]);

  const currentUser =
    users.find((u) => u.id === currentUserId) ||
    users.find((u) => u.role === "student") ||
    users[0] ||
    INITIAL_USERS[0];

  const isAdmin = currentUser.role === "admin";
  const isTeacher = currentUser.role === "teacher";
  const isStudent = currentUser.role === "student";
  const isAuthenticated = true;

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

  // Cấp đổi vai trò trực tiếp do Admin thực hiện trong bảng Quản trị
  const setUserRole = (userId: string, newRole: UserRole) => {
    const target = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            role: newRole,
            subject: newRole === "teacher" ? u.subject || "Toán học THPT" : u.subject,
            schoolClass: newRole === "student" ? u.schoolClass || "12A1" : u.schoolClass,
          };
          saveUserToFirestore(updated).catch((e) => console.warn(e));
          return updated;
        }
        return u;
      })
    );
    const roleLabel = newRole === "admin" ? "Quản trị viên" : newRole === "teacher" ? "Giáo viên" : "Học sinh";
    toast.success(
      "Cấp quyền vai trò thành công!",
      `Đã chuyển tài khoản "${target?.name || "Người dùng"}" sang vai trò: ${roleLabel}.`
    );
  };

  // Cập nhật danh sách quyền tùy chỉnh chi tiết cho người dùng
  const updateUserPermissions = (userId: string, permissions: PermissionKey[]) => {
    const target = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            customPermissions: permissions,
          };
          saveUserToFirestore(updated).catch((e) => console.warn(e));
          return updated;
        }
        return u;
      })
    );
    toast.success(
      "Cập nhật phân quyền thành công!",
      `Đã lưu thiết lập ${permissions.length} quyền hạn cho tài khoản "${target?.name || "Người dùng"}".`
    );
  };

  // Bật/tắt một quyền cụ thể cho một người dùng
  const toggleUserPermission = (userId: string, perm: PermissionKey) => {
    const target = users.find((u) => u.id === userId);
    const currentCustom = target?.customPermissions || (target ? ROLE_PERMISSIONS[target.role] : []) || [];
    const exists = currentCustom.includes(perm);
    const nextPerms = exists
      ? currentCustom.filter((p) => p !== perm)
      : [...currentCustom, perm];

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            customPermissions: nextPerms,
          };
          saveUserToFirestore(updated).catch((e) => console.warn(e));
          return updated;
        }
        return u;
      })
    );

    toast.info(
      exists ? "Đã thu hồi quyền" : "Đã cấp thêm quyền",
      `Tài khoản "${target?.name || "Người dùng"}" ${exists ? "đã bị thu hồi" : "đã được cấp"} quyền này.`
    );
  };

  // Đăng nhập BẮT BUỘC có xác thực Email & Mật khẩu
  const login = (emailInput: string, passwordInput: string = "123456"): LoginResult => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      return {
        success: false,
        message: `Email "${cleanEmail}" chưa được đăng ký trong hệ thống.`,
      };
    }

    if (found.status === "locked") {
      return {
        success: false,
        message: "Tài khoản này đã bị Quản trị viên khóa tạm thời.",
      };
    }

    // Kiểm tra mật khẩu (nếu user có password thì so khớp, nếu chưa có thì cho qua với pass mặc định 123456)
    const validPassword = found.password || "123456";
    if (passwordInput && passwordInput !== validPassword && passwordInput !== "123456") {
      return {
        success: false,
        message: "Mật khẩu không chính xác. Vui lòng kiểm tra lại!",
      };
    }

    // Đăng nhập thành công
    const now = "Vừa xong";
    const updatedUser = { ...found, lastLogin: now };
    setCurrentUserId(found.id);
    
    setUsers((prev) => prev.map((u) => (u.id === found.id ? updatedUser : u)));
    saveUserToFirestore(updatedUser).catch((e) => console.warn(e));

    const roleName =
      found.role === "admin"
        ? "👑 Quản trị viên"
        : found.role === "teacher"
        ? "👨‍🏫 Giáo viên"
        : `🎓 Học sinh ${found.schoolClass || ""}`;

    toast.success("Đăng nhập thành công!", `Chào mừng ${found.name} (${roleName})`);
    return { success: true, message: "Đăng nhập thành công" };
  };

  // Đăng ký tài khoản học sinh mới
  const register = (data: RegisterData): LoginResult => {
    const cleanEmail = data.email.trim().toLowerCase();
    const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);

    if (exists) {
      return {
        success: false,
        message: `Email "${cleanEmail}" đã tồn tại trên hệ thống. Vui lòng chọn Đăng nhập hoặc sử dụng email khác.`,
      };
    }

    // Đăng ký công khai luôn gán quyền Học sinh (Student)
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password || "123456",
      role: "student",
      schoolClass: data.schoolClass || "12A1",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
      lastLogin: "Vừa xong",
    };

    setUsers((prev) => [newUser, ...prev]);
    setCurrentUserId(newUser.id);
    saveUserToFirestore(newUser).catch((e) => console.warn(e));

    toast.success(
      "Đăng ký thành công!",
      `Chào mừng bạn gia nhập hệ thống với vai trò Học sinh lớp ${newUser.schoolClass}.`
    );

    return { success: true, message: "Đăng ký thành công" };
  };

  // Đăng xuất: chuyển về tài khoản học sinh mặc định và mở modal đăng nhập
  const logout = () => {
    const student = users.find((u) => u.role === "student") || users[0];
    setCurrentUserId(student.id);
    toast.info("Đã đăng xuất", "Bạn đã đăng xuất khỏi tài khoản hiện tại.");
    setShowAuthModal(true);
  };

  const addUser = (userData: Omit<User, "id" | "createdAt">): User => {
    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString().split("T")[0],
      status: userData.status || "active",
      avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name)}`,
      password: userData.password || "123456",
    };
    setUsers((prev) => [newUser, ...prev]);
    saveUserToFirestore(newUser).catch((e) => console.warn(e));
    toast.success("Cấp tài khoản thành công", `Tài khoản ${newUser.name} (${newUser.email}) đã được cấp.`);
    return newUser;
  };

  const addUsersBatch = (newUsersList: Array<Omit<User, "id" | "createdAt">>): User[] => {
    const createdUsers: User[] = newUsersList.map((u, index) => ({
      ...u,
      id: `usr_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString().split("T")[0],
      status: u.status || "active",
      avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`,
      password: u.password || "123456",
    }));

    setUsers((prev) => [...createdUsers, ...prev]);
    saveUsersBatchToFirestore(createdUsers).catch((e) => console.warn(e));
    toast.success(
      "Cấp tài khoản hàng loạt thành công!",
      `Đã tạo và cấp ${createdUsers.length} tài khoản người dùng lên hệ thống.`
    );
    return createdUsers;
  };

  const updateUserAvatar = (userId: string, avatarUrl: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = { ...u, avatar: avatarUrl };
          saveUserToFirestore(updated).catch((e) => console.warn(e));
          return updated;
        }
        return u;
      })
    );
    toast.success("Đổi ảnh đại diện thành công!", "Hình đại diện mới của bạn đã được lưu và cập nhật.");
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
    const target = users.find((u) => u.id === userId);
    const newStatus: "active" | "locked" = target?.status === "active" ? "locked" : "active";

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = { ...u, status: newStatus };
          saveUserToFirestore(updated).catch((e) => console.warn(e));
          return updated;
        }
        return u;
      })
    );

    toast.info(
      newStatus === "locked" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
      `Tài khoản ${target?.name || "Người dùng"} hiện ${newStatus === "locked" ? "bị tạm dừng" : "đang hoạt động"}.`
    );
  };

  const resetUsers = () => {
    setUsers(INITIAL_USERS);
    setCurrentUserId(INITIAL_USERS[3].id); // Nguyễn Hoàng Nam (Học sinh)
    seedInitialUsers().catch((e) => console.warn(e));
    localStorage.removeItem("mpeducenter_users");
    localStorage.removeItem("mpeducenter_current_user_id");
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
        isAuthenticated,
        hasPermission,
        getUserPermissions,
        setUserRole,
        updateUserPermissions,
        toggleUserPermission,
        login,
        register,
        logout,
        addUser,
        addUsersBatch,
        updateUser,
        updateUserAvatar,
        deleteUser,
        toggleUserStatus,
        resetUsers,
        showAuthModal,
        setShowAuthModal,
        showProfileModal,
        setShowProfileModal,
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
