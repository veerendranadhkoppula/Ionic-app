import { findUserByEmail } from './authStorage';

// Simple mock API helpers. All functions simulate async behavior with Promises.

export function checkEmailExists(email: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const found = !!findUserByEmail(email) || email === 'existing@example.com';
      resolve(found);
    }, 400);
  });
}

export function sendOtp(email: string): Promise<string> {
  // Use the email parameter so linters don't flag it as unused.
  void email;
  // We return a mock OTP code (always '1234') but the UI won't display it.
  return new Promise((resolve) => setTimeout(() => resolve('1234'), 300));
}

export function validateOtp(email: string, otp: string): Promise<boolean> {
  return new Promise((resolve) => setTimeout(() => resolve(otp === '1234'), 300));
}
