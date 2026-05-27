```
Môn học: Các công nghệ mới trong phát triển phần mềm
Lớp: CTK46-PM — Công nghệ thông tin, Khoá 46
Hình thức: Báo cáo & Vấn đáp cá nhân (5 phút thuyết trình + 5 phút vấn đáp)
Bộ câu hỏi này nhằm giúp sinh viên hình dung và chuẩn bị trước nội dung bảo vệ.
Đây chỉ là câu hỏi tham khảo — giảng viên có thể hỏi các câu hỏi khác cùng chủ đề.
```
**NHÓM 1 — NHẬN BIẾT**
_Mục tiêu: Sinh viên nhận diện, định nghĩa, liệt kê các khái niệm và thành phần cốt
lõi._

**1.1. NEXT.JS & REACT
Câu 1.** Sự khác biệt giữa **Client Component** và **Server Component** trong Next.js
là gì? Khi nào nên dùng loại nào?
_Gợi ý: Server Component render phía server, gửi HTML đã hoàn chỉnh đến client.
Client Component cần tương tác JS phía client (useState, useEffect, event handlers)._
**Câu 2. App Router** trong Next.js 13+ khác với **Pages Router** ở điểm nào? Nêu ít
nhất 3 điểm khác biệt chính.
_Gợi ý: Cấu trúc thư mục (app/ vs pages/), Server Components mặc định, Layouts
lồng nhau, Server Actions, Loading/Error files._
**Câu 3. Server Actions** trong Next.js là gì? Cho biết cú pháp khai báo một Server
Action.
_Gợi ý: Async function chạy trên server, có thể gọi trực tiếp từ Client Component.
Khai báo với "use server" hoặc trong file action.js/ts._
**Câu 4.** Các phương thức **Data Fetching** nào được hỗ trợ trong Next.js? Khi nào
dùng fetch() trực tiếp, khi nào dùng React Query / SWR?
_Gợi ý: fetch tích hợp sẵn (caching, revalidation), React Query/SWR khi cần client-
side fetching, polling, optimistic updates._
**Câu 5.** Trong Next.js, file layout.tsx có vai trò gì và khác gì so với page.tsx?
_Gợi ý: Layout không re-render khi route thay đổi (giữ trạng thái). Dùng cho header,
sidebar, providers. Có thể lồng nhau._

**1.2. SUPABASE & POSTGRESQL**


**Câu 6. Supabase Auth** hỗ trợ những phương thức xác thực nào? Liệt kê ít nhất 4
phương thức.
_Gợi ý: Email/password, Google OAuth, GitHub OAuth, Phone (SMS), Magic Link,
SSO._
**Câu 7. Row Level Security (RLS)** trong Supabase là gì? Mục đích của RLS?
_Gợi ý: Cơ chế phân quyền ở cấp độ dòng (row) trong database. Đảm bảo user chỉ
thấy/sửa được dữ liệu được phép._
**Câu 8.** Các thành phần chính của Supabase được nhắc đến trong môn học là gì? Liệt
kê đầy đủ.
_Gợi ý: Authentication, Database (PostgreSQL), Storage, Realtime, Edge Functions,
Vector._
**Câu 9.** Cấu trúc một **Row Level Security Policy** cơ bản trong Supabase gồm những
thành phần nào?
_Gợi ý: USING clause (điều kiện lọc), WITH CHECK clause (điều kiện insert/update),
loại policy (SELECT, INSERT, UPDATE, DELETE), role (authenticated, anon)._
**Câu 10. Supabase Realtime** hoạt động dựa trên cơ chế nào? Khi nào nên dùng?
_Gợi ý: Dựa trên PostgreSQL LISTEN/NOTIFY và/hoặc WebSocket. Dùng cho thay
đổi dữ liệu real-time, presence, broadcast._

**1.3. DOCKER & CONTAINERIZATION
Câu 11. Container** khác với **Virtual Machine (VM)** ở điểm nào? Nêu ít nhất 3
điểm.
_Gợi ý: VM có kernel riêng, container dùng chung kernel host; VM nặng hơn, khởi
động chậm hơn; container nhẹ, khởi động nhanh, chi phí tài nguyên thấp hơn._
**Câu 12. Dockerfile** và **docker-compose.yml** có vai trò gì? Sự khác nhau giữa hai
file này?
_Gợi ý: Dockerfile mô tả cách build một image. docker-compose.yml định nghĩa và
chạy multi-container app (services, networks, volumes)._
**Câu 13. Multi-stage build** trong Docker là gì? Tại sao nên dùng?
_Gợi ý: Build trong nhiều stage, chỉ copy artifact cần thiết sang stage cuối → image
nhỏ hơn, bảo mật tốt hơn, tách biệt build environment._


**Câu 14.** Các câu lệnh Docker cơ bản nào cần biết? (docker build, docker run, docker
compose up/down, docker ps, docker logs)
_Gợi ý: build tạo image, run khởi chạy container, compose up/down quản lý multi-
container, ps liệt kê container đang chạy, logs xem output._

**1.4. DEPLOYMENT & DEVOPS
Câu 15. HTTPS** và **HTTP** khác nhau ở điểm nào? Tại sao cần HTTPS cho
production?
_Gợi ý: HTTPS mã hoá dữ liệu bằng TLS/SSL, HTTP truyền plain text. HTTPS bảo
mật dữ liệu, xác thực server, tránh man-in-the-middle._
**Câu 16. Reverse proxy** (ví dụ Nginx) là gì? Trong mô hình deploy với Cloudflare +
VPS, reverse proxy đóng vai trò gì?
_Gợi ý: Server trung gian tiếp nhận request, chuyển tiếp đến app server. Dùng để load
balancing, SSL termination, cache, bảo mật._
**Câu 17. Domain** và **DNS** hoạt động như thế nào? Khi người dùng nhập
example.com, quy trình DNS resolution ra sao?
_Gợi ý: Browser → DNS resolver → Root server → TLD server (.com) →
Authoritative nameserver → IP address → Server._
**Câu 18. Cloudflare** trong mô hình deploy đóng vai trò gì? Nêu ít nhất 3 chức năng.
_Gợi ý: CDN (tăng tốc), DDoS protection, DNS management, SSL/TLS proxy
(Universal SSL), caching, free tier._

**1.5. TYPESCRIPT & KIẾN TRÚC WEB
Câu 19.** Sự khác biệt giữa **interface** và type trong TypeScript là gì? Khi nào dùng
interface, khi nào dùng type?
_Gợi ý: Interface có thể merge (declaration merging), extend được; type linh hoạt hơn
(union, intersection). Dùng interface cho object shape, type cho
union/intersection/complex types._
**Câu 20. SSR** , **CSR** , **SSG** , **ISR** là gì? Nêu tên đầy đủ và bản chất mỗi khái niệm.
_Gợi ý: SSR = Server-Side Rendering, CSR = Client-Side Rendering, SSG = Static
Site Generation, ISR = Incremental Static Regeneration._


**Câu 21. type annotation** và **type inference** trong TypeScript khác nhau như thế
nào? Ví dụ minh hoạ.
_Gợi ý: Annotation: khai báo rõ kiểu (let name: string). Inference: TypeScript tự suy
kiểu (let name = "A" → string)._

**1.6. AI TOOLS
Câu 22. GitHub Copilot** và **Gemini CLI** hoạt động dựa trên nguyên lý nào? Nêu
cách sử dụng cơ bản của từng công cụ.
_Gợi ý: Copilot dùng code context + LLM để suggest code inline. Gemini CLI cho
phép tương tác LLM qua terminal, chat, run code._
**Câu 23.** Các loại **minh chứng** sử dụng AI tool mà bạn có thể cung cấp cho giảng
viên là gì?
_Gợi ý: Comment trong code (prompt + response), README (mô tả cách dùng AI),
chat history/screenshot, commit message ghi rõ AI hỗ trợ._

**NHÓM 2 — THÔNG HIỂU**
_Mục tiêu: Sinh viên giải thích, phân tích sự khác biệt, so sánh, diễn giải nguyên lý
hoạt động._

**2.1. NEXT.JS & KIẾN TRÚC
Câu 24.** Tại sao Next.js mặc định render bằng **Server Component**? Lợi ích chính
của việc này là gì?
_Gợi ý: Giảm JavaScript gửi về client (bundle size nhỏ hơn), tốt cho SEO, truy cập
trực tiếp server resources (database, file system), cải thiện First Contentful Paint._
**Câu 25.** Trong Next.js, khi nào bạn cần dùng **"use client"** directive? Nếu không có
directive này thì mặc định component hoạt động ra sao?
_Gợi ý: Khi cần dùng React hooks (useState, useEffect), event handlers, browser APIs.
Mặc định là Server Component (không có "use client")._
**Câu 26.** Giải thích luồng xử lý một request trong Next.js App Router, từ khi user
truy cập URL đến khi nhận được nội dung.


_Gợi ý: Request → Routing (route matching) → Layout → Loading → Server
Component renders → Data fetching → RSC payload gửi về → Client Component
hydration → Hiển thị._
**Câu 27.** So sánh **Server Actions** và **API Routes** trong Next.js. Khi nào dùng cái
nào?
_Gợi ý: Server Actions: gọi trực tiếp như gọi function, đơn giản, type-safe. API
Routes: RESTful endpoints, dùng khi cần webhook, external call, flexibility. Server
Actions là lựa chọn hiện đại hơn._

**2.2. SUPABASE & DATABASE
Câu 28.** Giải thích cách **Supabase Auth** quản lý session. Access token và refresh
token hoạt động như thế nào?
_Gợi ý: Sau khi đăng nhập, Supabase trả về access token (JWT, hết hạn sau ~1 giờ) và
refresh token (lưu trong httpOnly cookie). Khi access token hết hạn, tự động refresh._
**Câu 29.** Khi nào nên dùng **Supabase Storage** thay vì lưu file dạng base64 trong
database? Ưu điểm của Storage là gì?
_Gợi ý: Storage: quản lý file riêng, streaming, CDN, quyền truy cập RLS, không làm
phình database. Base64 trong DB: tăng kích thước DB, chậm truy vấn._
**Câu 30.** Mô tả quy trình tạo một **RLS Policy** để user chỉ đọc được dữ liệu của chính
mình trong Supabase.
_Gợi ý: Tạo bảng có column user_id. Tạo policy SELECT: auth.uid() = user_id. Gắn
cho role authenticated. Test bằng cách đăng nhập tài khoản khác._
**Câu 31.** Sự khác biệt giữa **Realtime** và **polling** trong việc cập nhật dữ liệu là gì?
Ưu/nhược điểm từng cách?
_Gợi ý: Polling: gửi request định kỳ (lãng phí bandwidth khi không có thay đổi).
Realtime: server push khi có thay đổi (hiệu quả hơn, phức tạp hơn, cần WebSocket)._

**2.3. DOCKER & DEVOPS
Câu 32.** Giải thích tại sao file docker-compose.yml thường dùng **volume** để mount
source code thay vì copy vào image.
_Gợi ý: Volume mount: code thay đổi → container thấy ngay (hot reload), không cần
rebuild image. Copy vào image: mỗi thay đổi cần rebuild, tốn thời gian._


**Câu 33.** Khi chạy docker compose up, Docker thực hiện những bước nào? Trình bày
luồng xử lý.
_Gợi ý: Đọc docker-compose.yml → Build image (nếu chưa có hoặc có thay đổi) →
Pull image (nếu cần) → Tạo network → Tạo và chạy containers → Mount volumes
→ Cấu hình environment variables._
**Câu 34.** Tại sao **Multi-stage build** giúp giảm kích thước Docker image? Giải thích
cơ chế.
_Gợi ý: Stage đầu chứa build tools (Node, compiler). Stage cuối chỉ chứa runtime
(node:alpine) và copy artifact từ stage đầu. Loại bỏ dependencies không cần thiết
(compiler, dev dependencies)._

**2.4. DEPLOYMENT & SSL
Câu 35.** Trong mô hình **Cloudflare + VPS + Nginx** , trình bày luồng request từ
browser đến ứng dụng Next.js.
_Gợi ý: Browser → DNS (Cloudflare) → Cloudflare edge (SSL termination) → VPS
IP → Nginx (reverse proxy, port 80/443) → Next.js app (port 3000)._
**Câu 36. SSL Certificate** (chứng chỉ SSL) hoạt động như thế nào? Giải thích cơ chế
mã hoá trong HTTPS handshake.
_Gợi ý: Client gửi ClientHello → Server gửi certificate (public key + CA signature) →
Client xác thực CA → Client tạo pre-master secret, mã hoá bằng public key →
Server giải mã → Cả hai tạo shared session key → Mã hoá dữ liệu._
**Câu 37. Cloudflare Universal SSL** hoạt động như thế nào? Ưu điểm so với tự cài
SSL trên VPS?
_Gợi ý: Cloudflare cấp và renew SSL miễn phí, SSL termination tại Cloudflare edge.
Ưu điểm: miễn phí, tự động, bảo mật thêm với Cloudflare features. Nhược điểm:
traffic đi qua Cloudflare._

**2.5. TYPESCRIPT & KIẾN TRÚC
Câu 38.** Giải thích khái niệm **generics** trong TypeScript. Cho ví dụ một hàm generic
đơn giản.
_Gợi ý: Generic cho phép viết code hoạt động với nhiều kiểu dữ liệu mà vẫn type-safe.
Ví dụ: function identity<T>(arg: T): T { return arg; }._


**Câu 39.** So sánh **SSR** và **SSG**. Khi nào nên dùng SSG, khi nào nên dùng SSR cho
một trang web?
_Gợi ý: SSG: build time render, nhanh, tốt cho nội dung tĩnh (blog, docs), không cần
real-time data. SSR: request time render, tốt cho nội dung động (dashboard, profile
user)._
**Câu 40.** Tại sao nên dùng **TypeScript** thay vì JavaScript thuần trong dự án Next.js?
Liệt kê các lợi ích chính.
_Gợi ý: Type safety (phát hiện lỗi sớm), autocompletion tốt hơn, refactoring an toàn,
documentation tự động qua types, giảm bug runtime._

**NHÓM 3 — VẬN DỤNG**
_Mục tiêu: Sinh viên thiết kế, đánh giá, so sánh lựa chọn, giải quyết vấn đề thực tế
trong dự án._

**3.1. THIẾT KẾ & KIẾN TRÚC
Câu 41.** Trong dự án của bạn, bạn đã thiết kế **database schema** như thế nào? Vì sao
bạn chọn cấu trúc đó thay vì cách khác?
_Gợi ý: Mô tả các bảng, mối quan hệ (one-to-many, many-to-many), indexes, RLS.
Giải thích trade-off: denormalization vs normalization, embedded vs relational._
**Câu 42.** Khi Supabase không hỗ trợ một tính năng nhất định (ví dụ: complex job
queue), bạn sẽ xử lý như thế nào?
_Gợi ý: Sử dụng Supabase Edge Functions, kết hợp third-party services (Inngest,
Trigger.dev), hoặc implement đơn giản với database polling. Giải thích cách chọn và
trade-off._
**Câu 43.** Bạn đã sử dụng **Server Components** và **Client Components** như thế nào
trong dự án? Có gặp khó khăn gì khi phân chia không?
_Gợi ý: Server cho data fetching, static content. Client cho forms, interactive UI. Khó
khăn: props serialization, "use client" boundary, data fetching patterns._
**Câu 44.** Thiết kế chiến lược **phân quyền (authorization)** cho ứng dụng của bạn. Ai
được làm gì, kiểm tra ở đâu (client? server? database?)?


```
Gợi ý: RLS ở database (phòng thủ cuối), Server Actions kiểm tra quyền trước khi xử
lý, Client-side UI hiển thị/hide theo vai trò. Giải thích tại sao cần kiểm tra ở nhiều
lớp.
```
**3.2. DOCKER & DEPLOYMENT
Câu 45.** Nếu ứng dụng Next.js của bạn bị crash khi chạy trong Docker container
trên VPS, bạn sẽ debug bằng cách nào? Trình bài các bước.
_Gợi ý: Kiểm tra logs (docker logs, docker compose logs), kiểm tra environment
variables, kiểm tra port binding, kiểm tra network (ping, curl), kiểm tra resource
(CPU, RAM, disk)._
**Câu 46.** Khi deploy lên VPS, bạn cần cấu hình **Nginx** như thế nào để proxy request
đến Next.js app? Cho ví dụ cấu hình cơ bản.
_Gợi ý: Cấu hình location / proxy_pass [http://localhost:3000,](http://localhost:3000,) set headers (Host, X-
Real-IP, X-Forwarded-_ ), cấu hình SSL, cấu hình static file serving / next.js image
optimization.*
**Câu 47.** Giả sử bạn cần deploy 2 ứng dụng (frontend Next.js + backend NestJS) trên
cùng một VPS. Thiết kế cấu hình Docker Compose và Nginx.
_Gợi ý: 2 services trong docker-compose. Nginx làm reverse proxy: route theo path
(/api/ → NestJS, / → Next.js). Cấu hình network, healthcheck._

**3.3. SUPABASE & DATA
Câu 48.** Bạn cần hiển thị danh sách bài viết cho user chưa đăng nhập (anonymous).
Nêu cách cấu hình **RLS Policy** cho trường hợp này.
_Gợi ý: Policy SELECT cho role anon với điều kiện không có điều kiện (auth.uid() IS
NULL hoặc không kiểm tra auth). Hoặc dùng public schema access._
**Câu 49.** Nếu bạn cần upload file lớn (video, 50MB) lên Supabase Storage, bạn cần
lưu ý những gì về cấu hình và RLS?
_Gợi ý: Storage bucket có file size limit (mặc định 50MB, có thể tăng). Cấu hình RLS:
ai được upload, ai được đọc. Nên dùng signed URL cho file private._
**Câu 50.** Thiết kế hệ thống **notification real-time** (thông báo khi có tin nhắn mới) sử
dụng Supabase Realtime. Trình bày flow từ client đến server.


```
Gợi ý: User A insert notification vào bảng → Supabase Realtime gửi event → User B
subscribe channel notifications:user_id=B → Nhận event → Cập nhật UI (toast,
badge).
```
**3.4. AI TOOLS & QUY TRÌNH
Câu 51.** Trong quá trình phát triển, bạn đã sử dụng AI tool như thế nào? Chọn một
tính năng cụ thể và mô tả prompt bạn dùng để tạo code đó.
_Gợi ý: Mô tả context (ngôn ngữ, framework), prompt cụ thể, kết quả AI trả về, bạn đã
chỉnh sửa gì. Ví dụ: "Viết TypeScript interface cho User model" / "Giải thích RLS
policy này"._
**Câu 52.** Nêu ít nhất 3 trường hợp mà AI tool **không nên** dùng hoặc cần cẩn thận khi
dùng trong dự án.
_Gợi ý: Xử lý logic nghiệp vụ phức tạp (AI dễ sai), security-sensitive code (AI có thể
suggest insecure patterns), code mà bạn không hiểu (copy-paste không kiểm tra →
không bảo vệ được)._
**Câu 53.** Bạn đã quản lý **Git commit** của mình như thế nào? Tại sao dùng
Conventional Commits? Cho ví dụ commit message.
_Gợi ý: Conventional Commits: feat: add user authentication, fix: resolve RLS policy
bug, docs: update README. Lợi ích: changelog tự động, search, code review dễ
hơn._

**3.5. TỔNG HỢP & ĐÁNH GIÁ
Câu 54.** Đánh giá 3 điểm **mạnh** và 3 điểm **hạn chế** của kiến trúc dự án bạn đã chọn.
Nếu làm lại, bạn sẽ thay đổi gì?
_Gợi ý: Mạnh: đơn giản, maintainable, đúng yêu cầu. Hạn chế: có thể là scalability,
complex RLS, performance. Đề xuất cải thiện cụ thể._
**Câu 55.** Trong 6 tiêu chí bắt buộc (Next.js, Supabase, Docker, VPS, GitHub, AI),
tiêu chí nào bạn thấy **khó nhất**? Vì sao? Bạn đã vượt qua như thế nào?
_Gợi ý: Phân tích cá nhân: có thể là Docker (lần đầu), VPS/SSL (không quen), RLS
(logic phức tạp). Nêu cách giải quyết cụ thể._
**Câu 56.** Nếu bạn phải thêm một tính năng mới (ví dụ: thanh toán PayPal) vào dự án
hiện tại, quy trình thực hiện của bạn sẽ như thế nào?


_Gợi ý: Thiết kế database (bảng payments), cập nhật RLS, tạo API route / Server
Action, tích hợp PayPal SDK, cập nhật UI, viết tests, update docs, deploy._
**Câu 57.** Hạn chế/thách thức lớn nhất bạn gặp phải trong quá trình phát triển đồ án là
gì? Bạn đã giải quyết bằng cách nào?
_Gợi ý: Mô tả vấn đề cụ thể (không phải "không biết gì"). Giải pháp: tài liệu, cộng
đồng, AI tool, thử nghiệm. Bài học rút ra._

**BẢNG TỔNG HỢP CÂU HỎI THEO CHỦ ĐỀ**

```
# Chủ đề Nhận biết Thông hiểu Vận dụng Tổng
1	 Next.js & React 5 câu 4 câu 4 câu 13	
2	 Supabase &
PostgreSQL
```
```
5 câu 4 câu 3 câu 12	
```
```
3	 Docker &
Containerization
```
```
4 câu 3 câu 2 câu 9	
```
```
4	 Deployment &
DevOps
```
```
4 câu 3 câu 2 câu 9	
```
```
5	 TypeScript &
Kiến trúc Web
```
```
3 câu 3 câu 1 câu 7	
```
```
6	 AI Tools & Git 3 câu 0 câu 3 câu 6	
7	 Tổng hợp &
Đánh giá
```
```
0 câu 0 câu 4 câu 4	
```
```
Tổng cộng 24 câu 17 câu 19 câu 60
```
## GỢI Ý ÔN TẬP THEO MỨC ĐỘ ƯU TIÊN

## 🔴 ƯU TIÊN CAO — CÂU HỎI CỐT LÕI (BẮT BUỘC TRẢ LỜI ĐƯỢC)

Đây là những câu hỏi nền tảng. **Nếu không trả lời được, điểm vấn đáp sẽ bị trừ
nghiêm trọng.**

```
# Câu hỏi Lý do ưu tiên
```

```
Q7 RLS là gì? Quy định rõ trong quy chế
Q11 Container vs VM Kiến thức cơ bản Docker
Q12 Dockerfile vs docker-
compose.yml
```
```
Dùng bắt buộc trong dự án
```
```
Q24 Tại sao Server Component
mặc định?
```
```
Kiến trúc cốt lõi Next.js
```
```
Q28 Supabase Auth quản lý
session thế nào?
```
```
Auth là tính năng bắt buộc
```
```
Q35 Luồng request Cloudflare +
VPS + Nginx
```
```
Deployment là yêu cầu bắt
buộc
```
## 🟡 ƯU TIÊN TRUNG BÌNH — CÂU HỎI MỞ RỘNG

```
Những câu hỏi này thể hiện sự hiểu biết sâu hơn về công nghệ.
```
```
# Câu hỏi Lý do ưu tiên
Q25 Khi nào cần "use client"? Phân biệt Server/Client
Component
Q30 Tạo RLS policy cho user đọc
dữ liệu của mình
```
```
Thực hành RLS thường gặp
```
```
Q34 Tại sao multi-stage build
giảm image size?
```
```
Best practice Docker
```
```
Q44 Thiết kế authorization nhiều
lớp
```
```
Phân quyền thực tế
```
```
Q54 Đánh giá kiến trúc dự án Câu hỏi tổng hợp
```
## 🟢 ƯU TIÊN THẤP — CÂU HỎI NÂNG CAO

Những câu hỏi này dành cho sinh viên muốn đạt điểm cao, thể hiện tư duy phản
biện.

```
# Câu hỏi Lý do ưu tiên
```

Q42 Xử lý tính năng Supabase
không hỗ trợ

Thể hiện tư duy giải quyết
vấn đề
Q50 Thiết kế notification real-time Kết hợp nhiều kiến thức
Q56 Thêm tính năng mới vào dự
án

```
Thể hiện quy trình phát triển
```

