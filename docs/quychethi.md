# Môn học: Các công nghệ mới trong phát triển phần mềm

# Lớp: CTK46-PM — Công nghệ thông tin, Khoá 46, Chuyên ngành Kỹ thuật phần

# mềm

# Hình thức thi: Báo cáo & Vấn đáp cá nhân

# Thời gian báo cáo: 5 phút thuyết trình + 5 phút vấn đáp

# 1. THÔNG TIN CHUNG

# 1.1. MỤC ĐÍCH

# Đồ án cuối kỳ nhằm đánh giá toàn diện năng lực của sinh viên trong việc vận dụng

# kiến thức và kỹ năng đã học để xây dựng một ứng dụng web full-stack hoàn chỉnh, từ

# thiết kế kiến trúc, triển khai trên môi trường production, đến báo cáo và bảo vệ trước

# giảng viên.

# 1.2. THÀNH PHẦN ĐIỂM CUỐI KỲ (Dự kiến)

```
Thành phần Tỷ lệ Mô tả
Báo cáo toàn văn 4 0% Tài liệu mô tả dự án đầy đủ
Sản phẩm (demo trực tiếp) 3 0% Ứng dụng hoạt động thực tế
Vấn đáp 30% Trả lời câu hỏi của giảng viên
```
**Lưu ý:** Tổng điểm cuối kỳ = Điểm báo cáo × 30% + Điểm sản phẩm × 40% + Điểm vấn đáp ×
30%. Điểm cuối kỳ chiếm **50%** tổng điểm môn học.

# 1.3. YÊU CẦU BẮT BUỘC

# Sinh viên phải đạt đủ các tiêu chí tối thiểu sau:

```
# Tiêu chí bắt buộc Mô tả
1	 Frontend: Next.JS (App
Router) + Tailwind CSS hoặc
shadcn/ui
```
```
Sử dụng	NextJS	+	Thư	
viện/Framework	CSS	
```

```
2	 Backend: Supabase (Auth +
Database)
```
```
Sử dụng đúng Supabase,
không thay bằng Firebase
hoặc custom backend
3	 Containerization: Dockerfile
+ Docker Compose
```
```
Ứng dụng phải được đóng gói
bằng Docker
4	 Deployment: Deploy lên
VPS với domain + SSL
```
```
Có URL thực, chạy được trên
internet (Khuyến nghị)
5	 Source code: GitHub
repository có commit history
```
```
Repository công khai hoặc
private với quyền truy cập
cho giảng viên
6	 AI tool: Sử dụng ít nhất 1 AI
tool trong quá trình phát triển
```
```
Có minh chứng (Bảng phụ lục
các prompts đã thực hiện +
giải thích tại sao dùng
prompts này, kết quả như thế
nào?...)
```
# 2. PHẠM VI NỘI DUNG

# 2.1. CÔNG NGHỆ BẮT BUỘC (THEO ĐỀ CƯƠNG)

```
Công nghệ Yêu cầu Ghi chú
Next.JS App Router, Server
Components, Client
Components, Data Fetching,
Server Actions
```
```
Không dùng Pages Router
```
```
TypeScript Sử dụng TypeScript thay vì
JavaScript thuần
```
```
Có type annotations rõ ràng
```
```
Supabase Auth + Database + ít nhất 1
tính năng bổ sung (Storage,
Realtime)
Tailwind CSS / shadcn/ui Thiết kế giao diện sạch sẽ,
chuyên nghiệp
```

```
Docker Dockerfile + Docker
Compose
```
```
Multi-stage build được
khuyến khích
VPS Deployment Domain + SSL (HTTPS) Có thể dùng Cloudflare +
reverse proxy. Khuyến nghị
sinh viên thực hiện để trải
nghiệm môi trường triển khai
thực tế
Git/GitHub Conventional Commits,
commit history rõ ràng
AI Tool GitHub Copilot, Gemini CLI,
hoặc tương đương
```
```
Có minh chứng (Bảng phụ lục
danh sách prompts đã thực
hiện, > 5 prompts)
```
# 2. 2. NGOÀI PHẠM VI

# • Không yêu cầu custom backend (Express.js, NestJS,...)

# • Không yêu cầu Kubernetes, CI/CD pipeline phức tạp

# • Không yêu cầu database ngoài Supabase (PostgreSQL riêng, MongoDB,...)

# 3. YÊU CẦU VỀ SẢN PHẨM

# 3.1. ĐỀ TÀI

# Sinh viên tự chọn đề tài phù hợp với các yêu cầu công nghệ bắt buộc ở mục 1.3. Đề

# tài cần thể hiện được sự am hiểu và vận dụng toàn bộ kiến thức đã học.

# 3.2. YÊU CẦU CHỨC NĂNG TỐI THIỂU

# Mỗi đề tài phải bao gồm đủ các tính năng sau:

```
# Tính năng Mô tả
1	 Authentication Đăng ký, đăng nhập, đăng xuất (Supabase Auth)
2	 CRUD dữ liệu Tạo, đọc, cập nhật, xóa bản ghi
3	 Giao diện người dùng Giao diện đẹp, responsive, sử dụng
Tailwind/shadcn/ui
```

```
4	 RLS / Phân quyền Chỉ người dùng được phép mới thao tác được dữ liệu
5	 File upload (tuỳ đề tài) Upload ảnh/tài liệu lên Supabase Storage (nếu phù
hợp đề tài)
6	 Dockerize Dockerfile + Docker Compose, chạy được bằng
docker compose up
7	 Deployment Deploy lên VPS, có domain, chứng chỉ SSL hoạt
động
```
# 3.3. YÊU CẦU VỀ BÁO CÁO TOÀN VĂN

# Báo cáo toàn văn cần trình bày 1 số nội dung sau (định dạng PDF, font Times New

# Roman 1 3 , spacing 1.5):

```
# Phần Nội dung Ghi chú
1	 Trang bìa Thông tin: môn học, lớp, họ tên, mã sinh
viên, ngày nộp
2	 Mục lục Danh sách các phần
3	 Giới thiệu Mô tả đề tài, bối cảnh, mục tiêu
4	 Công nghệ sử dụng Giới thiệu từng công nghệ và vai trò
trong dự án
5	 Kiến trúc hệ thống Sơ đồ kiến trúc, thiết kế database
(ERD/schema)
6	 Phân tích chức năng Mô tả chi tiết từng tính năng
7	 AI trong phát triển Mô tả cách sử dụng AI tool, minh chứng
8	 Docker & Deployment Dockerfile, Docker Compose, quy trình
deploy, domain/SSL
```
(^9) Kết luận & Hạn chế Tổng kết, hạn chế, hướng phát triển
(^10) Tài liệu tham khảo Danh sách tài liệu, documentation đã
tham khảo

# Độ dài tối thiểu: 20 trang (không tính screenshot lớn).


# 4. QUY TRÌNH NỘP BÀI

# 4.1. CÁC MỐC THỜI GIAN

```
# Mốc Thời hạn Nội dung
1	 Đăng ký đề tài 20/05/2026 Nhập tên đề tài + mô
tả ngắn lên Google
Sheets
2	 Nộp báo cáo + demo
link
```
```
29/05/2026 Nộp file báo cáo
(PDF/Word) + Link
demo + GitHub repo
3	 Báo cáo vấn đáp 30/05/2026 Thuyết trình 5 phút +
vấn đáp 5 phút
```
# 4.2. HÌNH THỨC NỘP

```
Thành phần Nơi nộp Ghi chú
Báo cáo toàn văn LMS của trường .pdf
Source code GitHub repository (public
hoặc private có quyền truy
cập)
Link demo URL production (VPS
domain)
```
```
Khuyến	khích
```
```
Minch chứng AI LMS của trường Nộp	phụ^ lục	kèm	theo^
```
# 5. QUY ĐỊNH TRONG BUỔI BÁO CÁO

# 5.1. THUYẾT TRÌNH (5 PHÚT)

# • Sinh viên trình bày cá nhân , không trình bày nhóm.

# • Nội dung trình bày: giới thiệu đề tài, kiến trúc, tính năng nổi bật, cách sử dụng AI

# trong quá trình phát triển.


# • Bắt buộc demo trực tiếp trên URL production (điểm thấp hơn nếu dùng video

# demo).

# 5.2. VẤN ĐÁP (5 PHÚT)

# • Giảng viên hỏi về các nội dung: kiến trúc, công nghệ sử dụng, quyết định thiết kế,

# Docker/DevOps, AI tools.

# • Sinh viên phải trả lời được câu hỏi cơ bản về tất cả công nghệ đã sử dụng.

# • Nếu không trả lời được câu hỏi về thành phần cốt lõi (ví dụ: không biết RLS là gì,

# không biết Docker dùng để làm gì), điểm vấn đáp sẽ bị trừ nhiều.

# Lưu ý: Quy chế này có thể được điều chỉnh thông báo trước. Mọi thay đổi sẽ được

# thông báo qua Email/LMS.


