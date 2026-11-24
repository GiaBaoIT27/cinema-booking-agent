export interface CustomerRef {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
}

/** Thông tin liên hệ của khách – dữ liệu thuộc module `users`. */
export interface ICustomerLookup {
  findById(userId: string): Promise<CustomerRef | null>;
}

export const CUSTOMER_LOOKUP = Symbol('CUSTOMER_LOOKUP');
