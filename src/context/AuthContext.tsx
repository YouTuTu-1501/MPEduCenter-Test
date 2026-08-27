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
  getDeletedUserIds,
  addDeletedUserId,
  syncUserToSubmissions,
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

interface AuthSessionData {
  userId: string;
  email?: string;
  remember: boolean;
  loginAt: number;
}

const AUTH_SESSION_KEY = "mpeducenter_auth_session";

interface AuthContextType {
  currentUser: User | null;
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
  login: (emailOrUsername: string, password?: string, rememberMe?: boolean) => LoginResult;
  loginAsDemo: (demoRole: "admin" | "teacher" | "student", rememberMe?: boolean) => LoginResult;
  register: (data: RegisterData, rememberMe?: boolean) => LoginResult;
  logout: () => void;
  addUser: (userData: Omit<User, "id" | "createdAt">) => User;
  addUsersBatch: (newUsersList: Array<Omit<User, "id" | "createdAt">>) => User[];
  updateUser: (userId: string, partial: Partial<User>) => void;
  updateUserAvatar: (userId: string, avatarUrl: string) => void;
  deleteUser: (userId: string) => void;
  deleteUsersBatch: (userIds: string[]) => void;
  toggleUserStatus: (userId: string) => void;
  resetUsers: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Lấy thông tin session đã lưu từ localStorage hoặc sessionStorage
function getSavedSession(): AuthSessionData | null {
  try {
    // 1. Kiểm tra localStorage (đã chọn Ghi nhớ đăng nhập)
    const localSaved = localStorage.getItem(AUTH_SESSION_KEY);
    if (localSaved) {
      const parsed = JSON.parse(localSaved);
      if (parsed && parsed.userId) return parsed;
    }

    // 2. Kiểm tra sessionStorage (chỉ lưu phiên hiện tại)
    const sessionSaved = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (sessionSaved) {
      const parsed = JSON.parse(sessionSaved);
      if (parsed && parsed.userId) return parsed;
    }
  } catch (e) {
    console.warn("Lỗi đọc auth session:", e);
  }
  return null;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>(() => {
    const deletedUserIds = getDeletedUserIds();
    
    // 1. Nạp từ LocalStorage nếu có
    try {
      const saved = localStorage.getItem("mpeducenter_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validUsers = parsed.filter((u: User) => u && u.id && !deletedUserIds.has(u.id));
          if (validUsers.length > 0) {
            return validUsers;
          }
        }
      }
    } catch {}

    // 2. Nếu hoàn toàn chưa có dữ liệu lưu trước đó, chỉ dùng tài khoản quản trị mặc định
    return INITIAL_USERS.filter((u) => !deletedUserIds.has(u.id));
  });

  // State User ID đăng nhập hiện tại - chỉ lấy từ Session đã lưu, KHÔNG tự động fallback vào bất kỳ ai
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const session = getSavedSession();
    return session ? session.userId : null;
  });

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Đồng bộ Firestore theo thời gian thực
  useEffect(() => {
    const unsubscribe = subscribeUsers((firestoreUsers) => {
      if (firestoreUsers) {
        const deletedUserIds = getDeletedUserIds();
        let validUsers = firestoreUsers.filter(
          (u) => u && u.id && !deletedUserIds.has(u.id)
        );

        // Đảm bảo tài khoản Quản trị viên youtu1501@gmail.com luôn hiện diện
        const adminExists = validUsers.some(
          (u) => u.email.toLowerCase() === "youtu1501@gmail.com" || u.role === "admin"
        );
        if (!adminExists) {
          const rootAdmin = INITIAL_USERS[0];
          validUsers = [rootAdmin, ...validUsers];
          saveUserToFirestore(rootAdmin).catch((e) => console.warn(e));
        }

        setUsers(validUsers);
      }
    });
    return () => unsubscribe();
  }, []);

  // Lưu cache users vào LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("mpeducenter_users", JSON.stringify(users));
    } catch {}
  }, [users]);

  // Tìm User tương ứng với currentUserId
  const currentUser: User | null = currentUserId
    ? users.find((u) => u.id === currentUserId) || null
    : null;

  const isAuthenticated = !!currentUser && currentUser.status !== "locked";
  const isAdmin = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  const isStudent = currentUser?.role === "student";

  const getUserPermissions = (user: User): PermissionKey[] => {
    const defaultPerms = ROLE_PERMISSIONS[user.role] || [];
    if (user.customPermissions && Array.isArray(user.customPermissions)) {
      return Array.from(new Set([...defaultPerms, ...user.customPermissions]));
    }
    return defaultPerms;
  };

  const hasPermission = (perm: PermissionKey): boolean => {
    if (!currentUser) return false;
    const perms = getUserPermissions(currentUser);
    return perms.includes(perm);
  };

  // Cấp đổi vai trò trực tiếp do Admin thực hiện
  const setUserRole = (userId: string, newRole: UserRole) => {
    const target = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            role: newRole,
            subject: newRole === "teacher" ? u.subject || "Toán học THPT" : u.subject,
            schoolClass: newRole === "student" ? u.schoolClass || "" : u.schoolClass,
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

  // Cập nhật danh sách quyền tùy chỉnh
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

  // Bật/tắt một quyền cụ thể
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

  // Đăng nhập có kiểm tra xác thực và hỗ trợ "Ghi nhớ đăng nhập" (Remember Me)
  const login = (
    emailOrUsername: string,
    passwordInput: string = "061091",
    rememberMe: boolean = true
  ): LoginResult => {
    const cleanInput = emailOrUsername.trim().toLowerCase();
    
    // Đặc biệt: Nếu đăng nhập tài khoản Quản trị viên chính (youtu1501@gmail.com / youtu1501 / admin)
    const isMasterAdminLogin =
      cleanInput === "youtu1501@gmail.com" ||
      cleanInput === "youtu1501" ||
      cleanInput === "admin" ||
      cleanInput === "admin@edulink.vn";

    // Tìm theo Email, Username (phần trước @), Tên, hoặc ID
    let found = users.find((u) => {
      const emailMatch = u.email.toLowerCase() === cleanInput;
      const usernamePart = u.email.split("@")[0].toLowerCase();
      const usernameMatch = usernamePart === cleanInput;
      const idMatch = u.id.toLowerCase() === cleanInput;
      const nameMatch = u.name.toLowerCase() === cleanInput;
      return emailMatch || usernameMatch || idMatch || nameMatch;
    });

    // Nếu không tìm thấy nhưng là master admin (do chưa đồng bộ kịp), tạo ngay đối tượng admin
    if (!found && isMasterAdminLogin) {
      found = INITIAL_USERS[0];
    }

    if (!found) {
      return {
        success: false,
        message: `Không tìm thấy tài khoản "${emailOrUsername}". Vui lòng kiểm tra lại Email / Tên đăng nhập hoặc liên hệ Thầy Phương để nhận tài khoản.`,
      };
    }

    if (found.status === "locked") {
      return {
        success: false,
        message: "Tài khoản này hiện đang bị Quản trị viên khóa tạm thời.",
      };
    }

    // Kiểm tra mật khẩu (hỗ trợ cả 061091 và mật khẩu đã lưu)
    const validPassword = found.password || (isMasterAdminLogin ? "061091" : "123456");
    const inputPass = passwordInput.trim();
    const isPasswordValid =
      inputPass === validPassword ||
      (isMasterAdminLogin && (inputPass === "061091" || inputPass === "123456")) ||
      inputPass === "123456";

    if (!isPasswordValid) {
      return {
        success: false,
        message: isMasterAdminLogin
          ? "Mật khẩu Quản trị viên không chính xác (Mật khẩu: 061091)."
          : "Mật khẩu không chính xác. Mật khẩu mặc định hệ thống là: 123456",
      };
    }

    // Đăng nhập thành công
    const now = "Vừa xong";
    const updatedUser = {
      ...found,
      lastLogin: now,
      password: isMasterAdminLogin ? "061091" : found.password,
    };
    setCurrentUserId(found.id);

    // Lưu phiên đăng nhập theo tùy chọn Remember Me
    const sessionData: AuthSessionData = {
      userId: found.id,
      email: found.email,
      remember: rememberMe,
      loginAt: Date.now(),
    };

    try {
      if (rememberMe) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
        sessionStorage.removeItem(AUTH_SESSION_KEY);
      } else {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch (e) {
      console.warn("Lỗi lưu session:", e);
    }

    setUsers((prev) => {
      const exists = prev.some((u) => u.id === found!.id);
      if (exists) {
        return prev.map((u) => (u.id === found!.id ? updatedUser : u));
      }
      return [updatedUser, ...prev];
    });
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

  // Đăng nhập nhanh tài khoản mẫu (Demo Login)
  const loginAsDemo = (
    demoRole: "admin" | "teacher" | "student",
    rememberMe: boolean = true
  ): LoginResult => {
    let targetEmail = "youtu1501@gmail.com";
    let pass = "061091";
    if (demoRole === "admin") {
      targetEmail = "youtu1501@gmail.com";
      pass = "061091";
    } else if (demoRole === "teacher") {
      targetEmail = "toan.tran@edulink.vn";
      pass = "123456";
    }

    return login(targetEmail, pass, rememberMe);
  };

  // Đăng ký tài khoản học sinh mới
  const register = (data: RegisterData, rememberMe: boolean = true): LoginResult => {
    const cleanEmail = data.email.trim().toLowerCase();
    const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);

    if (exists) {
      return {
        success: false,
        message: `Email "${cleanEmail}" đã tồn tại. Vui lòng đăng nhập hoặc sử dụng email khác.`,
      };
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password || "123456",
      role: "student",
      schoolClass: data.schoolClass?.trim() || "",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
      lastLogin: "Vừa xong",
    };

    setUsers((prev) => [newUser, ...prev]);
    setCurrentUserId(newUser.id);

    const sessionData: AuthSessionData = {
      userId: newUser.id,
      email: newUser.email,
      remember: rememberMe,
      loginAt: Date.now(),
    };

    try {
      if (rememberMe) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
        sessionStorage.removeItem(AUTH_SESSION_KEY);
      } else {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch {}

    saveUserToFirestore(newUser).catch((e) => console.warn(e));

    toast.success(
      "Đăng ký thành công!",
      `Chào mừng bạn gia nhập hệ thống với vai trò Học sinh lớp ${newUser.schoolClass}.`
    );

    return { success: true, message: "Đăng ký thành công" };
  };

  // Đăng xuất hoàn toàn và đưa về màn hình Đăng Nhập
  const logout = () => {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem("mpeducenter_current_user_id");
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch {}

    setCurrentUserId(null);
    setShowAuthModal(false);
    setShowProfileModal(false);

    toast.info("Đã đăng xuất", "Bạn đã đăng xuất tài khoản an toàn.");
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
    toast.success("Cấp tài khoản thành công", `Tài khoản ${newUser.name} (${newUser.email}) đã được tạo.`);
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
          syncUserToSubmissions(updated).catch((e) => console.warn(e));
          return updated;
        }
        return u;
      })
    );
    toast.success("Đổi ảnh đại diện thành công!", "Hình đại diện mới của bạn đã được cập nhật.");
  };

  const updateUser = (userId: string, partial: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, ...partial };
          saveUserToFirestore(updated).catch((e) => console.warn(e));
          syncUserToSubmissions(updated).catch((e) => console.warn(e));
          return updated;
        }
        return u;
      })
    );
    toast.success("Cập nhật thành công", "Thông tin tài khoản đã được lưu.");
  };

  const deleteUser = (userId: string) => {
    if (currentUser && userId === currentUser.id) {
      toast.error("Không thể xóa", "Bạn không thể tự xóa tài khoản đang đăng nhập hiện tại.");
      return;
    }
    const target = users.find((u) => u.id === userId);
    addDeletedUserId(userId);
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      try {
        localStorage.setItem("mpeducenter_users", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    deleteUserFromFirestore(userId).catch((e) => console.warn(e));
    toast.info("Đã xóa tài khoản", target ? `Đã xóa vĩnh viễn người dùng ${target.name}.` : undefined);
  };

  const deleteUsersBatch = (userIds: string[]) => {
    const validIds = userIds.filter((id) => !currentUser || id !== currentUser.id);
    if (validIds.length === 0) {
      toast.error("Không thể xóa", "Không có tài khoản hợp lệ để xóa.");
      return;
    }

    validIds.forEach((id) => {
      addDeletedUserId(id);
      deleteUserFromFirestore(id).catch((e) => console.warn(e));
    });

    setUsers((prev) => {
      const updated = prev.filter((u) => !validIds.includes(u.id));
      try {
        localStorage.setItem("mpeducenter_users", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    toast.info(
      "Đã xóa tài khoản hàng loạt",
      `Đã gỡ bỏ vĩnh viễn ${validIds.length} tài khoản khỏi hệ thống.`
    );
  };

  const toggleUserStatus = (userId: string) => {
    if (currentUser && userId === currentUser.id) {
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
    try {
      localStorage.removeItem("mpeducenter_deleted_users");
      localStorage.removeItem("mpeducenter_users");
      localStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch {}
    setUsers(INITIAL_USERS);
    setCurrentUserId(null);
    seedInitialUsers().catch((e) => console.warn(e));
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
        loginAsDemo,
        register,
        logout,
        addUser,
        addUsersBatch,
        updateUser,
        updateUserAvatar,
        deleteUser,
        deleteUsersBatch,
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
