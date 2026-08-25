import { Exam, Question } from "../types/exam";

// Nạp bộ câu hỏi phong phú từ Đề 12-02-01-01 (Vectơ & Tọa độ trong không gian Oxyz)
export const defaultExam001: Exam = {
  id: "exam_001",
  code: "12-02-01-01",
  title: "Đề Kiểm Tra Cơ Bản: Vectơ Và Tọa Độ Trong Không Gian",
  subject: "Toán học",
  grade: "Lớp 12",
  chapter: "Chương 2: Vectơ và Hệ trục toạ độ trong không gian Oxyz",
  durationMinutes: 90,
  totalScore: 10,
  author: "Thầy Phương - Hệ thống Yoututu",
  description: "Đề kiểm tra cấu trúc 4 dạng thức chuẩn: Trắc nghiệm 4 lựa chọn, Đúng/Sai 4 ý, Trả lời ngắn, và Tự luận có barem chi tiết.",
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  questions: [
    // ================= PHẦN I: TRẮC NGHIỆM =================
    {
      id: "q_p1_1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: `Cho hình hộp \${ABCD.EFGH}\$. Các véctơ có điểm đầu và điểm cuối là các đỉnh của hình hộp và bằng véctơ $\\overrightarrow{GB}$ là các véctơ nào sau đây?
\\begin{center}
\\begin{tikzpicture}[scale=0.8] 
\\coordinate (A) at (0,0)   node at (A) [left] {$A$};
\\coordinate (B) at (-1,-1) node at (B) [left] {$B$};
\\coordinate (C) at (3,-1)  node at (C) [right] {$C$};
\\coordinate (D) at (4,0)   node at (D) [right] {$D$};
\\coordinate (E) at (0,2)   node at (E) [left] {$E$};
\\coordinate (F) at (-1,1) node at (F) [left] {$F$};
\\coordinate (G) at (3,1)  node at (G) [right] {$G$};
\\coordinate (H) at (4,2)   node at (H) [right] {$H$};
\\draw [dashed] (B)--(A)--(D) (E)--(A);
\\draw (E)--(F)--(G)--(H)--(E) (F)--(B) (G)--(C) (H)--(D);
\\draw (B)--(C)--(D);
\\end{tikzpicture}
\\end{center}`,
      options: [
        { label: "A", text: "$\\overrightarrow{HA}$", isCorrect: true },
        { label: "B", text: "$\\overrightarrow{DE}$", isCorrect: false },
        { label: "C", text: "$\\overrightarrow{HE}$", isCorrect: false },
        { label: "D", text: "$\\overrightarrow{EH}$", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "Trong hình hộp $ABCD.EFGH$, ta có tứ giác $ABGH$ là hình bình hành nên $\\overrightarrow{HA} = \\overrightarrow{GB}$. Do đó $\\overrightarrow{HA}$ là khẳng định đúng.",
      score: 0.25,
      difficulty: "easy",
      topic: "Vectơ không gian",
    },
    {
      id: "q_p1_2",
      title: "Câu 2",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: `Cho hình chóp \${S.ABDE}\$ có đáy là hình bình hành tâm \${I}\$. Gọi \${P}\$ là điểm thuộc đoạn \${SI}\$ sao cho \${P}\$ khác điểm \${S}\$ và điểm \${I}\$. Tìm khẳng định sai trong các khẳng định sau:
\\begin{center}
\\begin{tikzpicture}[line join=round, line cap=round,thick,scale=0.6]
\\coordinate (A) at (0,0); \\node at (A) [left]{$A$};
\\coordinate (E) at (2,-2); \\node at (E) [left]{$E$};
\\coordinate (B) at (5,0); \\node at (B) [right]{$B$};
\\coordinate (D) at ($(B)+(E)-(A)$); \\node at (D) [below]{$D$};
\\coordinate (O) at ($(A)!0.5!(D)$);
\\coordinate (S) at ($(O)+(0,5)$);
\\draw(S)--(A)  (S)--(D) (S)--(E) (A)--(E) (D)--(E) ;
\\draw[dashed,thin](S)--(B) (A)--(D) (A)--(B) (B)--(D)   (B)--(E);
\\foreach \\i/\\g in {S/90,A/180,B/-90,D/-90,E/0}{\\draw[fill=white](\\i) circle (1.5pt);}
\\end{tikzpicture}
\\end{center}`,
      options: [
        { label: "A", text: "$PB \\subset (SDE)$", isCorrect: true },
        { label: "B", text: "$SI \\subset (SAD)$", isCorrect: false },
        { label: "C", text: "$PB \\subset (SBE)$", isCorrect: false },
        { label: "D", text: "$P \\in (SBI)$", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "Vì $P \\in SI$ và $I$ là tâm hình bình hành $ABDE$ ($I = AD \\cap BE$), ta có $P, B \\in (SBE) \\equiv (SBI)$. Điểm $B \\notin (SDE)$ và đường thẳng $PB$ cắt mặt phẳng $(SDE)$ tại $E$ nếu kéo dài, không chứa trong $(SDE)$. Do đó khẳng định $PB \\subset (SDE)$ là khẳng định sai.",
      score: 0.25,
      difficulty: "medium",
      topic: "Hình học không gian - Vị trí tương đối",
    },
    {
      id: "q_p1_3",
      title: "Câu 3",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho hình hộp $ABCD.EFGH$. Tìm khẳng định đúng.",
      options: [
        { label: "A", text: "$\\overrightarrow{FB} + \\overrightarrow{FE} + \\overrightarrow{FG} = \\overrightarrow{FH}$", isCorrect: false },
        { label: "B", text: "$\\overrightarrow{FB} + \\overrightarrow{FE} + \\overrightarrow{FG} = \\overrightarrow{HF}$", isCorrect: false },
        { label: "C", text: "$\\overrightarrow{FB} + \\overrightarrow{FE} + \\overrightarrow{FG} = \\overrightarrow{FD}$", isCorrect: true },
        { label: "D", text: "$\\overrightarrow{FB} + \\overrightarrow{FE} + \\overrightarrow{FG} = \\overrightarrow{DF}$", isCorrect: false },
      ],
      correctAnswer: "C",
      explanation: "Theo quy tắc hình hộp xuất phát từ đỉnh $F$: Tổng 3 vectơ cạnh $\\overrightarrow{FB} + \\overrightarrow{FE} + \\overrightarrow{FG} = \\overrightarrow{FD}$ (đường chéo $FD$).",
      score: 0.25,
      difficulty: "easy",
      topic: "Quy tắc hình hộp",
    },
    {
      id: "q_p1_4",
      title: "Câu 4",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho tứ diện $ABCD$. Tìm khẳng định đúng.",
      options: [
        { label: "A", text: "$\\overrightarrow{AC} - \\overrightarrow{AD} = \\overrightarrow{BD} - \\overrightarrow{BC}$", isCorrect: false },
        { label: "B", text: "$\\overrightarrow{AD} - \\overrightarrow{AC} = \\overrightarrow{BD} - \\overrightarrow{BC}$", isCorrect: true },
        { label: "C", text: "$\\overrightarrow{BC} + \\overrightarrow{AB} = \\overrightarrow{DA} - \\overrightarrow{DC}$", isCorrect: false },
        { label: "D", text: "$\\overrightarrow{AB} - \\overrightarrow{AD} = \\overrightarrow{CD} + \\overrightarrow{BC}$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Ta có vế trái: $\\overrightarrow{AD} - \\overrightarrow{AC} = \\overrightarrow{CD}$. Vế phải: $\\overrightarrow{BD} - \\overrightarrow{BC} = \\overrightarrow{CD}$. Hai vế đều bằng $\\overrightarrow{CD}$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Quy tắc vectơ",
    },
    {
      id: "q_p1_5",
      title: "Câu 5",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho tứ diện $ABCD$. Gọi $H, I, K$ lần lượt là trung điểm của các đoạn $AB, AC, AD$. Tìm khẳng định đúng.",
      options: [
        { label: "A", text: "$\\overrightarrow{BA} - \\overrightarrow{CB} = 2\\overrightarrow{IB}$", isCorrect: false },
        { label: "B", text: "$\\overrightarrow{DA} + \\overrightarrow{DC} = 2\\overrightarrow{ID}$", isCorrect: false },
        { label: "C", text: "$\\overrightarrow{BA} + \\overrightarrow{BD} = -2\\overrightarrow{BK}$", isCorrect: false },
        { label: "D", text: "$\\overrightarrow{CB} - \\overrightarrow{AC} = 2\\overrightarrow{CH}$", isCorrect: true },
      ],
      correctAnswer: "D",
      explanation: "Ta có: $\\overrightarrow{CB} - \\overrightarrow{AC} = \\overrightarrow{CB} + \\overrightarrow{CA} = 2\\overrightarrow{CH}$ (vì $H$ là trung điểm của $AB$).",
      score: 0.25,
      difficulty: "medium",
      topic: "Quy tắc trung điểm",
    },
    {
      id: "q_p1_6",
      title: "Câu 6",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho hình lập phương $ABCD.EFGH$ có độ dài cạnh bằng $a$. Tính độ dài vectơ $\\vec{x} = \\overrightarrow{AF} + \\overrightarrow{AH}$ theo $a$.",
      options: [
        { label: "A", text: "$\\sqrt{3}a$", isCorrect: false },
        { label: "B", text: "$\\sqrt{2}a$", isCorrect: false },
        { label: "C", text: "$\\sqrt{6}a$", isCorrect: true },
        { label: "D", text: "$8a$", isCorrect: false },
      ],
      correctAnswer: "C",
      explanation: "Gọi $I$ là trung điểm của $FH$. Ta có: $|\\vec{x}| = |\\overrightarrow{AF} + \\overrightarrow{AH}| = |2\\overrightarrow{AI}|$. Tam giác $AFH$ đều có cạnh $AF = \\sqrt{2}a$, đường cao $AI = \\sqrt{2}a \\cdot \\frac{\\sqrt{3}}{2} = \\frac{\\sqrt{6}}{2}a$. Do đó $|\\vec{x}| = 2AI = \\sqrt{6}a$.",
      score: 0.25,
      difficulty: "medium",
      topic: "Độ dài vectơ",
    },
    {
      id: "q_p1_7",
      title: "Câu 7",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho hình chóp $S.ABEF$ có đáy $ABEF$ là hình bình hành tâm $I$. Tìm mệnh đề sai trong các mệnh đề sau:",
      options: [
        { label: "A", text: "$\\overrightarrow{AB} + \\overrightarrow{AF} = \\overrightarrow{AE}$", isCorrect: false },
        { label: "B", text: "$\\overrightarrow{SB} - \\overrightarrow{SE} = \\overrightarrow{SA} - \\overrightarrow{SF}$", isCorrect: false },
        { label: "C", text: "$\\overrightarrow{AE} + \\overrightarrow{BE} = \\overrightarrow{AB}$", isCorrect: true },
        { label: "D", text: "$\\overrightarrow{SA} - \\overrightarrow{SB} = \\overrightarrow{SF} - \\overrightarrow{SE}$", isCorrect: false },
      ],
      correctAnswer: "C",
      explanation: "$\\overrightarrow{AE} + \\overrightarrow{BE} \\ne \\overrightarrow{AB}$ vì $\\overrightarrow{AE} - \\overrightarrow{BE} = \\overrightarrow{AE} + \\overrightarrow{EB} = \\overrightarrow{AB}$. Mệnh đề C là mệnh đề sai.",
      score: 0.25,
      difficulty: "easy",
      topic: "Hình chóp và vectơ",
    },
    {
      id: "q_p1_8",
      title: "Câu 8",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho hình lập phương $ABCD.A'B'C'D'$. Góc giữa hai vectơ $\\overrightarrow{C'C}$ và $\\overrightarrow{DC'}$ bằng bao nhiêu?",
      options: [
        { label: "A", text: "$180^\\circ$", isCorrect: false },
        { label: "B", text: "$135^\\circ$", isCorrect: true },
        { label: "C", text: "$45^\\circ$", isCorrect: false },
        { label: "D", text: "$0^\\circ$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Ta có $\\overrightarrow{C'C} = \\overrightarrow{D'D}$. Góc $(\\overrightarrow{C'C}, \\overrightarrow{DC'}) = (\\overrightarrow{D'D}, \\overrightarrow{DC'}) = 180^\\circ - \\widehat{C'DD'} = 180^\\circ - 45^\\circ = 135^\\circ$.",
      score: 0.25,
      difficulty: "medium",
      topic: "Góc giữa 2 vectơ",
    },
    {
      id: "q_p1_9",
      title: "Câu 9",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho tứ diện đều $SBCD$ có cạnh bằng $6a$. Tính tích vô hướng $\\overrightarrow{BC} \\cdot \\overrightarrow{SD}$.",
      options: [
        { label: "A", text: "$-18a^2$", isCorrect: false },
        { label: "B", text: "$24a^2$", isCorrect: false },
        { label: "C", text: "$0$", isCorrect: true },
        { label: "D", text: "$42a^2$", isCorrect: false },
      ],
      correctAnswer: "C",
      explanation: "Trong tứ diện đều $SBCD$, hai cạnh đối diện luôn vuông góc nhau: $BC \\bot SD \\Rightarrow \\overrightarrow{BC} \\cdot \\overrightarrow{SD} = 0$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Tích vô hướng",
    },
    {
      id: "q_p1_10",
      title: "Câu 10",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Trong không gian $Oxyz$, cho vectơ $\\overrightarrow{b} = 3\\overrightarrow{i} + 8\\overrightarrow{j} + 6\\overrightarrow{k}$. Tìm tọa độ vectơ $\\overrightarrow{b}$.",
      options: [
        { label: "A", text: "$(3; 8; 6)$", isCorrect: true },
        { label: "B", text: "$(3; 8; 0)$", isCorrect: false },
        { label: "C", text: "$(3; -8; -6)$", isCorrect: false },
        { label: "D", text: "$(-3; -8; 6)$", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "Theo định nghĩa tọa độ vectơ trong hệ $Oxyz$, $\\overrightarrow{b} = x\\overrightarrow{i} + y\\overrightarrow{j} + z\\overrightarrow{k} \\Rightarrow \\overrightarrow{b} = (3; 8; 6)$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Tọa độ vectơ",
    },
    {
      id: "q_p1_11",
      title: "Câu 11",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Trong không gian $Oxyz$, cho hai điểm $C(4;5;5)$ và $D(6;-6;-8)$. Tìm tọa độ vectơ $\\overrightarrow{CD}$.",
      options: [
        { label: "A", text: "$(2; -11; -13)$", isCorrect: true },
        { label: "B", text: "$(10; -1; -3)$", isCorrect: false },
        { label: "C", text: "$(-2; 11; 13)$", isCorrect: false },
        { label: "D", text: "$(24; -30; -40)$", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "$\\overrightarrow{CD} = (x_D - x_C; y_D - y_C; z_D - z_C) = (6-4; -6-5; -8-5) = (2; -11; -13)$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Tọa độ đoạn thẳng",
    },
    {
      id: "q_p1_12",
      title: "Câu 12",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Trong không gian $Oxyz$, cho điểm $A(1;6;10)$. Tìm tọa độ hình chiếu của điểm $A$ trên mặt phẳng $(Oyz)$.",
      options: [
        { label: "A", text: "$(0; 6; 10)$", isCorrect: true },
        { label: "B", text: "$(1; 0; 10)$", isCorrect: false },
        { label: "C", text: "$(1; 6; 0)$", isCorrect: false },
        { label: "D", text: "$(1; 0; 0)$", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "Hình chiếu vuông góc của $A(x;y;z)$ lên mặt phẳng tọa độ $(Oyz)$ có tọa độ $(0; y; z) = (0; 6; 10)$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Hình chiếu vuông góc",
    },

    // ================= PHẦN II: ĐÚNG - SAI =================
    {
      id: "q_p2_1",
      title: "Câu 1",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: "Cho hình hộp chữ nhật $ABCD.A_1B_1C_1D_1$ có $A_1B_1 = 2a, A_1D_1 = \\sqrt{5}a, AA_1 = 4a$. Xét tính đúng - sai của các khẳng định sau:",
      tfItems: [
        { label: "a", text: "$\\overrightarrow{A_1D} + \\overrightarrow{CB_1} \\ne \\overrightarrow{0}$", isCorrect: false, explanation: "Ta có $\\overrightarrow{A_1D} + \\overrightarrow{CB_1} = \\overrightarrow{0}$ (vì $A_1D B_1 C$ là hình bình hành), khẳng định sai." },
        { label: "b", text: "$\\overrightarrow{A_1B_1} + \\overrightarrow{A_1D_1} + \\overrightarrow{A_1A} = \\overrightarrow{A_1C}$", isCorrect: true, explanation: "Theo quy tắc hình hộp, $\\overrightarrow{A_1B_1} + \\overrightarrow{A_1D_1} + \\overrightarrow{A_1A} = \\overrightarrow{A_1C}$ là đúng." },
        { label: "c", text: "$|\\overrightarrow{AB} + \\overrightarrow{AD}| = \\sqrt{10}a$", isCorrect: false, explanation: "$|\\overrightarrow{AB} + \\overrightarrow{AD}| = |\\overrightarrow{AC}| = \\sqrt{2^2 + (\\sqrt{5})^2}a = 3a \\ne \\sqrt{10}a$." },
        { label: "d", text: "$|\\overrightarrow{AB} + \\overrightarrow{BC} + \\overrightarrow{BB_1}| = 5a$", isCorrect: true, explanation: "$|\\overrightarrow{AB} + \\overrightarrow{BC} + \\overrightarrow{BB_1}| = |\\overrightarrow{AC_1}| = \\sqrt{2^2 + (\\sqrt{5})^2 + 4^2}a = 5a$ là đúng." },
      ],
      explanation: "a) Sai vì $\\overrightarrow{A_1D} + \\overrightarrow{CB_1} = \\overrightarrow{0}$.\nb) Đúng theo quy tắc hình hộp.\nc) Sai vì $|\\overrightarrow{AC}| = 3a$.\nd) Đúng vì độ dài đường chéo $AC_1 = \\sqrt{2^2 + 5 + 16}a = 5a$.",
      score: 1.0,
      difficulty: "medium",
      topic: "Hình hộp chữ nhật",
    },
    {
      id: "q_p2_2",
      title: "Câu 2",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: "Cho tứ diện đều $ABCD$ có cạnh bằng $2a$. Gọi $M$ là trung điểm của cạnh $BC$, $H$ là trọng tâm tam giác $BCD$. Xét tính đúng - sai của các khẳng định sau:",
      tfItems: [
        { label: "a", text: "$(\\overrightarrow{HB}, \\overrightarrow{HC}) = 45^\\circ$", isCorrect: false, explanation: "Trong tam giác đều $BCD$, góc $\\widehat{BHC} = 120^\\circ$, khẳng định sai." },
        { label: "b", text: "$\\overrightarrow{AB} \\cdot \\overrightarrow{AC} = 2a^2$", isCorrect: true, explanation: "$\\overrightarrow{AB} \\cdot \\overrightarrow{AC} = 2a \\cdot 2a \\cdot \\cos 60^\\circ = 2a^2$, khẳng định đúng." },
        { label: "c", text: "$\\overrightarrow{BC} \\cdot \\overrightarrow{AD} = 8a^2$", isCorrect: false, explanation: "Trong tứ diện đều, $BC \\bot AD \\Rightarrow \\overrightarrow{BC} \\cdot \\overrightarrow{AD} = 0$, khẳng định sai." },
        { label: "d", text: "$\\overrightarrow{AB} + \\overrightarrow{CD} + \\overrightarrow{BC} + \\overrightarrow{DA} = 2\\overrightarrow{BD}$", isCorrect: false, explanation: "Tổng $\\overrightarrow{AB} + \\overrightarrow{BC} + \\overrightarrow{CD} + \\overrightarrow{DA} = \\overrightarrow{AA} = \\vec{0}$, khẳng định sai." },
      ],
      explanation: "a) Sai vì góc bằng $120^\\circ$.\nb) Đúng: $2a \\cdot 2a \\cdot \\cos 60^\\circ = 2a^2$.\nc) Sai vì $BC \\bot AD \\Rightarrow \\overrightarrow{BC} \\cdot \\overrightarrow{AD} = 0$.\nd) Sai vì tổng bằng vectơ không.",
      score: 1.0,
      difficulty: "medium",
      topic: "Tứ diện đều",
    },
    {
      id: "q_p2_3",
      title: "Câu 3",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: "Một tháp trung tâm kiểm soát không lưu ở sân bay cao $61$ m sử dụng radar có phạm vi theo dõi $319$ km được đặt trên đỉnh tháp. Chọn hệ trục tọa độ $Oxyz$ với gốc $O$ trùng chân tháp, $Ox$ hướng Tây, $Oy$ hướng Nam, $Oz$ hướng thẳng đứng lên trên (đơn vị: km). Một máy bay tại vị trí $B$ cách mặt đất $20$ km, cách $256$ km về phía Đông và $126$ km về phía Bắc. Xét tính đúng - sai:",
      tfItems: [
        { label: "a", text: "Vị trí $B$ có tọa độ $(-256; -126; 20)$", isCorrect: true, explanation: "Đông là ngược hướng Tây ($x = -256$), Bắc là ngược hướng Nam ($y = -126$), cao $20$ km ($z = 20$), khẳng định đúng." },
        { label: "b", text: "Vị trí của radar có tọa độ là $(0; 0; 0.061)$", isCorrect: true, explanation: "Tháp cao $61$ m $= 0.061$ km đặt trên trục $Oz$, tọa độ $(0; 0; 0.061)$ đúng." },
        { label: "c", text: "Khoảng cách từ máy bay đến radar xấp xỉ bằng $286.02$ km", isCorrect: true, explanation: "$d = \\sqrt{(-256)^2 + (-126)^2 + (20 - 0.061)^2} \\approx 286.02$ km, khẳng định đúng." },
        { label: "d", text: "Radar của trung tâm kiểm soát không lưu phát hiện được máy bay tại vị trí $B$", isCorrect: true, explanation: "Khoảng cách $286.02$ km nhỏ hơn tầm quét $319$ km nên radar phát hiện được, đúng." },
      ],
      explanation: "Tất cả các khẳng định a, b, c, d đều đúng theo phân tích tọa độ không gian thực tế.",
      score: 1.0,
      difficulty: "hard",
      topic: "Toán ứng dụng thực tế Oxyz",
    },

    // ================= PHẦN III: TRẢ LỜI NGẮN =================
    {
      id: "q_p3_1",
      title: "Câu 1",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Nếu một vật có khối lượng $m$ (kg) thì trọng lực $\\overrightarrow{P} = m\\overrightarrow{g}$, trong đó $g = 9.8\\text{ m/s}^2$. Tính độ lớn của trọng lực tác dụng lên một vật có khối lượng $351$ gam (kết quả làm tròn đến hàng phần trăm).",
      correctAnswer: "3.44",
      tolerance: 0.02,
      explanation: "Đổi $m = 351\\text{ g} = 0.351\\text{ kg}$. Độ lớn trọng lực: $P = m \\cdot g = 0.351 \\cdot 9.8 = 3.4398\\text{ N} \\approx 3.44\\text{ N}$.",
      score: 0.5,
      difficulty: "easy",
      topic: "Vật lý toán - Vectơ lực",
    },
    {
      id: "q_p3_2",
      title: "Câu 2",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Ba lực $\\overrightarrow{F}_1, \\overrightarrow{F}_2, \\overrightarrow{F}_3$ cùng tác động vào một vật có phương đôi một vuông góc nhau và có độ lớn lần lượt là $1\\text{ N}, 4\\text{ N}, 1\\text{ N}$. Tính độ lớn hợp lực của ba lực đã cho (kết quả làm tròn đến hàng phần mười).",
      correctAnswer: "4.2",
      tolerance: 0.1,
      explanation: "Vì ba lực đôi một vuông góc nên độ lớn hợp lực là: $|\\overrightarrow{F}| = \\sqrt{F_1^2 + F_2^2 + F_3^2} = \\sqrt{1^2 + 4^2 + 1^2} = \\sqrt{18} = 3\\sqrt{2} \\approx 4.24\\text{ N} \\approx 4.2\\text{ N}$.",
      score: 0.5,
      difficulty: "medium",
      topic: "Hợp lực không gian",
    },
    {
      id: "q_p3_3",
      title: "Câu 3",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Cho hai vectơ $\\overrightarrow{u}$ và $\\overrightarrow{n}$ thỏa mãn $|\\overrightarrow{u}| = 2, |\\overrightarrow{n}| = 5$ và $\\overrightarrow{u} \\cdot \\overrightarrow{n} = 2.5$. Tính $|5\\overrightarrow{u} - \\overrightarrow{n}|$ (kết quả làm tròn đến hàng phần mười).",
      correctAnswer: "10.0",
      tolerance: 0.1,
      explanation: "$|5\\overrightarrow{u} - \\overrightarrow{n}|^2 = 25|\\overrightarrow{u}|^2 - 10(\\overrightarrow{u} \\cdot \\overrightarrow{n}) + |\\overrightarrow{n}|^2 = 25(4) - 10(2.5) + 25 = 100 - 25 + 25 = 100 \\Rightarrow |5\\overrightarrow{u} - \\overrightarrow{n}| = 10.0$.",
      score: 0.5,
      difficulty: "medium",
      topic: "Độ dài tổ hợp tuyến tính",
    },
    {
      id: "q_p3_4",
      title: "Câu 4",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Trong không gian $Oxyz$, cho hai điểm $E(-2;2;-6)$ và $B(3;-9;10)$. Biết điểm $K(a;b;c)$ thỏa mãn $E$ và $K$ đối xứng nhau qua $B$. Tính tổng $a+b+c$.",
      correctAnswer: "14",
      tolerance: 0.1,
      explanation: "$B$ là trung điểm của $EK \\Rightarrow x_K = 2x_B - x_E = 6 - (-2) = 8$; $y_K = 2(-9) - 2 = -20$; $z_K = 2(10) - (-6) = 26$. Vậy $K(8; -20; 26) \\Rightarrow a+b+c = 8 - 20 + 26 = 14$.",
      score: 0.5,
      difficulty: "easy",
      topic: "Điểm đối xứng",
    },

    // ================= PHẦN IV: TỰ LUẬN =================
    {
      id: "q_p4_1",
      title: "Câu 1",
      part: "part_4",
      partName: "PHẦN IV (Tự luận)",
      type: "essay",
      content: "Trong không gian với hệ tọa độ $Oxyz$, cho hình lập phương $ABCD.A'B'C'D'$ có cạnh bằng $a$, chọn gốc tọa độ trùng đỉnh $A$, các tia $Ox, Oy, Oz$ lần lượt chứa các cạnh $AB, AD, AA'$.\na) Xác định tọa độ tất cả các đỉnh của hình lập phương.\nb) Gọi $M, N$ lần lượt là trung điểm của $CC'$ và $A'D'$. Tính góc giữa hai đường thẳng $AM$ và $BN$.\nc) Tính khoảng cách từ điểm $B'$ đến mặt phẳng $(AMC')$.",
      rubric: "Barem điểm chi tiết:\n1. (0.5đ) Xác định đúng tọa độ 8 đỉnh: A(0,0,0), B(a,0,0), C(a,a,0), D(0,a,0), A'(0,0,a), B'(a,0,a), C'(a,a,a), D'(0,a,a).\n2. (0.75đ) Tọa độ M(a, a, a/2), N(0, a/2, a). Vectơ AM = (a, a, a/2), BN = (-a, a/2, a). Tích vô hướng AM.BN = -a^2 + a^2/2 + a^2/2 = 0 => Góc giữa AM và BN bằng 90 độ.\n3. (0.75đ) Lập phương trình mặt phẳng (AMC') hoặc dùng tích có hướng, tính đúng khoảng cách d(B', (AMC')) = a*sqrt(3)/3.",
      explanation: "a) $A(0;0;0), B(a;0;0), C(a;a;0), D(0;a;0), A'(0;0;a), B'(a;0;a), C'(a;a;a), D'(0;a;a)$.\nb) $M(a; a; \\frac{a}{2}), N(0; \\frac{a}{2}; a)$. Ta có $\\overrightarrow{AM} = (a; a; \\frac{a}{2}), \\overrightarrow{BN} = (-a; \\frac{a}{2}; a)$. Xét tích vô hướng: $\\overrightarrow{AM} \\cdot \\overrightarrow{BN} = -a^2 + \\frac{a^2}{2} + \\frac{a^2}{2} = 0 \\Rightarrow AM \\bot BN \\Rightarrow$ Góc bằng $90^\\circ$.\nc) Khoảng cách $d(B', (AMC')) = \\frac{a}{\\sqrt{3}} = \\frac{a\\sqrt{3}}{3}$.",
      score: 2.0,
      difficulty: "expert",
      topic: "Tự luận hình học không gian Oxyz",
    }
  ]
};

// Đề kiểm tra Lớp 12: Chương 1 - Ứng dụng đạo hàm (Bài 14, Lần 1: 12-01-14-01)
export const defaultExam002: Exam = {
  id: "exam_002",
  code: "12-01-14-01",
  title: "Đề Kiểm Tra: Ứng Dụng Đạo Hàm Khảo Sát Hàm Số",
  subject: "Toán học",
  grade: "Lớp 12",
  chapter: "Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
  durationMinutes: 45,
  totalScore: 10,
  author: "Tổ Toán THPT Chuyên",
  description: "Kiểm tra tính đơn điệu, cực trị, giá trị lớn nhất - nhỏ nhất và đường tiệm cận của đồ thị hàm số.",
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  questions: [
    {
      id: "q_002_1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho hàm số $y = f(x)$ có bảng xét dấu đạo hàm như sau:\n\n\\begin{center}\n\\begin{tabular}{|c|ccccccc|}\n\\hline\n$x$ & $-\\infty$ & & $-1$ & & $2$ & & $+\\infty$ \\\\\n\\hline\n$f'(x)$ & & $+$ & $0$ & $-$ & $0$ & $+$ & \\\\\n\\hline\n\\end{tabular}\n\\end{center}\n\nHàm số đã cho đồng biến trên khoảng nào dưới đây?",
      options: [
        { label: "A", text: "$(-1; 2)$", isCorrect: false },
        { label: "B", text: "$(-\\infty; -1)$", isCorrect: true },
        { label: "C", text: "$(-1; +\\infty)$", isCorrect: false },
        { label: "D", text: "$(-\\infty; 2)$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Dựa vào bảng xét dấu, $f'(x) > 0$ trên các khoảng $(-\\infty; -1)$ và $(2; +\\infty)$. Do đó hàm số đồng biến trên $(-\\infty; -1)$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Tính đơn điệu của hàm số",
    },
    {
      id: "q_002_2",
      title: "Câu 2",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Đường tiệm cận đứng của đồ thị hàm số $y = \\frac{2x - 1}{x + 1}$ có phương trình là:",
      options: [
        { label: "A", text: "$x = 2$", isCorrect: false },
        { label: "B", text: "$x = -1$", isCorrect: true },
        { label: "C", text: "$y = 2$", isCorrect: false },
        { label: "D", text: "$y = -1$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Mẫu số triệt tiêu tại $x = -1$ và tử số tại đó bằng $-3 \\ne 0$. Do đó $x = -1$ là đường tiệm cận đứng.",
      score: 0.25,
      difficulty: "easy",
      topic: "Đường tiệm cận",
    },
    {
      id: "q_002_3",
      title: "Câu 3",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: "Cho hàm số $y = x^3 - 3x^2 + 2$. Xét tính đúng/sai của các mệnh đề sau:",
      tfItems: [
        { label: "a", text: "Hàm số đạt cực đại tại điểm $x = 0$.", isCorrect: true, explanation: "$y' = 3x^2 - 6x = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. $y'' = 6x - 6 \\Rightarrow y''(0) = -6 < 0 \\Rightarrow$ Cực đại tại $x = 0$." },
        { label: "b", text: "Giá trị cực tiểu của hàm số bằng $-2$.", isCorrect: true, explanation: "Tại $x = 2$, $y(2) = 2^3 - 3(2^2) + 2 = 8 - 12 + 2 = -2$." },
        { label: "c", text: "Hàm số đồng biến trên khoảng $(0; 2)$.", isCorrect: false, explanation: "Trên khoảng $(0; 2)$, $y' < 0$ nên hàm số nghịch biến." },
        { label: "d", text: "Đồ thị hàm số nhận điểm $I(1; 0)$ làm tâm đối xứng.", isCorrect: true, explanation: "Điểm uốn $x = 1, y(1) = 0 \\Rightarrow I(1; 0)$ là tâm đối xứng của đồ thị bậc 3." },
      ],
      explanation: "a) Đúng, b) Đúng, c) Sai, d) Đúng.",
      score: 1.0,
      difficulty: "medium",
      topic: "Khảo sát hàm số bậc ba",
    },
    {
      id: "q_002_4",
      title: "Câu 4",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Tìm giá trị lớn nhất $M$ của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$.",
      correctAnswer: "11",
      tolerance: 0.1,
      explanation: "$f'(x) = 4x^3 - 4x = 0 \\Leftrightarrow x \\in \\{0, 1\\}$ trên $[0; 2]$. Ta có $f(0) = 3, f(1) = 2, f(2) = 11$. Vậy $M = 11$.",
      score: 0.5,
      difficulty: "medium",
      topic: "GTLN - GTNN",
    }
  ]
};

// Đề kiểm tra Lớp 11: Chương 1 - Hàm số lượng giác và Phương trình lượng giác (11-01-01-01)
export const defaultExam003: Exam = {
  id: "exam_003",
  code: "11-01-01-01",
  title: "Đề Kiểm Tra: Hàm Số Lượng Giác & Phương Trình Lượng Giác",
  subject: "Toán học",
  grade: "Lớp 11",
  chapter: "Chương 1: Hàm số lượng giác và Phương trình lượng giác",
  durationMinutes: 45,
  totalScore: 10,
  author: "Ban Chuyên môn Toán 11",
  description: "Kiểm tra tập xác định, chu kỳ tuần hoàn, tính chẵn lẻ và nghiệm phương trình lượng giác cơ bản.",
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  questions: [
    {
      id: "q_101_1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Tập xác định của hàm số $y = \\tan x$ là:",
      options: [
        { label: "A", text: "$\\mathbb{R} \\setminus \\{\\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z}\\}$", isCorrect: true },
        { label: "B", text: "$\\mathbb{R} \\setminus \\{k\\pi, k \\in \\mathbb{Z}\\}$", isCorrect: false },
        { label: "C", text: "$\\mathbb{R}$", isCorrect: false },
        { label: "D", text: "$[-1; 1]$", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "Hàm số $\\tan x = \\frac{\\sin x}{\\cos x}$ xác định khi $\\cos x \\ne 0 \\Leftrightarrow x \\ne \\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z}$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Tập xác định lượng giác",
    },
    {
      id: "q_101_2",
      title: "Câu 2",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: "Xét các phát biểu sau về hàm số và phương trình lượng giác:",
      tfItems: [
        { label: "a", text: "Hàm số $y = \\sin x$ là hàm số lẻ trên $\\mathbb{R}$.", isCorrect: true, explanation: "$\\sin(-x) = -\\sin x$ nên $y = \\sin x$ là hàm lẻ." },
        { label: "b", text: "Hàm số $y = \\cos x$ có chu kỳ tuần hoàn là $\\pi$.", isCorrect: false, explanation: "Hàm số $y = \\cos x$ có chu kỳ tuần hoàn là $2\\pi$." },
        { label: "c", text: "Phương trình $\\sin x = 2$ có vô số nghiệm thực.", isCorrect: false, explanation: "Vì $-1 \\le \\sin x \\le 1$ nên phương trình $\\sin x = 2$ vô nghiệm." },
        { label: "d", text: "Nghiệm của phương trình $\\cos x = 0$ là $x = \\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z}$.", isCorrect: true, explanation: "Công thức nghiệm đúng." },
      ],
      explanation: "a) Đúng, b) Sai, c) Sai, d) Đúng.",
      score: 1.0,
      difficulty: "medium",
      topic: "Lý thuyết lượng giác",
    },
    {
      id: "q_101_3",
      title: "Câu 3",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Số nghiệm của phương trình $\\sin 2x = 0$ trên đoạn $[0; 2\\pi]$ là bao nhiêu?",
      correctAnswer: "5",
      tolerance: 0.1,
      explanation: "$\\sin 2x = 0 \\Leftrightarrow 2x = k\\pi \\Leftrightarrow x = \\frac{k\\pi}{2}$. Trên đoạn $[0; 2\\pi]$, $x \\in \\{0, \\frac{\\pi}{2}, \\pi, \\frac{3\\pi}{2}, 2\\pi\\}$ gồm đúng 5 nghiệm.",
      score: 0.5,
      difficulty: "medium",
      topic: "Số nghiệm phương trình lượng giác",
    }
  ]
};

// Đề kiểm tra Lớp 10: Chương 1 - Mệnh đề và Tập hợp (10-01-01-01)
export const defaultExam004: Exam = {
  id: "exam_004",
  code: "10-01-01-01",
  title: "Đề Kiểm Tra: Mệnh Đề Và Tập Hợp",
  subject: "Toán học",
  grade: "Lớp 10",
  chapter: "Chương 1: Mệnh đề và Tập hợp",
  durationMinutes: 45,
  totalScore: 10,
  author: "Tổ Toán 10 THPT",
  description: "Kiểm tra mệnh đề phủ định, mệnh đề kéo theo, các phép toán giao, hợp, hiệu trên tập hợp và khoảng đoạn.",
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  questions: [
    {
      id: "q_201_1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Mệnh đề phủ định của mệnh đề $P: \"\\forall x \\in \\mathbb{R}, x^2 + 1 > 0\"$ là:",
      options: [
        { label: "A", text: "\"$\\exists x \\in \\mathbb{R}, x^2 + 1 \\le 0$\"", isCorrect: true },
        { label: "B", text: "\"$\\exists x \\in \\mathbb{R}, x^2 + 1 < 0$\"", isCorrect: false },
        { label: "C", text: "\"$\\forall x \\in \\mathbb{R}, x^2 + 1 \\le 0$\"", isCorrect: false },
        { label: "D", text: "\"$\\exists x \\in \\mathbb{R}, x^2 + 1 > 0$\"", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "Phủ định của $\\forall x \\in X, P(x)$ là $\\exists x \\in X, \\overline{P(x)}$. Vậy phủ định là $\\exists x \\in \\mathbb{R}, x^2 + 1 \\le 0$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Mệnh đề phủ định",
    },
    {
      id: "q_201_2",
      title: "Câu 2",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho hai tập hợp $A = [-2; 3]$ và $B = (1; 5)$. Tập hợp $A \\cap B$ bằng:",
      options: [
        { label: "A", text: "$[-2; 5)$", isCorrect: false },
        { label: "B", text: "$(1; 3]$", isCorrect: true },
        { label: "C", text: "$[-2; 1]$", isCorrect: false },
        { label: "D", text: "$(3; 5)$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Giao của hai tập hợp $[-2; 3] \\cap (1; 5) = (1; 3]$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Phép toán tập hợp",
    },
    {
      id: "q_201_3",
      title: "Câu 3",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Cho tập hợp $X = \\{x \\in \\mathbb{N} \\mid (x^2 - 4)(2x - 1) = 0\\}$. Số phần tử của tập hợp $X$ là bao nhiêu?",
      correctAnswer: "1",
      tolerance: 0.1,
      explanation: "$(x^2 - 4)(2x - 1) = 0 \\Leftrightarrow x = 2, x = -2$ hoặc $x = \\frac{1}{2}$. Vì $x \\in \\mathbb{N}$ nên chỉ có $x = 2$ thỏa mãn. Số phần tử bằng 1.",
      score: 0.5,
      difficulty: "easy",
      topic: "Số phần tử tập hợp",
    },
    {
      id: "q_201_4",
      title: "Câu 42",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: `Để đo khoảng cách từ vị trí $A$ trên bờ sông đến vị trí $B$ của một thân cây lớn trôi dạt bị mắc kẹt gần một cù lao giữa sông, bạn Linh đi dọc bờ sông từ vị trí $A$ đến vị trí $C$ cách $A$ một khoảng bằng $27\\text{ m}$ và đo các góc $\\widehat{BAC} = 56^\\circ$, $\\widehat{BCA} = 63^\\circ$. Xét tính đúng-sai của các khẳng định sau (làm tròn kết quả đến hàng đơn vị):
\\begin{center}
\\begin{tikzpicture}[scale=0.9, line join=round, line cap=round]
\\tkzDefPoints{0/0/A, 5.5/0/C, 2.5/3.7/B}
\\tkzDrawPolygon(A,B,C)
\\tkzDrawPoints(A,B,C)
\\tkzLabelPoints[below left](A)
\\tkzLabelPoints[below right](C)
\\tkzLabelPoints[above](B)
\\tkzMarkAngle[size=0.75cm, arc=l](C,A,B)
\\tkzLabelAngle[pos=1.2](C,A,B){$56^\\circ$}
\\tkzMarkAngle[size=0.75cm, arc=ll](B,C,A)
\\tkzLabelAngle[pos=1.2](B,C,A){$63^\\circ$}
\\tkzLabelSegment[below](A,C){$27\\text{ m}$}
\\end{tikzpicture}
\\end{center}`,
      tfItems: [
        { label: "a", text: "Góc $\\widehat{ABC} = 61^\\circ$.", isCorrect: true, explanation: "Tổng ba góc trong tam giác: $\\widehat{ABC} = 180^\\circ - 56^\\circ - 63^\\circ = 61^\\circ$." },
        { label: "b", text: "Khoảng cách từ $A$ đến thân cây $B$ xấp xỉ bằng $28\\text{ m}$.", isCorrect: true, explanation: "Áp dụng định lý sin trong tam giác $ABC$: $\\frac{AB}{\\sin \\widehat{BCA}} = \\frac{AC}{\\sin \\widehat{ABC}} \\Rightarrow AB = \\frac{27 \\cdot \\sin 63^\\circ}{\\sin 61^\\circ} \\approx 27.5 \\approx 28\\text{ m}$." },
        { label: "c", text: "Khoảng cách từ $C$ đến $B$ xấp xỉ bằng $30\\text{ m}$.", isCorrect: false, explanation: "$BC = \\frac{27 \\cdot \\sin 56^\\circ}{\\sin 61^\\circ} \\approx 25.6 \\approx 26\\text{ m}$." },
        { label: "d", text: "Bán kính đường tròn ngoại tiếp tam giác $ABC$ xấp xỉ bằng $15\\text{ m}$.", isCorrect: true, explanation: "$R = \\frac{AC}{2\\sin \\widehat{B}} = \\frac{27}{2\\sin 61^\\circ} \\approx 15.4 \\approx 15\\text{ m}$." },
      ],
      explanation: "a) Đúng ($61^\\circ$), b) Đúng ($AB \\approx 28\\text{ m}$), c) Sai ($BC \\approx 26\\text{ m}$), d) Đúng ($R \\approx 15\\text{ m}$).",
      score: 1.0,
      difficulty: "medium",
      topic: "Hệ thức lượng trong tam giác",
    },
    {
      id: "q_201_5",
      title: "Câu 43",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: `Hai người dân đứng cách nhau $30\\text{ m}$ cùng nhìn lên đỉnh $C$ của một tòa nhà theo góc nhìn lần lượt là $43^\\circ$ và $54^\\circ$ (tham khảo hình vẽ). Kết quả làm tròn đến hàng phần mười. Xét tính đúng-sai của các khẳng định sau:
\\begin{center}
\\begin{tikzpicture}[scale=1, font=\\footnotesize, line join=round, line cap=round, >=stealth]
\\foreach \\n in {0,1,...,2}
{
  \\node [rectangle,draw,minimum width=1cm,minimum height=1cm,pattern=north west lines] at (1.1*\\n cm, 0) {};
  \\node [rectangle,draw,minimum width=1cm,minimum height=1cm,pattern=dots] at (1.1*\\n cm, 1.1) {};
  \\node [rectangle,draw,minimum width=1cm,minimum height=1cm,pattern=north west lines] at (1.1*\\n cm, 2.1) {};
  \\node [rectangle,draw,minimum width=1cm,minimum height=1cm,pattern=dots] at (1.1*\\n cm, 3.1) {};
  \\node [rectangle,draw,minimum width=1cm,minimum height=1cm,pattern=north west lines] at (1.1*\\n cm, 4.1) {};
  \\node [rectangle,draw,minimum width=1cm,minimum height=1cm,pattern=dots] at (1.1*\\n cm, 5.1) {};
}
\\path 
(0,0) coordinate (E)
(6,-.5) coordinate (A)
(8,-.5) coordinate (B)
(2.7,5.6) coordinate (C)
(2.7,-.5) coordinate (H);
\\draw 
(H)--(B)--(C)
(C)--(A);
\\draw [<->](6,-.6)--(8,-.6)node[midway,below]{$30\\text{m}$};
\\draw pic[draw,double,angle eccentricity=2,angle radius=5mm]{angle=C--B--A};
\\draw pic[draw,angle eccentricity=2,angle radius=4mm]{angle=C--A--H};
\\node at ($(A)-(0.8,-0.5)$) {$54^\\circ$};
\\node at ($(B)-(0.8,-0.5)$) {$43^\\circ$};    
\\foreach \\i/\\g in {A/-90,B/-90,C/90,H/-90}
\\fill[black] (\\i) circle(1pt)+(\\g:4mm)node[scale=1]{$\\i$};
\\end{tikzpicture}
\\end{center}`,
      tfItems: [
        { label: "a", text: "Góc $\\widehat{ACB} = 11^\\circ$.", isCorrect: true, explanation: "Ta có $\\widehat{ACB} = \\widehat{CAH} - \\widehat{CBH} = 54^\\circ - 43^\\circ = 11^\\circ$." },
        { label: "b", text: "Độ dài đoạn $AC$ xấp xỉ bằng $107.2\\text{ m}$.", isCorrect: true, explanation: "Áp dụng định lý sin trong tam giác $ABC$: $\\frac{AC}{\\sin 43^\\circ} = \\frac{AB}{\\sin 11^\\circ} \\Rightarrow AC = \\frac{30 \\cdot \\sin 43^\\circ}{\\sin 11^\\circ} \\approx 107.2\\text{ m}$." },
        { label: "c", text: "Chiều cao tòa nhà $CH$ xấp xỉ bằng $86.7\\text{ m}$.", isCorrect: true, explanation: "Trong tam giác vuông $CAH$: $CH = AC \\cdot \\sin 54^\\circ \\approx 107.2 \\cdot \\sin 54^\\circ \\approx 86.7\\text{ m}$." },
        { label: "d", text: "Khoảng cách từ chân tòa nhà $H$ đến người đứng ở vị trí $A$ là $70\\text{ m}$.", isCorrect: false, explanation: "$AH = AC \\cdot \\cos 54^\\circ \\approx 107.2 \\cdot \\cos 54^\\circ \\approx 63.0\\text{ m}$." },
      ],
      explanation: "a) Đúng, b) Đúng, c) Đúng ($CH \\approx 86.7\\text{ m}$), d) Sai ($AH \\approx 63.0\\text{ m}$).",
      score: 1.0,
      difficulty: "hard",
      topic: "Hệ thức lượng trong tam giác",
    }
  ]
};

// Toàn bộ danh sách đề thi mẫu chuẩn đa lớp và đa chương
export const initialSampleExams: Exam[] = [
  defaultExam001,
  defaultExam002,
  defaultExam003,
  defaultExam004,
];
