# Graduation Wishes — Scrapbook / Polaroid

Website lời chúc tốt nghiệp gồm giao diện người gửi, lời cảm ơn ngẫu nhiên, vòng quay quà, cơ sở dữ liệu Supabase và trang quản trị `/admin`.

## 1. Chạy thử giao diện

Cần cài Node.js bản LTS. Giải nén project, mở terminal tại thư mục chứa `package.json`, chạy:

```bash
npm install
npm run dev
```

Mở URL local Vite hiển thị. Nếu chưa cấu hình `.env`, website chạy **demo**: dữ liệu và phần quà không được lưu, không phải cam kết chuyển tiền.

## 2. Cấu hình Supabase để lưu dữ liệu thật

1. Tạo project tại https://supabase.com.
2. Vào SQL Editor, chạy `supabase/schema.sql`.
3. Chạy tiếp `supabase/allocate_prize.sql`.
4. Vào Authentication, tạo tài khoản người quản trị.
5. Cấp `app_metadata.role = "admin"` cho tài khoản bằng Supabase Admin API chạy ở môi trường tin cậy. Không cấp quyền qua `user_metadata` và không bao giờ đưa service-role key vào frontend.
6. Sao chép `.env.example` thành `.env`, điền Project URL và publishable/anon key. Khởi động lại Vite.
7. Cài Supabase CLI, đăng nhập và liên kết project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set ALLOWED_ORIGIN=https://YOUR_PUBLIC_SITE_DOMAIN
supabase functions deploy submit-wish
supabase functions deploy spin-prize
supabase functions deploy public-wishes
```

Đối với local development, đặt `ALLOWED_ORIGIN=http://localhost:5173`. Edge Functions sử dụng `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` từ môi trường Supabase; không đưa những secret này vào biến `VITE_`.

## 3. Cấu hình ngân sách quà

Vòng quay quà thật **tắt mặc định** và ngân sách chưa được đặt. Chỉ sau khi bạn quyết định mức ngân sách, xác nhận các mệnh giá/trọng số và muốn bật thật, chạy câu SQL ví dụ sau (đổi số tiền theo ngân sách thực tế):

```sql
update public.prize_settings
set budget_cap_vnd = 1000000, enabled = true, updated_at = now()
where id = true;
```

`1000000` chỉ là ví dụ, không phải ngân sách đã được lựa chọn. Các mức quà khởi tạo: 10.000đ (trọng số 3), 20.000đ (3), 30.000đ (2), 50.000đ (1), 100.000đ (1). Điều chỉnh bảng `prize_wheel_config` trước khi bật. Hàm SQL dùng khoá giao dịch để kiểm tra ngân sách và ghi mỗi kết quả một lần. Khi ngân sách không đủ, lượt quay mới bị từ chối thay vì vượt ngân sách.

## 4. Trang quản trị

Mở `/admin` và đăng nhập bằng tài khoản có `app_metadata.role = admin`. Trang quản trị hiển thị tên, số điện thoại, lời chúc, kết quả và trạng thái quà; có tìm kiếm/lọc và đánh dấu đã chuyển. **Nút đánh dấu đã chuyển chỉ cập nhật trạng thái trong website, không chuyển tiền tự động.**

## 5. Bảo mật và lưu ý trước khi công khai

- Ghi dữ liệu và quay quà thông qua Edge Functions, không cho trình duyệt tự quyết định phần thưởng.
- Kết quả quà được ràng buộc một lần cho mỗi participant; số điện thoại chuẩn hoá là duy nhất.
- RLS chỉ cho tài khoản admin đọc dữ liệu. Không tạo public SELECT policy.
- Trước khi chia sẻ rộng, hãy bổ sung CAPTCHA/rate limiting chống bot, kiểm thử bằng tài khoản không phải admin, đặt chính sách xoá dữ liệu và thông báo quyền riêng tư rõ ràng.
- Chỉ thu số điện thoại nếu thực sự cần. Không lưu số tài khoản ngân hàng trong website; liên hệ riêng khi cần trao quà.
- Cần công khai quy tắc, xác suất/trọng số, ngân sách tối đa và điều kiện nhận quà. Tự kiểm tra quy định pháp luật hiện hành trước khi tổ chức hoạt động có yếu tố may rủi và tiền thưởng.

## Cấu trúc chính

- `src/App.jsx`: giao diện người gửi.
- `src/Admin.jsx`: trang quản trị.
- `supabase/schema.sql`: bảng dữ liệu và RLS.
- `supabase/allocate_prize.sql`: hàm phân bổ quà có kiểm soát ngân sách.
- `supabase/functions/submit-wish`: lưu thông tin và tạo token quay bí mật.
- `supabase/functions/spin-prize`: xác thực token, kiểm tra cài đặt và ghi kết quả quà.


## Chỉnh sửa giao diện và ảnh

- Trang đầu, form lời chúc, vòng quay, lời nhắn cuối và cây/cúp lời chúc: `src/App.jsx`.
- Màu sắc, font, kích thước, bố cục trên điện thoại: `src/styles.css`.
- Trang quản trị: `src/Admin.jsx`; kiểu trang quản trị: `src/admin.css`.
- Ảnh bìa hiện tại là khung minh hoạ, chưa phải ảnh thật. Muốn dùng ảnh của Huutri, hãy đặt ảnh vào thư mục `public/images/` (tạo thư mục nếu chưa có), sau đó thay phần `.photo-placeholder` trong `src/App.jsx` bằng `<img src="/images/ten-anh.jpg" alt="Kỷ niệm tốt nghiệp của Huutri" />` và chỉnh CSS `.hero-photo`.
- Không đặt khoá `SUPABASE_SERVICE_ROLE_KEY` trong file `.env` phía trình duyệt; chỉ đặt ở Supabase Edge Function secrets.

## Phần quà hiện tại

Vòng quay có 5 kết quả: Nụ hôn lốc xoáy (0 VNĐ), 6.868 VNĐ, 2.205 VNĐ, 9.999 VNĐ và 8.386 VNĐ. Vòng quay quà thật mặc định vẫn tắt cho đến khi chủ website quyết định ngân sách và bật tính năng trong Supabase. Phần “nụ hôn” là quà phi tiền mặt nên trang quản trị không hiện nút đánh dấu chuyển khoản cho phần quà này.

Trang “Cây lời chúc” gọi Edge Function `public-wishes` để chỉ công khai tên hiển thị và lời nhắn; số điện thoại không được gửi ra trang công khai. Nếu đã cài đặt Supabase từ trước, cần cập nhật cấu trúc dữ liệu bằng migration trước khi deploy code mới: chạy `supabase/update-prizes.sql` để thêm cột và thay danh sách phần quà, sau đó chạy lại `supabase/allocate_prize.sql`.
