import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { User, INITIAL_USERS } from "../types/auth";
import { Exam, StudentSubmission, LiveRoom } from "../types/exam";
import { initialSampleSubmissions } from "../data/sampleSubmissions";
import { initialSampleExams } from "../data/defaultExam";

/**
 * Hàm làm sạch đối tượng trước khi gửi lên Firestore
 * Loại bỏ toàn bộ giá trị undefined để tránh lỗi Firestore Unsupported Field Value
 */
export const cleanForFirestore = <T>(obj: T): T => {
  if (obj === undefined || obj === null) return null as unknown as T;
  return JSON.parse(
    JSON.stringify(obj, (k, v) => (v === undefined ? null : v))
  );
};

// ----------------------------------------------------
// Quản lý Quota & Circuit Breaker cho Firestore
// Tránh lỗi "Write stream exhausted maximum allowed queued writes" và "Quota limit exceeded"
// ----------------------------------------------------
const QUOTA_KEY = "edutest_firestore_quota_status";
let isFirestoreWriteQuotaExceeded = false;
let quotaExceededMessage = "";
let quotaExceededAt: number | null = null;

try {
  const saved = localStorage.getItem(QUOTA_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
      isFirestoreWriteQuotaExceeded = true;
      quotaExceededMessage = parsed.message || "Quota limit exceeded";
      quotaExceededAt = parsed.timestamp;
    }
  }
} catch {}

export const isFirestoreQuotaExceeded = (): boolean => isFirestoreWriteQuotaExceeded;

export const getFirestoreQuotaDetails = () => ({
  isExceeded: isFirestoreWriteQuotaExceeded,
  message: quotaExceededMessage,
  timestamp: quotaExceededAt,
  databaseId: "ai-studio-edutestprokimtra-4406e629-beff-4e6e-8844-a674f6708ec1",
  projectId: "mpeducenter-test",
});

export const resetFirestoreQuotaCircuitBreaker = (): void => {
  isFirestoreWriteQuotaExceeded = false;
  quotaExceededMessage = "";
  quotaExceededAt = null;
  try {
    localStorage.removeItem(QUOTA_KEY);
  } catch {}
};

export const handleFirestoreWriteError = (err: any, context: string): void => {
  const errMsg = err?.message || String(err);
  const errCode = err?.code || "";

  if (
    errCode === "resource-exhausted" ||
    errMsg.includes("resource-exhausted") ||
    errMsg.includes("Quota limit exceeded") ||
    errMsg.includes("Write stream exhausted") ||
    errMsg.includes("Free daily write units")
  ) {
    if (!isFirestoreWriteQuotaExceeded) {
      isFirestoreWriteQuotaExceeded = true;
      quotaExceededMessage = errMsg;
      quotaExceededAt = Date.now();
      try {
        localStorage.setItem(
          QUOTA_KEY,
          JSON.stringify({
            timestamp: quotaExceededAt,
            message: errMsg,
          })
        );
      } catch {}
      console.warn(
        `[EduTest Pro Firestore Quota Guard] Đã kích hoạt chế độ dự phòng Offline/Local do hạn mức ghi miễn phí trong ngày của Firestore đã đạt giới hạn: ${errMsg}`
      );
      try {
        window.dispatchEvent(
          new CustomEvent("edutest:firestore_quota_exceeded", {
            detail: {
              context,
              message: errMsg,
              timestamp: Date.now(),
            },
          })
        );
      } catch {}
    }
  } else {
    console.warn(`[Firestore Error] ${context}:`, err);
  }
};

// ----------------------------------------------------
// 0. Quản lý Danh sách đối tượng đã bị xóa (Tombstones / Deleted IDs Tracking)
// ----------------------------------------------------
const DELETED_USERS_KEY = "mpeducenter_deleted_users";
const DELETED_EXAMS_KEY = "edutest_deleted_exams";
const DELETED_SUBMISSIONS_KEY = "edutest_deleted_submissions";

export const getDeletedUserIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const addDeletedUserId = (userId: string): void => {
  try {
    const set = getDeletedUserIds();
    set.add(userId);
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const removeDeletedUserId = (userId: string): void => {
  try {
    const set = getDeletedUserIds();
    set.delete(userId);
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const getDeletedExamIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_EXAMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const addDeletedExamId = (examId: string): void => {
  try {
    const set = getDeletedExamIds();
    set.add(examId);
    localStorage.setItem(DELETED_EXAMS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const removeDeletedExamId = (examId: string): void => {
  try {
    const set = getDeletedExamIds();
    set.delete(examId);
    localStorage.setItem(DELETED_EXAMS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const getDeletedSubmissionIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_SUBMISSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

export const addDeletedSubmissionId = (subId: string): void => {
  try {
    const set = getDeletedSubmissionIds();
    set.add(subId);
    localStorage.setItem(DELETED_SUBMISSIONS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const removeDeletedSubmissionId = (subId: string): void => {
  try {
    const set = getDeletedSubmissionIds();
    set.delete(subId);
    localStorage.setItem(DELETED_SUBMISSIONS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

// ----------------------------------------------------
// 1. Quản lý Người dùng (Users & Roles)
// ----------------------------------------------------
const USERS_COLLECTION = "users";

export const subscribeUsers = (
  callback: (users: User[]) => void,
  onError?: (error: Error) => void
) => {
  const deletedUserIds = getDeletedUserIds();

  // 1. Nạp tức thì từ bộ nhớ cục bộ nếu có
  try {
    const local = localStorage.getItem("mpeducenter_users");
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((u: User) => u && u.id && !deletedUserIds.has(u.id));
        callback(filtered);
      }
    } else {
      // Chỉ dùng INITIAL_USERS nếu chưa từng có cache
      const initialFiltered = INITIAL_USERS.filter((u) => !deletedUserIds.has(u.id));
      callback(initialFiltered);
    }
  } catch {}

  // Đồng thời thử nạp từ backend server nếu có
  try {
    fetch("/api/users")
      .then((res) => res.json())
      .then((serverUsers) => {
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          const currentDeleted = getDeletedUserIds();
          const valid = serverUsers.filter((u: any) => u && u.id && !currentDeleted.has(u.id));
          if (valid.length > 0) {
            try {
              localStorage.setItem("mpeducenter_users", JSON.stringify(valid));
            } catch {}
            callback(valid);
          }
        }
      })
      .catch(() => {});
  } catch {}

  try {
    const q = query(collection(db, USERS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const currentDeleted = getDeletedUserIds();
        if (snapshot.empty) {
          // Khởi tạo người dùng mẫu nếu Firestore hoàn toàn trống và chưa có dữ liệu
          const local = localStorage.getItem("mpeducenter_users");
          if (!local && currentDeleted.size === 0) {
            seedInitialUsers().then(() => {
              callback(INITIAL_USERS);
            });
          } else {
            callback([]);
          }
          return;
        }

        // Đọc trực tiếp từ Firestore Snapshot, TUYỆT ĐỐI KHÔNG tự động chèn lại INITIAL_USERS
        const userMap = new Map<string, User>();
        snapshot.forEach((docSnap) => {
          const u = docSnap.data() as User;
          if (u && u.id && !currentDeleted.has(u.id)) {
            userMap.set(u.id, u);
          }
        });

        const users = Array.from(userMap.values());
        try {
          localStorage.setItem("mpeducenter_users", JSON.stringify(users));
        } catch {}
        callback(users);
      },
      (err) => {
        handleFirestoreWriteError(err, "subscribeUsers");
        console.warn("Firestore subscribeUsers fallback to localStorage:", err);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    handleFirestoreWriteError(error, "subscribeUsers init");
    console.warn("Firestore error:", error);
    return () => {};
  }
};

export const saveUserToFirestore = async (user: User): Promise<void> => {
  try {
    removeDeletedUserId(user.id);

    // 1. Lưu tức thì vào LocalStorage
    try {
      const local = localStorage.getItem("mpeducenter_users");
      const current: User[] = local ? JSON.parse(local) : [];
      const updated = current.filter((u) => u.id !== user.id);
      updated.push(user);
      localStorage.setItem("mpeducenter_users", JSON.stringify(updated));
    } catch {}

    // 2. Lưu vào backend server Express
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    }).catch(() => {});

    // 3. Nếu Quota Firestore đã đầy trong ngày, bỏ qua gọi Firestore để không nghẽn luồng ghi
    if (isFirestoreWriteQuotaExceeded) return;

    const cleanUser = cleanForFirestore(user);
    const ref = doc(db, USERS_COLLECTION, user.id);
    await setDoc(ref, cleanUser, { merge: true });
  } catch (err) {
    handleFirestoreWriteError(err, "saveUserToFirestore");
  }
};

export const saveUsersBatchToFirestore = async (users: User[]): Promise<void> => {
  try {
    // 1. Cập nhật LocalStorage
    try {
      const deleted = getDeletedUserIds();
      const valid = users.filter((u) => u && u.id && !deleted.has(u.id));
      localStorage.setItem("mpeducenter_users", JSON.stringify(valid));
    } catch {}

    // 2. Gửi batch lên backend server Express
    fetch("/api/users/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(users),
    }).catch(() => {});

    // 3. Nếu Quota Firestore đã đầy, không đẩy tiếp vào hàng đợi Firestore
    if (isFirestoreWriteQuotaExceeded) return;

    for (const u of users) {
      removeDeletedUserId(u.id);
      const cleanUser = cleanForFirestore(u);
      const ref = doc(db, USERS_COLLECTION, u.id);
      await setDoc(ref, cleanUser, { merge: true });
    }
  } catch (err) {
    handleFirestoreWriteError(err, "saveUsersBatchToFirestore");
  }
};

export const deleteUserFromFirestore = async (userId: string): Promise<void> => {
  try {
    // 1. Thêm vào danh sách xóa vĩnh viễn
    addDeletedUserId(userId);

    // 2. Xóa khỏi LocalStorage
    try {
      const local = localStorage.getItem("mpeducenter_users");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((u: User) => u && u.id !== userId);
          localStorage.setItem("mpeducenter_users", JSON.stringify(updated));
        }
      }
    } catch {}

    // 3. Xóa các bài làm liên quan của người dùng này để đồng bộ toàn bộ báo cáo
    try {
      await purgeUserSubmissions(userId);
    } catch {}

    // 4. Xóa trên backend server Express
    fetch(`/api/users/${userId}`, { method: "DELETE" }).catch(() => {});

    // 5. Nếu Quota đã đầy, bỏ qua Firestore
    if (isFirestoreWriteQuotaExceeded) return;

    // 6. Xóa trên Firestore Database
    const ref = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreWriteError(err, "deleteUserFromFirestore");
  }
};

export const seedInitialUsers = async (): Promise<void> => {
  try {
    if (isFirestoreWriteQuotaExceeded) return;
    const deleted = getDeletedUserIds();
    const toSeed = INITIAL_USERS.filter((u) => !deleted.has(u.id));
    for (const u of toSeed) {
      const cleanUser = cleanForFirestore(u);
      const ref = doc(db, USERS_COLLECTION, u.id);
      await setDoc(ref, cleanUser, { merge: true });
    }
  } catch (err) {
    handleFirestoreWriteError(err, "seedInitialUsers");
  }
};

// ----------------------------------------------------
// 2. Quản lý Ngân hàng Đề thi (Exams)
// ----------------------------------------------------
const EXAMS_COLLECTION = "exams";

export const subscribeExams = (
  callback: (exams: Exam[]) => void,
  onError?: (error: Error) => void
) => {
  const deletedExamIds = getDeletedExamIds();

  // Nạp tức thì từ local cache nếu có
  try {
    const local = localStorage.getItem("edutest_exams");
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((e: Exam) => e && e.id && !deletedExamIds.has(e.id));
        callback(filtered);
      } else {
        callback([]);
      }
    } else {
      callback([]);
    }
  } catch {
    callback([]);
  }

  // Đồng thời thử nạp từ backend server nếu có
  try {
    fetch("/api/exams")
      .then((res) => res.json())
      .then((serverExams) => {
        if (Array.isArray(serverExams) && serverExams.length > 0) {
          const currentDeleted = getDeletedExamIds();
          const valid = serverExams.filter((e: any) => e && e.id && !currentDeleted.has(e.id));
          if (valid.length > 0) {
            try {
              localStorage.setItem("edutest_exams", JSON.stringify(valid));
            } catch {}
            callback(valid);
          }
        }
      })
      .catch(() => {});
  } catch {}

  try {
    const q = query(collection(db, EXAMS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const currentDeleted = getDeletedExamIds();
        if (snapshot.empty) {
          try {
            localStorage.setItem("edutest_exams", JSON.stringify([]));
          } catch {}
          callback([]);
          return;
        }

        const exams: Exam[] = [];
        snapshot.forEach((docSnap) => {
          const e = docSnap.data() as Exam;
          if (e && e.id && !currentDeleted.has(e.id)) {
            exams.push(e);
          }
        });

        try {
          localStorage.setItem("edutest_exams", JSON.stringify(exams));
        } catch {}
        callback(exams);
      },
      (err) => {
        handleFirestoreWriteError(err, "subscribeExams");
        console.warn("Firestore subscribeExams fallback to local:", err);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    handleFirestoreWriteError(error, "subscribeExams init");
    console.warn("Firestore subscribeExams error:", error);
    return () => {};
  }
};

export const saveExamToFirestore = async (exam: Exam): Promise<void> => {
  try {
    removeDeletedExamId(exam.id);

    // 1. Lưu LocalStorage
    try {
      const local = localStorage.getItem("edutest_exams");
      const current: Exam[] = local ? JSON.parse(local) : [];
      const updated = current.filter((e) => e.id !== exam.id);
      updated.push(exam);
      localStorage.setItem("edutest_exams", JSON.stringify(updated));
    } catch {}

    // 2. Gửi backend server Express
    fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exam),
    }).catch(() => {});

    // 3. Nếu Quota Firestore đã đầy, bỏ qua gọi Firestore
    if (isFirestoreWriteQuotaExceeded) return;

    const cleanExam = cleanForFirestore(exam);
    const ref = doc(db, EXAMS_COLLECTION, exam.id);
    await setDoc(ref, cleanExam, { merge: true });
  } catch (err) {
    handleFirestoreWriteError(err, "saveExamToFirestore");
  }
};

export const deleteExamFromFirestore = async (examId: string): Promise<void> => {
  try {
    addDeletedExamId(examId);

    try {
      const local = localStorage.getItem("edutest_exams");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((e: Exam) => e && e.id !== examId);
          localStorage.setItem("edutest_exams", JSON.stringify(updated));
        }
      }
    } catch {}

    // Gửi xóa trên backend server Express
    fetch(`/api/exams/${examId}`, { method: "DELETE" }).catch(() => {});

    if (isFirestoreWriteQuotaExceeded) return;

    const ref = doc(db, EXAMS_COLLECTION, examId);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreWriteError(err, "deleteExamFromFirestore");
  }
};

export const clearAllExams = async (): Promise<void> => {
  try {
    localStorage.setItem("edutest_exams", JSON.stringify([]));
    if (isFirestoreWriteQuotaExceeded) return;

    const examDocs = await getDocs(collection(db, EXAMS_COLLECTION));
    for (const d of examDocs.docs) {
      await deleteDoc(d.ref);
    }
  } catch (err) {
    handleFirestoreWriteError(err, "clearAllExams");
  }
};

export const seedInitialExams = async (): Promise<void> => {
  try {
    if (isFirestoreWriteQuotaExceeded) return;
    const deleted = getDeletedExamIds();
    const toSeed = initialSampleExams.filter((e) => !deleted.has(e.id));
    for (const e of toSeed) {
      const cleanExam = cleanForFirestore(e);
      const ref = doc(db, EXAMS_COLLECTION, e.id);
      await setDoc(ref, cleanExam, { merge: true });
    }
  } catch (err) {
    handleFirestoreWriteError(err, "seedInitialExams");
  }
};

// ----------------------------------------------------
// 3. Quản lý Kết quả & Bài nộp Lịch sử làm bài (Submissions)
// ----------------------------------------------------
const SUBMISSIONS_COLLECTION = "submissions";

export const getLocalSubmissions = (): StudentSubmission[] => {
  const deletedSubs = getDeletedSubmissionIds();
  const deletedUsers = getDeletedUserIds();
  try {
    const raw = localStorage.getItem("edutest_submissions");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (s: StudentSubmission) =>
            s && s.id && !deletedSubs.has(s.id) && (!s.studentId || !deletedUsers.has(s.studentId))
        );
      }
    }
  } catch {}
  return [];
};

/**
 * Xóa sạch 100% kết quả thi (Submissions) trên cả Firestore và LocalStorage khi Admin chủ động yêu cầu
 */
export const clearAllSubmissions = async (): Promise<void> => {
  try {
    localStorage.removeItem("edutest_submissions");
    localStorage.removeItem(DELETED_SUBMISSIONS_KEY);
    const subDocs = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    for (const d of subDocs.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }
  } catch (err) {
    console.warn("Lỗi xóa toàn bộ submissions:", err);
  }
};

/**
 * Đồng bộ và bảo vệ an toàn toàn bộ dữ liệu bài nộp của học sinh.
 * Tuyệt đối không tự động xóa bất kỳ bài thi nào của học sinh.
 */
export const clearOrphanedData = async (existingUsers?: User[]): Promise<void> => {
  // Không thực hiện xóa tự động để bảo vệ toàn vẹn bài làm của học sinh
  try {
    if (existingUsers && existingUsers.length > 0) {
      // Tự động chuẩn hóa đồng bộ họ tên/lớp nếu học sinh đã có tài khoản
      const userMap = new Map<string, User>();
      existingUsers.forEach((u) => {
        if (u && u.id) userMap.set(u.id, u);
      });
      const localSubs = getLocalSubmissions();
      let hasChanges = false;
      const updated = localSubs.map((s) => {
        if (s.studentId && userMap.has(s.studentId)) {
          const u = userMap.get(s.studentId)!;
          if (u.schoolClass && u.schoolClass !== s.studentClass) {
            hasChanges = true;
            return { ...s, studentClass: u.schoolClass, studentName: u.name || s.studentName };
          }
        }
        return s;
      });
      if (hasChanges) {
        localStorage.setItem("edutest_submissions", JSON.stringify(updated));
      }
    }
  } catch (err) {
    console.warn("Lỗi đồng bộ dữ liệu bài nộp:", err);
  }
};

/**
 * Tự động đồng bộ bài nộp học sinh (không xóa bài nộp)
 */
export const cleanupOrphanedSubmissions = async (validUsers: User[]): Promise<void> => {
  return clearOrphanedData(validUsers);
};

export const purgeUserSubmissions = async (userId: string): Promise<void> => {
  try {
    const raw = localStorage.getItem("edutest_submissions");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const subsToDelete = parsed.filter(
          (s: StudentSubmission) => s && (s.studentId === userId)
        );
        subsToDelete.forEach((s) => addDeletedSubmissionId(s.id));
        const remaining = parsed.filter(
          (s: StudentSubmission) => s && s.studentId !== userId
        );
        localStorage.setItem("edutest_submissions", JSON.stringify(remaining));

        for (const sub of subsToDelete) {
          try {
            await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, sub.id));
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi xóa bài nộp của người dùng:", err);
  }
};

export const syncUserToSubmissions = async (user: User): Promise<void> => {
  try {
    const raw = localStorage.getItem("edutest_submissions");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let hasChanges = false;
        const updated = parsed.map((s: StudentSubmission) => {
          if (
            s.studentId === user.id ||
            (s.studentEmail && user.email && s.studentEmail.toLowerCase() === user.email.toLowerCase())
          ) {
            hasChanges = true;
            return {
              ...s,
              studentId: user.id,
              studentName: user.name,
              studentClass: user.schoolClass || s.studentClass,
              studentEmail: user.email || s.studentEmail,
              studentAvatar: user.avatar || s.studentAvatar,
            };
          }
          return s;
        });

        if (hasChanges) {
          localStorage.setItem("edutest_submissions", JSON.stringify(updated));
          if (!isFirestoreWriteQuotaExceeded) {
            for (const sub of updated) {
              if (sub.studentId === user.id) {
                const cleanSub = cleanForFirestore(sub);
                await setDoc(doc(db, SUBMISSIONS_COLLECTION, sub.id), cleanSub, { merge: true }).catch((e) => {
                  handleFirestoreWriteError(e, "syncUserToSubmissions");
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi đồng bộ thông tin người dùng vào bài nộp:", err);
  }
};

export const subscribeSubmissions = (
  callback: (subs: StudentSubmission[]) => void,
  onError?: (error: Error) => void
) => {
  // 1. Nạp từ LocalStorage trước để giao diện hiển thị ngay lập tức
  const initialLocal = getLocalSubmissions();
  callback(initialLocal);

  // Đồng thời thử phục hồi từ backend server nếu có
  try {
    fetch("/api/submissions")
      .then((res) => res.json())
      .then((serverSubs) => {
        if (Array.isArray(serverSubs) && serverSubs.length > 0) {
          const currentLocal = getLocalSubmissions();
          const merged = new Map<string, StudentSubmission>();
          serverSubs.forEach((s: any) => {
            if (s && s.id) merged.set(s.id, s);
          });
          currentLocal.forEach((s) => {
            if (s && s.id) merged.set(s.id, s);
          });
          const combined = Array.from(merged.values()).sort(
            (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
          );
          try {
            localStorage.setItem("edutest_submissions", JSON.stringify(combined));
          } catch {}
          callback(combined);
        }
      })
      .catch(() => {});
  } catch {}

  try {
    const q = query(collection(db, SUBMISSIONS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const currentDeleted = getDeletedSubmissionIds();
        const currentDeletedUsers = getDeletedUserIds();

        const firestoreSubs: StudentSubmission[] = [];
        snapshot.forEach((docSnap) => {
          const sub = docSnap.data() as StudentSubmission;
          if (
            sub &&
            sub.id &&
            !currentDeleted.has(sub.id) &&
            (!sub.studentId || !currentDeletedUsers.has(sub.studentId))
          ) {
            firestoreSubs.push(sub);
          }
        });

        // Hợp nhất dữ liệu Firestore với LocalStorage (đảm bảo không bị mất bài nộp offline/mới nộp)
        const localSubs = getLocalSubmissions();
        const mergedMap = new Map<string, StudentSubmission>();
        firestoreSubs.forEach((s) => mergedMap.set(s.id, s));
        localSubs.forEach((s) => {
          if (!mergedMap.has(s.id) && !currentDeleted.has(s.id) && (!s.studentId || !currentDeletedUsers.has(s.studentId))) {
            mergedMap.set(s.id, s);
          }
        });

        const combinedSubs = Array.from(mergedMap.values());

        // Sắp xếp bài nộp mới nhất lên đầu (theo submittedAt)
        combinedSubs.sort(
          (a, b) =>
            new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
        );

        // Lưu bền vững vào LocalStorage
        try {
          localStorage.setItem("edutest_submissions", JSON.stringify(combinedSubs));
        } catch {}

        callback(combinedSubs);
      },
      (err) => {
        handleFirestoreWriteError(err, "subscribeSubmissions");
        console.warn("Firestore subscribeSubmissions fallback to local:", err);
        const fallback = getLocalSubmissions();
        callback(fallback);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    handleFirestoreWriteError(error, "subscribeSubmissions init");
    console.warn("Firestore subscribeSubmissions error:", error);
    const fallback = getLocalSubmissions();
    callback(fallback);
    return () => {};
  }
};


export const saveSubmissionToFirestore = async (
  sub: StudentSubmission
): Promise<void> => {
  removeDeletedSubmissionId(sub.id);

  // 1. Cập nhật tức thì vào LocalStorage (Bảo đảm không bao giờ mất dù có ngắt mạng hay F5 và không nhân bản học sinh)
  try {
    const current = getLocalSubmissions();
    const filtered = current.filter((s) => {
      if (s.id === sub.id) return false;
      const isSameStudent =
        (s.studentId && sub.studentId && s.studentId === sub.studentId) ||
        (s.studentName &&
          sub.studentName &&
          s.studentName.trim().toLowerCase() === sub.studentName.trim().toLowerCase());

      const isSameExam =
        s.examId === sub.examId ||
        (s.examTitle &&
          sub.examTitle &&
          s.examTitle.trim().toLowerCase() === sub.examTitle.trim().toLowerCase());

      if (isSameStudent && isSameExam) {
        return false;
      }
      return true;
    });
    const updated = [sub, ...filtered];
    localStorage.setItem("edutest_submissions", JSON.stringify(updated));
  } catch (err) {
    console.warn("Lỗi lưu LocalStorage:", err);
  }

  // 2. Gửi lên backend server Express
  try {
    fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    }).catch(() => {});
  } catch {}

  // 3. Nếu Quota Firestore đã đầy trong ngày, bỏ qua gọi Firestore để không nghẽn luồng ghi
  if (isFirestoreWriteQuotaExceeded) return;

  // 4. Lưu bền vững vào Firebase Firestore
  try {
    const cleanSub = cleanForFirestore(sub);
    const ref = doc(db, SUBMISSIONS_COLLECTION, sub.id);
    await setDoc(ref, cleanSub, { merge: true });
  } catch (err) {
    handleFirestoreWriteError(err, "saveSubmissionToFirestore");
  }
};

export const deleteSubmissionFromFirestore = async (
  subId: string
): Promise<void> => {
  addDeletedSubmissionId(subId);

  try {
    const current = getLocalSubmissions();
    const updated = current.filter((s) => s.id !== subId);
    localStorage.setItem("edutest_submissions", JSON.stringify(updated));
  } catch {}

  if (isFirestoreWriteQuotaExceeded) return;

  try {
    const ref = doc(db, SUBMISSIONS_COLLECTION, subId);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreWriteError(err, "deleteSubmissionFromFirestore");
  }
};

export const seedInitialSubmissions = async (): Promise<void> => {
  try {
    if (isFirestoreWriteQuotaExceeded) return;
    for (const sub of initialSampleSubmissions) {
      const cleanSub = cleanForFirestore(sub);
      const ref = doc(db, SUBMISSIONS_COLLECTION, sub.id);
      await setDoc(ref, cleanSub, { merge: true });
    }
    try {
      localStorage.setItem("edutest_submissions", JSON.stringify(initialSampleSubmissions));
    } catch {}
  } catch (err) {
    handleFirestoreWriteError(err, "seedInitialSubmissions");
  }
};

// ----------------------------------------------------
// 4. Phòng thi Live thời gian thực (LiveRooms)
// ----------------------------------------------------
const LIVEROOMS_COLLECTION = "liveRooms";

export const subscribeLiveRoom = (
  pin: string,
  callback: (room: LiveRoom | null) => void
) => {
  try {
    const ref = doc(db, LIVEROOMS_COLLECTION, pin);
    return onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as LiveRoom);
      } else {
        callback(null);
      }
    });
  } catch (error) {
    console.warn("Firestore subscribeLiveRoom error:", error);
    return () => {};
  }
};

export const createLiveRoomInFirestore = async (room: LiveRoom): Promise<void> => {
  try {
    // 1. Luôn gửi backend server Express
    fetch("/api/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(room),
    }).catch(() => {});

    if (isFirestoreWriteQuotaExceeded) return;

    const cleanData = cleanForFirestore(room);
    const ref = doc(db, LIVEROOMS_COLLECTION, room.pin);
    await setDoc(ref, cleanData);
  } catch (err) {
    handleFirestoreWriteError(err, "createLiveRoomInFirestore");
  }
};

export const getLiveRoomFromFirestore = async (pin: string): Promise<LiveRoom | null> => {
  try {
    const ref = doc(db, LIVEROOMS_COLLECTION, pin);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as LiveRoom;
    }
    return null;
  } catch (err) {
    handleFirestoreWriteError(err, "getLiveRoomFromFirestore");
    return null;
  }
};

export const updateLiveRoomInFirestore = async (
  pin: string,
  data: Partial<LiveRoom>
): Promise<void> => {
  try {
    // Gửi backend server Express
    fetch(`/api/rooms/${pin}/update-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});

    if (isFirestoreWriteQuotaExceeded) return;

    const cleanData = cleanForFirestore(data);
    const ref = doc(db, LIVEROOMS_COLLECTION, pin);
    await setDoc(ref, cleanData, { merge: true });
  } catch (err) {
    handleFirestoreWriteError(err, "updateLiveRoomInFirestore");
  }
};

export const joinLiveRoomInFirestore = async (
  pin: string,
  student: any
): Promise<LiveRoom | null> => {
  try {
    const room = await getLiveRoomFromFirestore(pin);
    if (!room) return null;
    const students = Array.isArray(room.students) ? [...room.students] : [];
    const idx = students.findIndex((s) => s.id === student.id || (student.name && s.name === student.name));
    if (idx >= 0) {
      students[idx] = { ...students[idx], ...student, isOnline: true, lastActive: new Date().toISOString() };
    } else {
      students.push(student);
    }
    await updateLiveRoomInFirestore(pin, { students });
    return { ...room, students };
  } catch (err) {
    console.warn("Lỗi tham gia LiveRoom trên Firestore:", err);
    return null;
  }
};

/**
 * Xóa sạch 100% dữ liệu cũ (Tài khoản học sinh, bài làm, điểm số, đề thi)
 * và đưa hệ thống về trạng thái sạch sẽ trên Project mới MPEduCenter-Test.
 */
export const wipeAndResetAllData = async (): Promise<void> => {
  try {
    // 1. Dọn sạch toàn bộ LocalStorage
    localStorage.removeItem("mpeducenter_users");
    localStorage.removeItem("edutest_exams");
    localStorage.removeItem("edutest_submissions");
    localStorage.removeItem(DELETED_USERS_KEY);
    localStorage.removeItem(DELETED_EXAMS_KEY);
    localStorage.removeItem(DELETED_SUBMISSIONS_KEY);

    // 2. Xóa sạch submissions trên Firestore
    try {
      const subDocs = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
      for (const d of subDocs.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Lỗi xóa submissions:", e);
    }

    // 3. Xóa sạch exams trên Firestore
    try {
      const examDocs = await getDocs(collection(db, EXAMS_COLLECTION));
      for (const d of examDocs.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Lỗi xóa exams:", e);
    }

    // 4. Xóa sạch live rooms
    try {
      const roomDocs = await getDocs(collection(db, LIVEROOMS_COLLECTION));
      for (const d of roomDocs.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Lỗi xóa live rooms:", e);
    }

    // 5. Làm sạch danh sách người dùng và tạo lại duy nhất tài khoản Quản trị viên gốc
    try {
      const userDocs = await getDocs(collection(db, USERS_COLLECTION));
      for (const d of userDocs.docs) {
        await deleteDoc(d.ref);
      }
      const rootAdmin = INITIAL_USERS[0];
      if (rootAdmin) {
        const ref = doc(db, USERS_COLLECTION, rootAdmin.id);
        await setDoc(ref, cleanForFirestore(rootAdmin));
      }
    } catch (e) {
      console.warn("Lỗi reset users:", e);
    }
  } catch (err) {
    console.error("Lỗi xóa sạch dữ liệu:", err);
  }
};
