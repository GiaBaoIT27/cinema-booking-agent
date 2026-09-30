/** Integration event: module `users` phát sau khi tạo tài khoản khách hàng. */
export interface UserRegisteredEventPayload {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
}
