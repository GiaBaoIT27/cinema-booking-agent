import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { UsersModule } from '../users/users.module.js';

/**
 * Trục Identity: Users, Rbac, Auth.
 *
 * CHỈ để app.module.ts import gọn 1 dòng thay vì 3. KHÔNG `exports` lại
 * module con — nếu module ở trục khác (VD: BookingsModule) cần dùng
 * UsersFacade, phải `import { UsersModule } from '.../modules/users/users.module.js'`
 * trực tiếp, KHÔNG import IdentityModule. Lý do: nếu cho phép import qua
 * aggregator, IdentityModule sẽ phải import ngược lại module ở trục khác để
 * aggregator đó cũng dùng được Identity — sinh vòng phụ thuộc giữa các
 * aggregator, làm mất tác dụng của việc tách trục.
 *
 * Thứ tự phụ thuộc nội bộ trục này: Users → Rbac → Auth (Auth phụ thuộc cả
 * hai qua facade). Đây là lý do imports không cần theo thứ tự cụ thể ở đây
 * (NestJS tự resolve theo dependency graph, không theo thứ tự khai báo), chỉ
 * ghi chú để người đọc code hiểu chiều phụ thuộc thật.
 */
@Module({
  imports: [UsersModule, RbacModule, AuthModule],
  exports: [RbacModule],
})
export class IdentityModule {}
