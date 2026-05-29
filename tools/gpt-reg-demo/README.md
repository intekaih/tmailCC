# tmailCC GPT Demo Tool

Cong cu demo tuong tac voi **tmailCC Developer API** — minh hoa quy trinh tao tai khoan email, nhan email, va doc ma OTP tu dong.

## Cai dat

1. **Tao API Key** tren tmailCC:
   - Dang nhap tmailCC
   - Vao **Developer Settings** (menu cai dat / cong cu phat trien)
   - Tao API key moi voi cac quyen: `accounts:create`, `accounts:read`, `emails:read`, `otp:read`

2. **Mo file** `index.html` trong trinh duyet, hoac:

```bash
npx serve .
# Sau do mo http://localhost:3000
```

## Cach su dung

### Buoc 1 — Cau hinh
- Nhap **API URL**: `http://localhost:3000` (neu chay local) hoac dia chi production
- Nhap **API Key** da tao o buoc 1
- Chon **Domain** muon su dung
- Nhan **Kiem tra ket noi** de xac nhan

### Buoc 2 — Tao tai khoan email
- Nhap ten email muon tao (hoac de trong de tu dong tao ngau nhien)
- Nhan **Tao email moi**
- Copy dia chi email da tao

### Buoc 3 — Hop thu
- Tat ca email gui den dia chi email se hien thi o day
- Co the bat **tu dong quet** de cap nhat lien tuc
- Nhan vao email de xem noi dung chi tiet

### Buoc 4 — Cho ma OTP
- Nhan **Bat dau cho OTP** de bat dau polling
- Khi co email xac minh (tu GPT, Google, ...), ma OTP se tu dong duoc trich xuat
- Copy ma va su dung de xac minh tai khoan

## API Flow (hien thi tren sidebar)

```
1. GET  /api/v1/domains          -> Lay danh sach domain
2. POST /api/v1/accounts        -> Tao tai khoan email
3. GET  /api/v1/accounts/:addr/emails  -> Lay danh sach email
4. GET  /api/v1/accounts/:addr/wait-otp -> Cho & trich xuat ma OTP
```

## Minh hoa cho giao vien

Cong cu nay minh hoa cac khai niem:

- **API** la gi (REST API, HTTP methods, JSON)
- **Authentication** bang API Key (Bearer token)
- **Long polling** — ky thuat cho server gui du lieu khi san sang
- **OTP extraction** — trich xuat ma tu email
- **Webhook** (neu co) — server goi den client khi co email moi

## Luu y

- Chung chi HTTPS can cho production (tru localhost)
- API Key can duoc bao mat, khong chia se public
- Khoang cach quet email mac dinh: 3s
- Thoi gian cho OTP toi da: 300s (5 phut)
- Neu can demo webhook, co the them endpoint `/api/v1/webhooks` trong Developer Settings

## Xoa tool

Xoa thu muc `tools/gpt-reg-demo` la xong, khong anh huong den du an chinh.
