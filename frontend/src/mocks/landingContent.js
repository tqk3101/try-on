// Nội dung tĩnh/mock cho Landing page. Tách riêng để dễ chỉnh sửa hoặc thay bằng CMS/API.
export const NAV_LINKS = [
  { id: 'features', label: 'Tính năng', href: '#features' },
  { id: 'how-it-works', label: 'Cách hoạt động', href: '#how-it-works' },
  { id: 'categories', label: 'Danh mục', href: '#categories' },
];

export const FEATURES = [
  {
    icon: 'camera',
    title: 'Thử đồ bằng chính bạn',
    description:
      'Tải một ảnh toàn thân cùng chiều cao, cân nặng. AI dựng hình bạn đang mặc sản phẩm, không cần người mẫu.',
  },
  {
    icon: 'swap',
    title: 'Vuốt để đổi sản phẩm',
    description:
      'Bấm mũi tên hoặc vuốt trên điện thoại để xem sản phẩm kế tiếp. Ảnh bạn mặc đồ mới được tạo tức thì.',
  },
  {
    icon: 'grid',
    title: 'Chọn theo danh mục',
    description:
      'Áo thun, váy, quần jeans... Chọn danh mục và thấy ngay hình mình mặc sản phẩm đầu tiên.',
  },
  {
    icon: 'bag',
    title: 'Thêm vào giỏ ngay',
    description:
      'Ưng bộ nào, bấm "Thêm vào giỏ" ngay trên màn hình thử đồ. Xem giỏ hàng và tổng tiền rõ ràng.',
  },
];

export const STEPS = [
  {
    title: 'Tạo hồ sơ',
    description: 'Đăng ký, tải ảnh toàn thân và nhập chiều cao, cân nặng của bạn.',
  },
  {
    title: 'Chọn danh mục',
    description: 'Vào phòng thử đồ và chọn loại trang phục bạn muốn xem.',
  },
  {
    title: 'Vuốt & chọn mua',
    description: 'Lướt qua từng sản phẩm trên chính mình, ưng món nào thêm vào giỏ món đó.',
  },
];

export const CATEGORIES = [
  { id: 'tshirt', name: 'Áo thun', hint: 'Basic đến oversize' },
  { id: 'dress', name: 'Váy', hint: 'Từ dạo phố đến dự tiệc' },
  { id: 'jeans', name: 'Quần jeans', hint: 'Ống suông, skinny, baggy' },
];

export const FOOTER_LINKS = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Cách hoạt động', href: '#how-it-works' },
  { label: 'Danh mục', href: '#categories' },
];
