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
import { initialSampleExams } from "../data/defaultExam";
import { initialSampleSubmissions } from "../data/sampleSubmissions";

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
// 1. Quản lý Người dùng (Users & Roles)
// ----------------------------------------------------
const USERS_COLLECTION = "users";

export const subscribeUsers = (
  callback: (users: User[]) => void,
  onError?: (error: Error) => void
) => {
  // 1. Nạp tức thì từ bộ nhớ cục bộ nếu có
  try {
    const local = localStorage.getItem("mpeducenter_users");
    const userMap = new Map<string, User>();
    INITIAL_USERS.forEach((u) => userMap.set(u.id, u));
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((u: User) => {
          if (u && u.id) userMap.set(u.id, u);
        });
      }
    }
    callback(Array.from(userMap.values()));
  } catch {}

  try {
    const q = query(collection(db, USERS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // Khởi tạo người dùng mẫu nếu Firestore trống
          seedInitialUsers().then(() => {
            callback(INITIAL_USERS);
          });
          return;
        }
        const userMap = new Map<string, User>();
        INITIAL_USERS.forEach((u) => userMap.set(u.id, u));
        snapshot.forEach((docSnap) => {
          const u = docSnap.data() as User;
          if (u && u.id) userMap.set(u.id, u);
        });
        const users = Array.from(userMap.values());
        try {
          localStorage.setItem("mpeducenter_users", JSON.stringify(users));
        } catch {}
        callback(users);
      },
      (err) => {
        console.warn("Firestore subscribeUsers fallback to localStorage:", err);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    console.warn("Firestore error:", error);
    return () => {};
  }
};

export const saveUserToFirestore = async (user: User): Promise<void> => {
  try {
    const cleanUser = cleanForFirestore(user);
    const ref = doc(db, USERS_COLLECTION, user.id);
    await setDoc(ref, cleanUser, { merge: true });
  } catch (err) {
    console.warn("Lỗi khi lưu người dùng lên Firestore (lưu cache local):", err);
  }
};

export const saveUsersBatchToFirestore = async (users: User[]): Promise<void> => {
  try {
    for (const u of users) {
      const cleanUser = cleanForFirestore(u);
      const ref = doc(db, USERS_COLLECTION, u.id);
      await setDoc(ref, cleanUser, { merge: true });
    }
  } catch (err) {
    console.warn("Lỗi khi lưu danh sách người dùng lên Firestore:", err);
  }
};

export const deleteUserFromFirestore = async (userId: string): Promise<void> => {
  try {
    const ref = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi khi xóa người dùng trên Firestore:", err);
  }
};

export const seedInitialUsers = async (): Promise<void> => {
  try {
    for (const u of INITIAL_USERS) {
      const cleanUser = cleanForFirestore(u);
      const ref = doc(db, USERS_COLLECTION, u.id);
      await setDoc(ref, cleanUser, { merge: true });
    }
  } catch (err) {
    console.warn("Lỗi nạp người dùng mẫu:", err);
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
  // Nạp tức thì từ local cache nếu có
  try {
    const local = localStorage.getItem("edutest_exams");
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      }
    }
  } catch {}

  try {
    const q = query(collection(db, EXAMS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          seedInitialExams().then(() => {
            callback(initialSampleExams);
          });
          return;
        }
        const exams: Exam[] = [];
        snapshot.forEach((docSnap) => {
          exams.push(docSnap.data() as Exam);
        });
        try {
          localStorage.setItem("edutest_exams", JSON.stringify(exams));
        } catch {}
        callback(exams);
      },
      (err) => {
        console.warn("Firestore subscribeExams fallback to local:", err);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    console.warn("Firestore subscribeExams error:", error);
    return () => {};
  }
};

export const saveExamToFirestore = async (exam: Exam): Promise<void> => {
  try {
    const cleanExam = cleanForFirestore(exam);
    const ref = doc(db, EXAMS_COLLECTION, exam.id);
    await setDoc(ref, cleanExam, { merge: true });
  } catch (err) {
    console.warn("Lỗi khi lưu đề thi lên Firestore:", err);
  }
};

export const deleteExamFromFirestore = async (examId: string): Promise<void> => {
  try {
    const ref = doc(db, EXAMS_COLLECTION, examId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi khi xóa đề thi trên Firestore:", err);
  }
};

export const seedInitialExams = async (): Promise<void> => {
  try {
    for (const exam of initialSampleExams) {
      const cleanExam = cleanForFirestore(exam);
      const ref = doc(db, EXAMS_COLLECTION, exam.id);
      await setDoc(ref, cleanExam, { merge: true });
    }
  } catch (err) {
    console.warn("Lỗi nạp đề thi mẫu:", err);
  }
};

// ----------------------------------------------------
// 3. Quản lý Kết quả & Bài nộp Lịch sử làm bài (Submissions)
// ----------------------------------------------------
const SUBMISSIONS_COLLECTION = "submissions";

export const getLocalSubmissions = (): StudentSubmission[] => {
  const map = new Map<string, StudentSubmission>();
  initialSampleSubmissions.forEach((s) => map.set(s.id, s));
  try {
    const raw = localStorage.getItem("edutest_submissions");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((s: StudentSubmission) => {
          if (s && s.id) {
            map.set(s.id, s);
          }
        });
      }
    }
  } catch {}
  return Array.from(map.values());
};

export const subscribeSubmissions = (
  callback: (subs: StudentSubmission[]) => void,
  onError?: (error: Error) => void
) => {
  // 1. Nạp tức thì từ LocalStorage hoặc bộ dữ liệu khởi tạo để UI hiển thị ngay lập tức
  const initialLocal = getLocalSubmissions();
  if (initialLocal.length > 0) {
    callback(initialLocal);
  }

  try {
    const q = query(collection(db, SUBMISSIONS_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          // Nếu Firestore trống, nạp dữ liệu mẫu lên Firestore và duy trì local
          const local = getLocalSubmissions();
          if (local.length > 0) {
            // Đẩy local lên Firestore
            for (const sub of local) {
              const cleanSub = cleanForFirestore(sub);
              setDoc(doc(db, SUBMISSIONS_COLLECTION, sub.id), cleanSub, { merge: true }).catch(() => {});
            }
            callback(local);
          } else {
            seedInitialSubmissions().then(() => {
              callback(initialSampleSubmissions);
            });
          }
          return;
        }

        const firestoreSubs: StudentSubmission[] = [];
        snapshot.forEach((docSnap) => {
          firestoreSubs.push(docSnap.data() as StudentSubmission);
        });

        // Kết hợp với các bài nộp cục bộ chưa kịp đồng bộ (nếu có)
        const localSubs = getLocalSubmissions();
        const mergedMap = new Map<string, StudentSubmission>();

        // Ưu tiên nạp từ local trước
        localSubs.forEach((s) => {
          if (s && s.id) mergedMap.set(s.id, s);
        });

        // Ghi đè bằng dữ liệu chính xác từ Firestore
        firestoreSubs.forEach((s) => {
          if (s && s.id) mergedMap.set(s.id, s);
        });

        const mergedList = Array.from(mergedMap.values());

        // Sắp xếp bài nộp mới nhất lên đầu (theo submittedAt)
        mergedList.sort(
          (a, b) =>
            new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
        );

        // Lưu bền vững vào LocalStorage
        try {
          localStorage.setItem("edutest_submissions", JSON.stringify(mergedList));
        } catch {}

        callback(mergedList);
      },
      (err) => {
        console.warn("Firestore subscribeSubmissions fallback to local:", err);
        const fallback = getLocalSubmissions();
        callback(fallback);
        if (onError) onError(err);
      }
    );
  } catch (error) {
    console.warn("Firestore subscribeSubmissions error:", error);
    const fallback = getLocalSubmissions();
    callback(fallback);
    return () => {};
  }
};

export const saveSubmissionToFirestore = async (
  sub: StudentSubmission
): Promise<void> => {
  // 1. Cập nhật tức thì vào LocalStorage (Bảo đảm không bao giờ mất dù có ngắt mạng hay F5)
  try {
    const current = getLocalSubmissions();
    const filtered = current.filter((s) => s.id !== sub.id);
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

  // 3. Lưu bền vững vào Firebase Firestore
  try {
    const cleanSub = cleanForFirestore(sub);
    const ref = doc(db, SUBMISSIONS_COLLECTION, sub.id);
    await setDoc(ref, cleanSub, { merge: true });
  } catch (err) {
    console.warn("Lỗi khi lưu bài nộp lên Firestore (đã lưu cache an toàn):", err);
  }
};

export const deleteSubmissionFromFirestore = async (
  subId: string
): Promise<void> => {
  try {
    const current = getLocalSubmissions();
    const updated = current.filter((s) => s.id !== subId);
    localStorage.setItem("edutest_submissions", JSON.stringify(updated));
  } catch {}

  try {
    const ref = doc(db, SUBMISSIONS_COLLECTION, subId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi khi xóa bài nộp trên Firestore:", err);
  }
};

export const seedInitialSubmissions = async (): Promise<void> => {
  try {
    for (const sub of initialSampleSubmissions) {
      const cleanSub = cleanForFirestore(sub);
      const ref = doc(db, SUBMISSIONS_COLLECTION, sub.id);
      await setDoc(ref, cleanSub, { merge: true });
    }
    try {
      localStorage.setItem("edutest_submissions", JSON.stringify(initialSampleSubmissions));
    } catch {}
  } catch (err) {
    console.warn("Lỗi nạp bài nộp mẫu:", err);
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

export const updateLiveRoomInFirestore = async (
  pin: string,
  data: Partial<LiveRoom>
): Promise<void> => {
  try {
    const cleanData = cleanForFirestore(data);
    const ref = doc(db, LIVEROOMS_COLLECTION, pin);
    await setDoc(ref, cleanData, { merge: true });
  } catch (err) {
    console.warn("Lỗi cập nhật LiveRoom lên Firestore:", err);
  }
};
