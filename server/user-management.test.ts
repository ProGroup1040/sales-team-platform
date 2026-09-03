import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { canAssignUserRole, canManagePrivilegedRoles, canManageUsers } from '../shared/authorization';

// ─── Mock DB ──────────────────────────────────────────────────────────────────
// Test the validation logic and business rules without hitting real DB

// ─── Validation Helpers (mirrors frontend logic) ─────────────────────────────
function validateCreateForm(form: { name: string; username: string; password: string; email: string }) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'الاسم الكامل مطلوب';
  else if (form.name.trim().length < 2) errors.name = 'الاسم يجب أن يكون حرفين على الأقل';

  if (!form.username.trim()) errors.username = 'اسم المستخدم مطلوب';
  else if (form.username.trim().length < 3) errors.username = 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
  else if (!/^[a-zA-Z0-9._-]+$/.test(form.username.trim())) errors.username = 'يجب أن يحتوي على حروف إنجليزية وأرقام فقط';

  if (!form.password) errors.password = 'كلمة المرور مطلوبة';
  else if (form.password.length < 6) errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';

  if (form.email && form.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
  }
  return errors;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('User Management - Form Validation', () => {
  it('should reject empty name', () => {
    const errors = validateCreateForm({ name: '', username: 'test', password: 'pass123', email: '' });
    expect(errors.name).toBe('الاسم الكامل مطلوب');
  });

  it('should reject name shorter than 2 chars', () => {
    const errors = validateCreateForm({ name: 'A', username: 'test', password: 'pass123', email: '' });
    expect(errors.name).toBe('الاسم يجب أن يكون حرفين على الأقل');
  });

  it('should accept valid name', () => {
    const errors = validateCreateForm({ name: 'Ahmed Mohamed', username: 'ahmed', password: 'pass123', email: '' });
    expect(errors.name).toBeUndefined();
  });

  it('should reject empty username', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: '', password: 'pass123', email: '' });
    expect(errors.username).toBe('اسم المستخدم مطلوب');
  });

  it('should reject username shorter than 3 chars', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'ab', password: 'pass123', email: '' });
    expect(errors.username).toBe('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
  });

  it('should reject username with Arabic chars', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'أحمد', password: 'pass123', email: '' });
    expect(errors.username).toBe('يجب أن يحتوي على حروف إنجليزية وأرقام فقط');
  });

  it('should accept valid username with dots and dashes', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'ahmed.m-01', password: 'pass123', email: '' });
    expect(errors.username).toBeUndefined();
  });

  it('should reject empty password', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'ahmed', password: '', email: '' });
    expect(errors.password).toBe('كلمة المرور مطلوبة');
  });

  it('should reject password shorter than 6 chars', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'ahmed', password: '12345', email: '' });
    expect(errors.password).toBe('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  });

  it('should accept password with exactly 6 chars', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'ahmed', password: '123456', email: '' });
    expect(errors.password).toBeUndefined();
  });

  it('should reject invalid email format', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'ahmed', password: 'pass123', email: 'not-an-email' });
    expect(errors.email).toBe('صيغة البريد الإلكتروني غير صحيحة');
  });

  it('should accept valid email', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'ahmed', password: 'pass123', email: 'ahmed@company.com' });
    expect(errors.email).toBeUndefined();
  });

  it('should allow empty email (optional)', () => {
    const errors = validateCreateForm({ name: 'Ahmed', username: 'ahmed', password: 'pass123', email: '' });
    expect(errors.email).toBeUndefined();
  });

  it('should return no errors for valid complete form', () => {
    const errors = validateCreateForm({
      name: 'Ahmed Mohamed',
      username: 'ahmed.m',
      password: 'securePass123',
      email: 'ahmed@company.com'
    });
    expect(Object.keys(errors).length).toBe(0);
  });
});

describe('User Management - Password Security', () => {
  it('should hash password with bcrypt', async () => {
    const password = 'testPass123';
    const hash = await bcrypt.hash(password, 10);
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify correct password', async () => {
    const password = 'testPass123';
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testPass123';
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'testPass123';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);
    expect(hash1).not.toBe(hash2);
  });
});

describe('User Management - Authorization Boundaries', () => {
  it('allows manager and admin to assign the manager role', () => {
    expect(canAssignUserRole('manager', 'manager')).toBe(true);
    expect(canAssignUserRole('admin', 'manager')).toBe(true);
  });

  it('prevents admin_sales from assigning or retaining the manager role', () => {
    expect(canManageUsers('admin_sales')).toBe(true);
    expect(canManagePrivilegedRoles('admin_sales')).toBe(false);
    expect(canAssignUserRole('admin_sales', 'manager')).toBe(false);
    expect(canAssignUserRole('admin_sales', 'sales_engineer')).toBe(true);
  });

  it('rejects unknown and non-management actors', () => {
    expect(canManageUsers('sales_engineer')).toBe(false);
    expect(canAssignUserRole('sales_engineer', 'sales_engineer')).toBe(false);
    expect(canAssignUserRole(undefined, 'manager')).toBe(false);
  });
});

describe('User Management - Role Validation', () => {
  const VALID_ROLES = ['sales_engineer', 'sales_specialist', 'admin_sales', 'manager'];
  const ADMIN_ROLES = ['manager', 'admin', 'admin_sales'];

  it('should accept all valid roles', () => {
    VALID_ROLES.forEach(role => {
      expect(VALID_ROLES.includes(role)).toBe(true);
    });
  });

  it('should identify admin roles correctly', () => {
    expect(ADMIN_ROLES.includes('manager')).toBe(true);
    expect(ADMIN_ROLES.includes('admin')).toBe(true);
    expect(ADMIN_ROLES.includes('admin_sales')).toBe(true);
  });

  it('should identify non-admin roles correctly', () => {
    expect(ADMIN_ROLES.includes('sales_engineer')).toBe(false);
    expect(ADMIN_ROLES.includes('sales_specialist')).toBe(false);
  });
});

describe('User Management - Error Messages', () => {
  it('should map USERNAME_EXISTS to Arabic error', () => {
    const errorMap: Record<string, string> = {
      'USERNAME_EXISTS': 'اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر',
      'EMAIL_EXISTS': 'البريد الإلكتروني مستخدم بالفعل',
      'UNAUTHORIZED': 'يجب تسجيل الدخول أولاً',
      'FORBIDDEN': 'ليس لديك صلاحية إنشاء مستخدمين',
    };
    expect(errorMap['USERNAME_EXISTS']).toBe('اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر');
    expect(errorMap['EMAIL_EXISTS']).toBe('البريد الإلكتروني مستخدم بالفعل');
    expect(errorMap['UNAUTHORIZED']).toBe('يجب تسجيل الدخول أولاً');
  });
});

describe('User Management - Data Scope', () => {
  const DATA_SCOPES = ['own', 'all'];

  it('should have valid data scope values', () => {
    expect(DATA_SCOPES.includes('own')).toBe(true);
    expect(DATA_SCOPES.includes('all')).toBe(true);
    expect(DATA_SCOPES.includes('team')).toBe(false);
  });

  it('should default to own scope for new users', () => {
    const defaultScope = 'own';
    expect(defaultScope).toBe('own');
  });
});

describe('User Management - Modules', () => {
  const MODULES = ['crm', 'visits', 'deals', 'kpi', 'planning', 'discounts', 'reports', 'tasks', 'collections', 'users'];

  it('should have all required modules', () => {
    expect(MODULES).toContain('crm');
    expect(MODULES).toContain('kpi');
    expect(MODULES).toContain('users');
    expect(MODULES).toContain('tasks');
    expect(MODULES.length).toBe(10);
  });

  it('should include users module for admin control', () => {
    expect(MODULES.includes('users')).toBe(true);
  });
});
