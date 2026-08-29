import { Question } from "../types/exam";
import { defaultExam001 } from "./defaultExam";

export interface PracticeChapterInfo {
  id: string;
  grade: string;
  name: string;
  description: string;
  topics: string[];
}

// Ngân hàng câu hỏi bổ sung chất lượng cao chuẩn Toán THPT (Lớp 10, 11, 12)
// Đầy đủ 4 dạng thức thi mới: Trắc nghiệm 4 lựa chọn, Đúng-Sai 4 ý, Trả lời ngắn, Tự luận
export const practiceQuestionBank: Record<string, Question[]> = {
  // === LỚP 12 - CHƯƠNG 1: ỨNG DỤNG ĐẠO HÀM KHẢO SÁT HÀM SỐ ===
  "12_c1": [
    {
      id: "pr_12_c1_q1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho hàm số $y = f(x)$ có bảng biến thiên như sau:\n\n$$\\begin{array}{c|ccccccc} x & -\\infty & & -1 & & 2 & & +\\infty \\\\ \\hline f'(x) & & + & 0 & - & 0 & + & \\\\ \\hline f(x) & & \\nearrow & 3 & \\searrow & -2 & \\nearrow & \\end{array}$$\n\nHàm số đã cho đồng biến trên khoảng nào dưới đây?",
      options: [
        { label: "A", text: "$(-1; 2)$", isCorrect: false },
        { label: "B", text: "$(-\\infty; -1)$", isCorrect: true },
        { label: "C", text: "$(-2; 3)$", isCorrect: false },
        { label: "D", text: "$(-1; +\\infty)$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Dựa vào bảng biến thiên, ta thấy $f'(x) > 0$ trên các khoảng $(-\\infty; -1)$ và $(2; +\\infty)$, do đó hàm số đồng biến trên các khoảng $(-\\infty; -1)$ và $(2; +\\infty)$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Tính đơn điệu của hàm số",
    },
    {
      id: "pr_12_c1_q2",
      title: "Câu 2",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Tìm giá trị lớn nhất của hàm số $f(x) = x^3 - 3x + 2$ trên đoạn $[0; 2]$.",
      options: [
        { label: "A", text: "$\\max_{[0; 2]} f(x) = 2$", isCorrect: false },
        { label: "B", text: "$\\max_{[0; 2]} f(x) = 0$", isCorrect: false },
        { label: "C", text: "$\\max_{[0; 2]} f(x) = 4$", isCorrect: true },
        { label: "D", text: "$\\max_{[0; 2]} f(x) = 1$", isCorrect: false },
      ],
      correctAnswer: "C",
      explanation: "Ta có $f'(x) = 3x^2 - 3 = 3(x^2 - 1)$. $f'(x) = 0 \\Leftrightarrow x = 1$ (vì $x \\in [0; 2]$). Tính giá trị tại các mút và điểm tới hạn: $f(0) = 2, f(1) = 0, f(2) = 8 - 6 + 2 = 4$. Vậy giá trị lớn nhất là $4$ tại $x = 2$.",
      score: 0.25,
      difficulty: "medium",
      topic: "Giá trị lớn nhất và nhỏ nhất",
    },
    {
      id: "pr_12_c1_q3",
      title: "Câu 3",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: "Cho hàm số $y = \\frac{2x - 1}{x + 1}$ có đồ thị $(C)$. Xét tính đúng/sai của các mệnh đề sau:",
      tfItems: [
        { label: "a", text: "Đồ thị $(C)$ có đường tiệm cận đứng là đường thẳng $x = -1$.", isCorrect: true, explanation: "Vì $\\lim_{x \\to -1^+} \\frac{2x - 1}{x + 1} = -\\infty$ nên $x = -1$ là tiệm cận đứng." },
        { label: "b", text: "Đồ thị $(C)$ có đường tiệm cận ngang là đường thẳng $y = -1$.", isCorrect: false, explanation: "Tiệm cận ngang là đường thẳng $y = \\lim_{x \\to \\pm\\infty} \\frac{2x - 1}{x + 1} = 2$, không phải $y = -1$." },
        { label: "c", text: "Hàm số đồng biến trên từng khoảng xác định $(-\\infty; -1)$ và $(-1; +\\infty)$.", isCorrect: true, explanation: "Ta có $y' = \\frac{2(1) - (-1)(1)}{(x+1)^2} = \\frac{3}{(x+1)^2} > 0, \\forall x \\ne -1$. Do đó hàm số luôn đồng biến trên $(-\\infty; -1)$ và $(-1; +\\infty)$." },
        { label: "d", text: "Giao điểm của hai đường tiệm cận là tâm đối xứng của đồ thị có toạ độ $I(1; 2)$.", isCorrect: false, explanation: "Tâm đối xứng là giao điểm của hai tiệm cận: $x = -1, y = 2 \\Rightarrow I(-1; 2)$." },
      ],
      explanation: "a) Đúng ($x = -1$), b) Sai (tiệm cận ngang $y = 2$), c) Đúng ($y' = \\frac{3}{(x+1)^2} > 0$), d) Sai ($I(-1; 2)$).",
      score: 1.0,
      difficulty: "medium",
      topic: "Đường tiệm cận và khảo sát hàm phân thức",
    },
    {
      id: "pr_12_c1_q4",
      title: "Câu 4",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Một công ty sản xuất muốn thiết kế một bể chứa nước hình hộp chữ nhật không nắp có thể tích $V = 32\\text{ m}^3$, đáy là hình vuông cạnh $x\\text{ (m)}$, chiều cao $h\\text{ (m)}$. Tìm độ dài cạnh đáy $x$ (theo mét) sao cho diện tích toàn phần của bể (diện tích các mặt cần xây dựng) đạt giá trị nhỏ nhất.",
      correctAnswer: "4",
      explanation: "Thể tích $V = x^2 h = 32 \\Rightarrow h = \\frac{32}{x^2}$.\nDiện tích toàn phần (không nắp) là $S(x) = x^2 + 4xh = x^2 + 4x \\cdot \\frac{32}{x^2} = x^2 + \\frac{128}{x}$ với $x > 0$.\nĐạo hàm: $S'(x) = 2x - \\frac{128}{x^2} = \\frac{2x^3 - 128}{x^2}$.\n$S'(x) = 0 \\Leftrightarrow x^3 = 64 \\Leftrightarrow x = 4$.\nLập bảng biến thiên thấy $S(x)$ đạt giá trị nhỏ nhất tại $x = 4\\text{ (m)}$.",
      score: 0.5,
      difficulty: "hard",
      topic: "Bài toán thực tế ứng dụng đạo hàm",
    }
  ],

  // === LỚP 12 - CHƯƠNG 2: VECTƠ VÀ TỌA ĐỘ TRONG KHÔNG GIAN OXYZ ===
  "12_c2": defaultExam001.questions,

  // === LỚP 12 - CHƯƠNG 3: CÁC SỐ ĐẶC TRƯNG ĐO MỨC ĐỘ PHÂN TÁN ===
  "12_c3": [
    {
      id: "pr_12_c3_q1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho mẫu số liệu ghép nhóm về thời gian tự học mỗi ngày của 40 học sinh như sau:\n\n$$\\begin{array}{|c|c|c|c|c|c|} \\hline \\text{Thời gian (phút)} & [0; 30) & [30; 60) & [60; 90) & [90; 120) & [120; 150) \\\\ \\hline \\text{Số học sinh} & 4 & 10 & 16 & 8 & 2 \\\\ \\hline \\end{array}$$\n\nKhoảng biến thiên của mẫu số liệu ghép nhóm trên bằng bao nhiêu?",
      options: [
        { label: "A", text: "$120$", isCorrect: false },
        { label: "B", text: "$150$", isCorrect: true },
        { label: "C", text: "$140$", isCorrect: false },
        { label: "D", text: "$30$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Khoảng biến thiên của mẫu số liệu ghép nhóm là hiệu giữa đầu mút phải của nhóm cuối cùng và đầu mút trái của nhóm đầu tiên: $R = 150 - 0 = 150$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Khoảng biến thiên và khoảng tứ phân vị",
    },
    {
      id: "pr_12_c3_q2",
      title: "Câu 2",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Tính giá trị trung bình $\\bar{x}$ của mẫu số liệu ghép nhóm sau (kết quả làm tròn đến chữ số thập phân thứ nhất):\n\n$$\\begin{array}{|c|c|c|c|c|} \\hline \\text{Nhóm} & [20; 30) & [30; 40) & [40; 50) & [50; 60) \\\\ \\hline \\text{Tần số} & 5 & 12 & 18 & 5 \\\\ \\hline \\end{array}$$",
      correctAnswer: "39.5",
      tolerance: 0.1,
      explanation: "Giá trị đại diện các nhóm lần lượt là: $c_1 = 25, c_2 = 35, c_3 = 45, c_4 = 55$.\nTổng số mẫu $n = 5 + 12 + 18 + 5 = 40$.\nSố trung bình $\\bar{x} = \\frac{5 \\cdot 25 + 12 \\cdot 35 + 18 \\cdot 45 + 5 \\cdot 55}{40} = \\frac{125 + 420 + 810 + 275}{40} = \\frac{1630}{40} = 39.5$.",
      score: 0.5,
      difficulty: "medium",
      topic: "Số trung bình mẫu ghép nhóm",
    }
  ],

  // === LỚP 11 - CHƯƠNG 1: HÀM SỐ LƯỢNG GIÁC VÀ PHƯƠNG TRÌNH LƯỢNG GIÁC ===
  "11_c1": [
    {
      id: "pr_11_c1_q1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Tập xác định của hàm số $y = \\tan x$ là:",
      options: [
        { label: "A", text: "$\\mathbb{R} \\setminus \\{k\\pi, k \\in \\mathbb{Z}\\}$", isCorrect: false },
        { label: "B", text: "$\\mathbb{R} \\setminus \\left\\{\\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z}\\right\\}$", isCorrect: true },
        { label: "C", text: "$\\mathbb{R} \\setminus \\left\\{\\frac{\\pi}{2} + k2\\pi, k \\in \\mathbb{Z}\\right\\}$", isCorrect: false },
        { label: "D", text: "$\\mathbb{R}$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Hàm số $y = \\tan x = \\frac{\\sin x}{\\cos x}$ xác định khi $\\cos x \\ne 0 \\Leftrightarrow x \\ne \\frac{\\pi}{2} + k\\pi \\;(k \\in \\mathbb{Z})$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Tập xác định hàm số lượng giác",
    },
    {
      id: "pr_11_c1_q2",
      title: "Câu 2",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Tìm số nghiệm của phương trình $\\sin 2x = \\frac{1}{2}$ thuộc khoảng $(0; 2\\pi)$.",
      correctAnswer: "4",
      explanation: "Ta có $\\sin 2x = \\sin \\frac{\\pi}{6} \\Leftrightarrow \\left[\\begin{array}{l} 2x = \\frac{\\pi}{6} + k2\\pi \\\\ 2x = \\frac{5\\pi}{6} + k2\\pi \\end{array}\\right. \\Leftrightarrow \\left[\\begin{array}{l} x = \\frac{\\pi}{12} + k\\pi \\\\ x = \\frac{5\\pi}{12} + k\\pi \\end{array}\\right.$\nVới $x \\in (0; 2\\pi)$:\n- Nhánh 1: $k = 0 \\Rightarrow x = \\frac{\\pi}{12}$; $k = 1 \\Rightarrow x = \\frac{13\\pi}{12}$ (2 nghiệm).\n- Nhánh 2: $k = 0 \\Rightarrow x = \\frac{5\\pi}{12}$; $k = 1 \\Rightarrow x = \\frac{17\\pi}{12}$ (2 nghiệm).\nTổng cộng có 4 nghiệm phân biệt.",
      score: 0.5,
      difficulty: "medium",
      topic: "Phương trình lượng giác cơ bản",
    }
  ],

  // === LỚP 11 - CHƯƠNG 2: CẤP SỐ CỘNG VÀ CẤP SỐ NHÂN ===
  "11_c2": [
    {
      id: "pr_11_c2_q1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = 3$ và công sai $d = 2$. Giá trị của $u_5$ bằng:",
      options: [
        { label: "A", text: "$11$", isCorrect: true },
        { label: "B", text: "$13$", isCorrect: false },
        { label: "C", text: "$10$", isCorrect: false },
        { label: "D", text: "$15$", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "Công thức số hạng tổng quát của cấp số cộng: $u_n = u_1 + (n - 1)d \\Rightarrow u_5 = 3 + 4 \\cdot 2 = 11$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Cấp số cộng",
    },
    {
      id: "pr_11_c2_q2",
      title: "Câu 2",
      part: "part_3",
      partName: "PHẦN III (Trả lời ngắn)",
      type: "short_answer",
      content: "Cho cấp số nhân $(u_n)$ có $u_1 = 2$ và công bội $q = 3$. Tính tổng $S_5 = u_1 + u_2 + u_3 + u_4 + u_5$.",
      correctAnswer: "242",
      explanation: "Áp dụng công thức tổng $n$ số hạng đầu của cấp số nhân:\n$$S_n = \\frac{u_1(1 - q^n)}{1 - q} \\Rightarrow S_5 = \\frac{2(1 - 3^5)}{1 - 3} = \\frac{2(1 - 243)}{-2} = 242.$$",
      score: 0.5,
      difficulty: "medium",
      topic: "Cấp số nhân",
    }
  ],

  // === LỚP 10 - CHƯƠNG 1: MỆNH ĐỀ VÀ TẬP HỢP ===
  "10_c1": [
    {
      id: "pr_10_c1_q1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho hai tập hợp $A = [-2; 3)$ và $B = (1; 5]$. Xác định tập hợp $A \\cap B$.",
      options: [
        { label: "A", text: "$[-2; 5]$", isCorrect: false },
        { label: "B", text: "$(1; 3)$", isCorrect: true },
        { label: "C", text: "$[-2; 1]$", isCorrect: false },
        { label: "D", text: "$[3; 5]$", isCorrect: false },
      ],
      correctAnswer: "B",
      explanation: "Giao của hai tập hợp $A \\cap B = \\{x \\in \\mathbb{R} \\mid -2 \\le x < 3 \\text{ và } 1 < x \\le 5\\} = (1; 3)$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Các phép toán trên tập hợp",
    },
    {
      id: "pr_10_c1_q2",
      title: "Câu 2",
      part: "part_2",
      partName: "PHẦN II (Đúng-Sai)",
      type: "true_false",
      content: "Cho mệnh đề $P: \"\\forall x \\in \\mathbb{R}, x^2 - 2x + 3 > 0\"$. Xét tính đúng/sai của các mệnh đề sau:",
      tfItems: [
        { label: "a", text: "Mệnh đề phủ định của $P$ là $\\bar{P}: \"\\exists x \\in \\mathbb{R}, x^2 - 2x + 3 \\le 0\"$.", isCorrect: true, explanation: "Phủ định của $\\forall$ là $\\exists$ và phủ định của $>$ là $\\le$." },
        { label: "b", text: "Tam thức bậc hai $f(x) = x^2 - 2x + 3$ có biệt thức $\\Delta = -8 < 0$.", isCorrect: true, explanation: "$\\Delta = (-2)^2 - 4(1)(3) = 4 - 12 = -8 < 0$." },
        { label: "c", text: "Mệnh đề $P$ là mệnh đề SAI.", isCorrect: false, explanation: "Vì $a = 1 > 0$ và $\\Delta < 0$ nên $f(x) > 0, \\forall x \\in \\mathbb{R}$. Do đó $P$ là mệnh đề ĐÚNG." },
        { label: "d", text: "Phương trình $x^2 - 2x + 3 = 0$ có 2 nghiệm thực phân biệt.", isCorrect: false, explanation: "Vì $\\Delta = -8 < 0$ nên phương trình vô nghiệm trên tập số thực $\\mathbb{R}$." },
      ],
      explanation: "a) Đúng, b) Đúng ($\\Delta = -8$), c) Sai (P đúng), d) Sai (vô nghiệm).",
      score: 1.0,
      difficulty: "medium",
      topic: "Mệnh đề logic và phủ định",
    }
  ],

  // === LỚP 10 - CHƯƠNG 4: HỆ THỨC LƯỢNG TRONG TAM GIÁC ===
  "10_c4": [
    defaultExam001.questions[defaultExam001.questions.length - 2] || {
      id: "pr_10_c4_q1",
      title: "Câu 1",
      part: "part_1",
      partName: "PHẦN I (Trắc nghiệm)",
      type: "single_choice",
      content: "Cho tam giác $ABC$ có $a = 6, b = 8$ và góc xen giữa $\\widehat{C} = 60^\\circ$. Độ dài cạnh $c$ bằng:",
      options: [
        { label: "A", text: "$2\\sqrt{13}$", isCorrect: true },
        { label: "B", text: "$2\\sqrt{37}$", isCorrect: false },
        { label: "C", text: "$10$", isCorrect: false },
        { label: "D", text: "$4\\sqrt{3}$", isCorrect: false },
      ],
      correctAnswer: "A",
      explanation: "Theo định lý côsin: $c^2 = a^2 + b^2 - 2ab\\cos C = 6^2 + 8^2 - 2 \\cdot 6 \\cdot 8 \\cdot \\cos 60^\\circ = 36 + 64 - 96 \\cdot 0.5 = 100 - 48 = 52 \\Rightarrow c = \\sqrt{52} = 2\\sqrt{13}$.",
      score: 0.25,
      difficulty: "easy",
      topic: "Định lý Côsin",
    }
  ]
};

export interface ChapterMeta {
  key: string;
  grade: string;
  code: string;
  title: string;
  subtitle: string;
  iconName: string;
  badgeColor: string;
}

export const CHAPTER_CATALOG: ChapterMeta[] = [
  // LỚP 12
  {
    key: "12_c1",
    grade: "Lớp 12",
    code: "CHƯƠNG 1",
    title: "Ứng dụng đạo hàm khảo sát hàm số",
    subtitle: "Đơn điệu, Cực trị, GTLN-GTNN, Tiệm cận, Đồ thị",
    iconName: "TrendingUp",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    key: "12_c2",
    grade: "Lớp 12",
    code: "CHƯƠNG 2",
    title: "Vectơ và Hệ tọa độ Oxyz trong không gian",
    subtitle: "Vectơ không gian, Tọa độ điểm, Tích vô hướng, Hình hộp",
    iconName: "Layers",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "12_c3",
    grade: "Lớp 12",
    code: "CHƯƠNG 3",
    title: "Số đặc trưng đo mức độ phân tán ghép nhóm",
    subtitle: "Khoảng biến thiên, Khoảng tứ phân vị, Phương sai, Độ lệch chuẩn",
    iconName: "BarChart2",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "12_c4",
    grade: "Lớp 12",
    code: "CHƯƠNG 4",
    title: "Nguyên hàm, Tích phân & Ứng dụng",
    subtitle: "Tính nguyên hàm, Tích phân từng phần, Diện tích & Thể tích",
    iconName: "Sparkles",
    badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    key: "12_c5",
    grade: "Lớp 12",
    code: "CHƯƠNG 5",
    title: "Phương pháp tọa độ trong không gian Oxyz",
    subtitle: "Phương trình Mặt phẳng, Đường thẳng, Mặt cầu",
    iconName: "BrainCircuit",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "12_c6",
    grade: "Lớp 12",
    code: "CHƯƠNG 6",
    title: "Xác suất có điều kiện & Công thức Bayes",
    subtitle: "Công thức nhân xác suất, Xác suất toàn phần, Bayes",
    iconName: "PieChart",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },

  // LỚP 11
  {
    key: "11_c1",
    grade: "Lớp 11",
    code: "CHƯƠNG 1",
    title: "Hàm số lượng giác & Phương trình lượng giác",
    subtitle: "Tập xác định, Chu kỳ, Công thức lượng giác, PT cơ bản",
    iconName: "Activity",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    key: "11_c2",
    grade: "Lớp 11",
    code: "CHƯƠNG 2",
    title: "Dãy số, Cấp số cộng & Cấp số nhân",
    subtitle: "Số hạng tổng quát, Tính đơn điệu, Tổng n số hạng đầu",
    iconName: "ListOrdered",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    key: "11_c4",
    grade: "Lớp 11",
    code: "CHƯƠNG 4",
    title: "Quan hệ song song trong không gian",
    subtitle: "Đường thẳng & Mặt phẳng song song, Hai mặt phẳng song song",
    iconName: "Maximize2",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    key: "11_c7",
    grade: "Lớp 11",
    code: "CHƯƠNG 7",
    title: "Đạo hàm & Ứng dụng",
    subtitle: "Quy tắc tính đạo hàm, Đạo hàm cấp hai, Tiếp tuyến",
    iconName: "Flame",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },

  // LỚP 10
  {
    key: "10_c1",
    grade: "Lớp 10",
    code: "CHƯƠNG 1",
    title: "Mệnh đề & Tập hợp",
    subtitle: "Mệnh đề chứa biến, Phủ định, Hợp, Giao, Hiệu tập hợp",
    iconName: "CheckCircle",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    key: "10_c2",
    grade: "Lớp 10",
    code: "CHƯƠNG 2",
    title: "Bất phương trình bậc nhất hai ẩn",
    subtitle: "Miền nghiệm, Hệ BPT, Tối ưu hóa giá trị thực tế F(x, y)",
    iconName: "Compass",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "10_c4",
    grade: "Lớp 10",
    code: "CHƯƠNG 4",
    title: "Hệ thức lượng trong tam giác",
    subtitle: "Định lý Côsin, Định lý Sin, Công thức diện tích, Bán kính R-r",
    iconName: "Triangle",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    key: "10_c5",
    grade: "Lớp 10",
    code: "CHƯƠNG 5",
    title: "Vectơ & Các phép toán vectơ Oxy",
    subtitle: "Cộng trừ vectơ, Tích vectơ với số, Tích vô hướng",
    iconName: "Move",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

/**
 * Lấy tất cả câu hỏi thuộc một chương cụ thể (kết hợp từ ngân hàng câu hỏi và các đề thi trong hệ thống)
 */
export const getQuestionsForChapter = (
  chapterKey: string,
  allExams: { questions?: Question[]; chapter?: string; grade?: string }[]
): Question[] => {
  const list: Question[] = [];
  const addedIds = new Set<string>();

  // 1. Lấy từ ngân hàng câu hỏi định sẵn
  const predefined = practiceQuestionBank[chapterKey] || [];
  predefined.forEach((q) => {
    if (!addedIds.has(q.id)) {
      addedIds.add(q.id);
      list.push(q);
    }
  });

  // 2. Quét từ tất cả đề thi hiện có trong hệ thống khớp với khối hoặc tên chương
  const chapterMeta = CHAPTER_CATALOG.find((c) => c.key === chapterKey);
  if (chapterMeta) {
    allExams.forEach((exam) => {
      if (
        (exam.grade === chapterMeta.grade && exam.chapter && exam.chapter.includes(chapterMeta.code)) ||
        (exam.chapter && exam.chapter.toLowerCase().includes(chapterMeta.title.toLowerCase())) ||
        (exam.grade === chapterMeta.grade && !exam.chapter)
      ) {
        (exam.questions || []).forEach((q) => {
          if (!addedIds.has(q.id)) {
            addedIds.add(q.id);
            list.push(q);
          }
        });
      }
    });
  }

  return list;
};
