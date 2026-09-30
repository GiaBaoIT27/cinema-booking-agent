import { DataSource } from 'typeorm';
import { Permission } from '#modules/rbac/domain/entities/permission.entity.js';

export class PermissionSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);

    // Danh sách đầy đủ các quyền hạn theo module nghiệp vụ
    const permissionsData = [
      // 1. SYSTEM & CINEMA & SEAT TYPE
      {
        id: '1',
        code: 'province:create',
        name: 'Tạo mới Tỉnh/Thành phố',
        module: 'SYSTEM_CINEMA',
        description: 'Cho phép thêm mới dữ liệu Tỉnh/Thành phố vào hệ thống.',
      },
      {
        id: '2',
        code: 'ward:create',
        name: 'Tạo mới Phường/Xã',
        module: 'SYSTEM_CINEMA',
        description: 'Cho phép thêm mới dữ liệu Phường/Xã/Quận/Huyện.',
      },
      {
        id: '3',
        code: 'cinema:manage',
        name: 'Quản lý Cụm Rạp',
        module: 'SYSTEM_CINEMA',
        description: 'Toàn quyền cấu hình, thêm, sửa, xóa thông tin cụm rạp.',
      },
      {
        id: '4',
        code: 'auditorium:view',
        name: 'Xem Phòng chiếu',
        module: 'SYSTEM_CINEMA',
        description: 'Cho phép xem danh sách và sơ đồ các phòng chiếu.',
      },
      {
        id: '5',
        code: 'auditorium:create',
        name: 'Tạo mới Phòng chiếu',
        module: 'SYSTEM_CINEMA',
        description: 'Cho phép thiết lập phòng chiếu mới kèm sơ đồ ghế.',
      },
      {
        id: '6',
        code: 'auditorium:update',
        name: 'Cập nhật Phòng chiếu',
        module: 'SYSTEM_CINEMA',
        description: 'Cho phép chỉnh sửa sơ đồ ghế và thông tin phòng chiếu.',
      },
      {
        id: '7',
        code: 'seat_type:create',
        name: 'Tạo loại ghế',
        module: 'SYSTEM_CINEMA',
        description:
          'Cho phép định nghĩa loại ghế mới (Thường, VIP, Sweetbox,...).',
      },
      {
        id: '8',
        code: 'seat_type:update',
        name: 'Cập nhật loại ghế',
        module: 'SYSTEM_CINEMA',
        description: 'Cho phép cập nhật thông tin loại ghế.',
      },
      {
        id: '9',
        code: 'seat_type:delete',
        name: 'Xóa loại ghế',
        module: 'SYSTEM_CINEMA',
        description: 'Cho phép xóa loại ghế khỏi hệ thống.',
      },

      // 2. MOVIE & GENRE
      {
        id: '10',
        code: 'movie:view',
        name: 'Xem danh sách Phim',
        module: 'MOVIE_GENRE',
        description: 'Cho phép xem thông tin chi tiết danh mục phim.',
      },
      {
        id: '11',
        code: 'movie:create',
        name: 'Tạo mới Phim',
        module: 'MOVIE_GENRE',
        description: 'Cho phép đăng tải thông tin phim mới lên hệ thống.',
      },
      {
        id: '12',
        code: 'movie:update',
        name: 'Cập nhật Phim',
        module: 'MOVIE_GENRE',
        description: 'Cho phép chỉnh sửa thông tin phim, trạng thái chiếu.',
      },
      {
        id: '13',
        code: 'movie:delete',
        name: 'Xóa Phim',
        module: 'MOVIE_GENRE',
        description: 'Cho phép gỡ bỏ phim khỏi hệ thống.',
      },
      {
        id: '14',
        code: 'genre:create',
        name: 'Tạo Thể loại phim',
        module: 'MOVIE_GENRE',
        description: 'Cho phép thêm mới thể loại phim.',
      },
      {
        id: '15',
        code: 'genre:update',
        name: 'Cập nhật Thể loại phim',
        module: 'MOVIE_GENRE',
        description: 'Cho phép cập nhật tên/mô tả thể loại phim.',
      },
      {
        id: '16',
        code: 'genre:delete',
        name: 'Xóa Thể loại phim',
        module: 'MOVIE_GENRE',
        description: 'Cho phép xóa thể loại phim.',
      },

      // 3. DISTRIBUTOR & SETTLEMENT
      {
        id: '17',
        code: 'distributor:view',
        name: 'Xem Nhà phát hành',
        module: 'DISTRIBUTOR_SETTLEMENT',
        description: 'Xem thông tin các nhà phát hành phim.',
      },
      {
        id: '18',
        code: 'distributor:create',
        name: 'Tạo mới Nhà phát hành',
        module: 'DISTRIBUTOR_SETTLEMENT',
        description: 'Cho phép thêm nhà phát hành phim mới.',
      },
      {
        id: '19',
        code: 'distributor:update',
        name: 'Cập nhật Nhà phát hành',
        module: 'DISTRIBUTOR_SETTLEMENT',
        description: 'Chỉnh sửa thông tin liên hệ, tỷ lệ chia sẻ doanh thu.',
      },
      {
        id: '20',
        code: 'settlement:view',
        name: 'Xem Quyết toán',
        module: 'DISTRIBUTOR_SETTLEMENT',
        description: 'Xem các bảng đối soát doanh thu với nhà phát hành.',
      },
      {
        id: '21',
        code: 'settlement:generate',
        name: 'Tạo bảng Quyết toán',
        module: 'DISTRIBUTOR_SETTLEMENT',
        description: 'Cho phép kết xuất kỳ quyết toán doanh thu.',
      },
      {
        id: '22',
        code: 'settlement:approve',
        name: 'Duyệt Quyết toán',
        module: 'DISTRIBUTOR_SETTLEMENT',
        description: 'Phê duyệt bảng chốt doanh thu với đối tác.',
      },
      {
        id: '23',
        code: 'settlement:export',
        name: 'Xuất báo cáo Quyết toán',
        module: 'DISTRIBUTOR_SETTLEMENT',
        description: 'Cho phép xuất dữ liệu quyết toán ra file (Excel/PDF).',
      },

      // 4. SHOWTIME & PRICE RULE & SEAT PRICE
      {
        id: '24',
        code: 'showtime:create',
        name: 'Tạo Lịch chiếu',
        module: 'SHOWTIME_PRICE',
        description: 'Cho phép lên lịch chiếu phim cho các phòng chiếu.',
      },
      {
        id: '25',
        code: 'showtime:update',
        name: 'Cập nhật Lịch chiếu',
        module: 'SHOWTIME_PRICE',
        description: 'Điều chỉnh thời gian chiếu, trạng thái suất chiếu.',
      },
      {
        id: '26',
        code: 'showtime_seat:manage',
        name: 'Quản lý Trạng thái Ghế Suất chiếu',
        module: 'SHOWTIME_PRICE',
        description: 'Cho phép khóa/mở ghế thủ công theo suất chiếu.',
      },
      {
        id: '27',
        code: 'price_rule:view',
        name: 'Xem Quy tắc giá',
        module: 'SHOWTIME_PRICE',
        description: 'Xem cấu hình khung giá vé theo khung giờ/ngày.',
      },
      {
        id: '28',
        code: 'price_rule:create',
        name: 'Tạo Quy tắc giá',
        module: 'SHOWTIME_PRICE',
        description: 'Thiết lập quy tắc tính giá vé mới.',
      },
      {
        id: '29',
        code: 'price_rule:update',
        name: 'Cập nhật Quy tắc giá',
        module: 'SHOWTIME_PRICE',
        description: 'Thay đổi các tham số tính giá vé.',
      },
      {
        id: '30',
        code: 'price_rule:delete',
        name: 'Xóa Quy tắc giá',
        module: 'SHOWTIME_PRICE',
        description: 'Xóa quy tắc tính giá vé.',
      },
      {
        id: '31',
        code: 'seat_price:generate',
        name: 'Sinh Giá ghế tự động',
        module: 'SHOWTIME_PRICE',
        description: 'Cho phép kích hoạt tính toán giá ghế cho suất chiếu.',
      },
      {
        id: '32',
        code: 'seat_price:override',
        name: 'Ghi đè Giá ghế',
        module: 'SHOWTIME_PRICE',
        description: 'Tùy chỉnh giá vé riêng biệt cho từng vị trí ghế cụ thể.',
      },

      // 5. FNB & INVENTORY
      {
        id: '33',
        code: 'fnb:create',
        name: 'Tạo Sản phẩm Bắp/Nước',
        module: 'FNB_INVENTORY',
        description: 'Thêm mới combo/món ăn uống vào menu.',
      },
      {
        id: '34',
        code: 'fnb:update',
        name: 'Cập nhật Bắp/Nước',
        module: 'FNB_INVENTORY',
        description: 'Cập nhật giá bán, hình ảnh, thông tin sản phẩm F&B.',
      },
      {
        id: '35',
        code: 'fnb:fulfill',
        name: 'Xử lý Trả hàng F&B',
        module: 'FNB_INVENTORY',
        description: 'Xác nhận trả đồ ăn/nước cho khách tại quầy.',
      },
      {
        id: '36',
        code: 'inventory:view',
        name: 'Xem Kho hàng',
        module: 'FNB_INVENTORY',
        description: 'Theo dõi tồn kho nguyên vật liệu và sản phẩm F&B.',
      },
      {
        id: '37',
        code: 'inventory:manage',
        name: 'Quản lý Kho hàng',
        module: 'FNB_INVENTORY',
        description: 'Nhập kho, xuất kho và quản lý danh mục kho.',
      },
      {
        id: '38',
        code: 'inventory:adjust',
        name: 'Điều chỉnh/Kiểm kê Kho',
        module: 'FNB_INVENTORY',
        description: 'Cân bằng số lượng kho khi có hao hụt, kiểm kê.',
      },

      // 6. ORDER, TICKET & PAYMENT
      {
        id: '39',
        code: 'order:create',
        name: 'Tạo Đơn hàng',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Tạo đơn đặt vé/F&B tại quầy hoặc hệ thống.',
      },
      {
        id: '40',
        code: 'order:view',
        name: 'Xem Đơn hàng',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Tra cứu thông tin chi tiết các đơn hàng.',
      },
      {
        id: '41',
        code: 'order:cancel',
        name: 'Hủy Đơn hàng',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Cho phép hủy đơn hàng theo chính sách.',
      },
      {
        id: '42',
        code: 'order:manage',
        name: 'Quản lý Đơn hàng',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Toàn quyền thao tác trên hệ thống đơn hàng.',
      },
      {
        id: '43',
        code: 'ticket:view',
        name: 'Xem Vé xem phim',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Tra cứu thông tin chi tiết vé.',
      },
      {
        id: '44',
        code: 'ticket:checkin',
        name: 'Soát vé (Check-in)',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Quét mã QR/Vé để xác nhận khách vào phòng chiếu.',
      },
      {
        id: '45',
        code: 'ticket:cancel',
        name: 'Hủy/Trả Vé',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Hủy vé đã phát hành.',
      },
      {
        id: '46',
        code: 'payment:view',
        name: 'Xem Giao dịch Thanh toán',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Xem lịch sử giao dịch qua các cổng thanh toán/tiền mặt.',
      },
      {
        id: '47',
        code: 'payment:reconcile',
        name: 'Đối soát Thanh toán',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Khớp nối giao dịch thanh toán với ngân hàng/ví điện tử.',
      },
      {
        id: '48',
        code: 'payment:manage',
        name: 'Quản lý Thanh toán',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Cấu hình cổng thanh toán và quản lý dòng tiền.',
      },
      {
        id: '49',
        code: 'payment:refund',
        name: 'Hoàn tiền Thanh toán',
        module: 'ORDER_TICKET_PAYMENT',
        description: 'Thực hiện lệnh hoàn tiền giao dịch cho khách hàng.',
      },

      // 7. PROMOTION, VOUCHER & POINT
      {
        id: '50',
        code: 'promo:view',
        name: 'Xem Khuyến mãi',
        module: 'PROMOTION_POINT',
        description: 'Xem các chiến dịch ưu đãi đang và sắp diễn ra.',
      },
      {
        id: '51',
        code: 'promo:create',
        name: 'Tạo Khuyến mãi',
        module: 'PROMOTION_POINT',
        description: 'Thiết lập chương trình ưu đãi/giảm giá mới.',
      },
      {
        id: '52',
        code: 'promo:update',
        name: 'Cập nhật Khuyến mãi',
        module: 'PROMOTION_POINT',
        description: 'Chỉnh sửa thể lệ, thời gian áp dụng khuyến mãi.',
      },
      {
        id: '53',
        code: 'promo:apply',
        name: 'Áp dụng Khuyến mãi',
        module: 'PROMOTION_POINT',
        description: 'Kích hoạt/Áp dụng mã giảm giá vào đơn hàng.',
      },
      {
        id: '54',
        code: 'voucher:grant',
        name: 'Cấp phát Voucher',
        module: 'PROMOTION_POINT',
        description: 'Phát tặng voucher cho khách hàng/nhóm khách hàng.',
      },
      {
        id: '55',
        code: 'voucher:view',
        name: 'Xem danh sách Voucher',
        module: 'PROMOTION_POINT',
        description: 'Tra cứu kho voucher và trạng thái sử dụng.',
      },
      {
        id: '56',
        code: 'voucher:manage',
        name: 'Quản lý Voucher',
        module: 'PROMOTION_POINT',
        description: 'Cấu hình, vô hiệu hóa hoặc gia hạn voucher.',
      },
      {
        id: '57',
        code: 'point:view',
        name: 'Xem Điểm tích lũy',
        module: 'PROMOTION_POINT',
        description: 'Xem lịch sử điểm thưởng của khách hàng.',
      },
      {
        id: '58',
        code: 'point:adjust',
        name: 'Điều chỉnh Điểm',
        module: 'PROMOTION_POINT',
        description: 'Cộng/trừ điểm thưởng thủ công cho thành viên.',
      },

      // 8. ROLE, PERMISSION & USER
      {
        id: '59',
        code: 'role:view',
        name: 'Xem Vai trò',
        module: 'IDENTITY_ACCESS',
        description: 'Xem danh sách các vai trò (Roles) trong hệ thống.',
      },
      {
        id: '60',
        code: 'role:create',
        name: 'Tạo mới Vai trò',
        module: 'IDENTITY_ACCESS',
        description: 'Thêm mới vai trò dùng cho phân quyền.',
      },
      {
        id: '61',
        code: 'role:update',
        name: 'Cập nhật Vai trò',
        module: 'IDENTITY_ACCESS',
        description: 'Chỉnh sửa tên, mô tả vai trò.',
      },
      {
        id: '62',
        code: 'role:delete',
        name: 'Xóa Vai trò',
        module: 'IDENTITY_ACCESS',
        description: 'Xóa vai trò khỏi hệ thống.',
      },
      {
        id: '63',
        code: 'permission:view',
        name: 'Xem Quyền hạn',
        module: 'IDENTITY_ACCESS',
        description: 'Xem danh sách tất cả các quyền hệ thống.',
      },
      {
        id: '64',
        code: 'permission:manage',
        name: 'Quản lý Quyền hạn',
        module: 'IDENTITY_ACCESS',
        description: 'Gán/Gỡ quyền cho các vai trò (Role-Permission).',
      },
      {
        id: '65',
        code: 'user:view',
        name: 'Xem Người dùng',
        module: 'IDENTITY_ACCESS',
        description: 'Tra cứu danh sách tài khoản người dùng/nhân viên.',
      },
      {
        id: '66',
        code: 'user:create',
        name: 'Tạo mới Người dùng',
        module: 'IDENTITY_ACCESS',
        description: 'Tạo tài khoản quản trị/nhân viên mới.',
      },
      {
        id: '67',
        code: 'user:assign_role',
        name: 'Gán Vai trò cho Người dùng',
        module: 'IDENTITY_ACCESS',
        description: 'Phân vai trò truy cập cho người dùng.',
      },
      {
        id: '68',
        code: 'user:update_status',
        name: 'Cập nhật Trạng thái Người dùng',
        module: 'IDENTITY_ACCESS',
        description: 'Khóa/mở khóa tài khoản người dùng.',
      },

      // 9. REVIEW
      {
        id: '69',
        code: 'review:moderate',
        name: 'Kiểm duyệt Đánh giá',
        module: 'REVIEW',
        description: 'Duyệt/Ẩn đánh giá và bình luận của khách hàng.',
      },
      {
        id: '70',
        code: 'review:delete',
        name: 'Xóa Đánh giá',
        module: 'REVIEW',
        description: 'Xóa bình luận vi phạm tiêu chuẩn cộng đồng.',
      },

      // 10. REPORT & ANALYTICS
      {
        id: '71',
        code: 'report:global',
        name: 'Xem Báo cáo Tổng quan',
        module: 'REPORT_ANALYTICS',
        description: 'Xem báo cáo doanh thu, vé bán toàn hệ thống.',
      },
      {
        id: '72',
        code: 'analytics',
        name: 'Xem Phân tích Dữ liệu',
        module: 'REPORT_ANALYTICS',
        description: 'Truy cập dashboard phân tích xu hướng và hành vi.',
      },
      {
        id: '73',
        code: 'analytics:export',
        name: 'Xuất dữ liệu Phân tích',
        module: 'REPORT_ANALYTICS',
        description: 'Tải xuống dữ liệu phân tích chuyên sâu.',
      },
      {
        id: '74',
        code: 'analytics:etl_manage',
        name: 'Quản lý Tiến trình ETL',
        module: 'REPORT_ANALYTICS',
        description:
          'Cấu hình và vận hành tiến trình trích xuất/xử lý dữ liệu AI/Analytics.',
      },
    ];

    console.log(
      'Khởi chạy quy trình Seeding danh mục Quyền hạn (Permissions)...',
    );

    // Thực thi ghi dữ liệu lũy đẳng (Idempotent)
    for (const item of permissionsData) {
      const existingPermission = await permissionRepository.findOne({
        where: { code: item.code },
      });

      if (!existingPermission) {
        const newPermission = permissionRepository.create({
          id: item.id,
          code: item.code,
          name: item.name,
          module: item.module,
          description: item.description,
        });
        await permissionRepository.save(newPermission);
        console.log(`Khởi tạo thành công quyền: ${item.code}`);
      } else {
        existingPermission.name = item.name;
        existingPermission.module = item.module;
        existingPermission.description = item.description;
        await permissionRepository.save(existingPermission);
        console.log(`Đồng bộ thành công quyền: ${item.code}`);
      }
    }

    console.log('Hoàn thành Seeding danh mục Quyền hạn thành công!');
  }
}
