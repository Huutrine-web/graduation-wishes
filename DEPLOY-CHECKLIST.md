# Checklist trước khi đưa website lên mạng

- [ ] Đã chạy `npm run build` thành công.
- [ ] Đã chạy `supabase/schema.sql` và `supabase/allocate_prize.sql` trên đúng project.
- [ ] Đã deploy hai Edge Functions và đặt `ALLOWED_ORIGIN` thành domain thật.
- [ ] Đã tạo tài khoản admin và gán `app_metadata.role=admin` qua môi trường tin cậy.
- [ ] Đã thử `/admin` với tài khoản admin và một tài khoản thường.
- [ ] Đã thử gửi lời chúc trùng số điện thoại; hệ thống phải từ chối lượt thứ hai.
- [ ] Đã thử quay lại sau khi đã có kết quả; hệ thống phải trả đúng kết quả cũ, không cấp lượt mới.
- [ ] Đã kiểm thử ngân sách hết; hệ thống không được ghi kết quả vượt mức.
- [ ] Đã quyết định mệnh giá, trọng số, tổng ngân sách và bật vòng quay có chủ đích.
- [ ] Đã bổ sung CAPTCHA/rate limit, thông báo quyền riêng tư và thời hạn lưu dữ liệu.
- [ ] Đã thay placeholder bằng ảnh tốt nghiệp mà mình có quyền sử dụng.
