// common/messages/common.message.ts

export const COMMON_MESSAGES = {
  // Success messages
  SUCCESS: 'Thành công',
  CREATED: 'Tạo mới thành công',
  UPDATED: 'Cập nhật thành công',
  DELETED: 'Xóa thành công',

  // Error messages
  INTERNAL_SERVER_ERROR: 'Lỗi hệ thống, vui lòng thử lại sau',
  BAD_REQUEST: 'Yêu cầu không hợp lệ',
  UNAUTHORIZED: 'Vui lòng đăng nhập để tiếp tục',
  FORBIDDEN: 'Bạn không có quyền truy cập',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  CONFLICT: 'Dữ liệu đã tồn tại',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  RATE_LIMITED: 'Quá nhiều yêu cầu, vui lòng thử lại sau',

  // Auth messages
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn',
  INVALID_TOKEN: 'Token không hợp lệ',
  ACCOUNT_DISABLED: 'Tài khoản đã bị vô hiệu hóa',

  // User messages
  USER_NOT_FOUND: 'Người dùng không tồn tại',
  USER_ALREADY_EXISTS: 'Email đã được sử dụng',
  USER_CREATED: 'Tạo tài khoản thành công',
  USER_UPDATED: 'Cập nhật thông tin thành công',
  USER_DELETED: 'Xóa tài khoản thành công',

  // Database messages
  DATABASE_ERROR: 'Lỗi cơ sở dữ liệu',
  DATABASE_CONNECTION_FAILED: 'Không thể kết nối cơ sở dữ liệu',
  TRANSACTION_FAILED: 'Giao dịch thất bại',
};
