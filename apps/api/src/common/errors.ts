import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}

export const Errors = {
  otpInvalid: () =>
    new AppException('OTP_INVALID', 'Invalid or expired confirmation code', HttpStatus.UNAUTHORIZED),
  otpLocked: () =>
    new AppException('OTP_LOCKED', 'Too many confirmation attempts', HttpStatus.TOO_MANY_REQUESTS),
  pinLocked: () =>
    new AppException('PIN_LOCKED', 'Too many PIN attempts', HttpStatus.TOO_MANY_REQUESTS),
  userBlocked: () =>
    new AppException('USER_BLOCKED', 'Account is blocked', HttpStatus.FORBIDDEN),
  userNotFound: () =>
    new AppException('USER_NOT_FOUND', 'User not found', HttpStatus.UNAUTHORIZED),
  pinInvalid: () =>
    new AppException('PIN_INVALID', 'Invalid phone or PIN', HttpStatus.UNAUTHORIZED),
  pinNotSet: () =>
    new AppException('PIN_NOT_SET', 'PIN is not set, use OTP', HttpStatus.UNAUTHORIZED),
  deviceConflict: () =>
    new AppException(
      'DEVICE_CONFLICT',
      'Account is already active on another device',
      HttpStatus.CONFLICT,
    ),
  deviceInvalid: () =>
    new AppException('DEVICE_INVALID', 'Device is not active', HttpStatus.FORBIDDEN),
  entitlementInactive: () =>
    new AppException('ENTITLEMENT_INACTIVE', 'Access has expired', HttpStatus.FORBIDDEN),
  refreshInvalid: () =>
    new AppException('REFRESH_INVALID', 'Refresh token is invalid', HttpStatus.UNAUTHORIZED),
  adminInvalid: () =>
    new AppException('ADMIN_INVALID', 'Invalid admin credentials', HttpStatus.UNAUTHORIZED),
  totpRequired: () =>
    new AppException('TOTP_REQUIRED', 'Admin TOTP is required', HttpStatus.UNAUTHORIZED),
  totpInvalid: () =>
    new AppException('TOTP_INVALID', 'Invalid TOTP code', HttpStatus.UNAUTHORIZED),
  settingInvalid: (message: string) =>
    new AppException('SETTING_INVALID', message, HttpStatus.BAD_REQUEST),
  socialInvalid: () =>
    new AppException('SOCIAL_INVALID', 'Google or Apple sign-in failed', HttpStatus.UNAUTHORIZED),
  phoneTaken: () =>
    new AppException('PHONE_TAKEN', 'This phone number is already registered', HttpStatus.CONFLICT),
  phoneInvalid: () =>
    new AppException('PHONE_INVALID', 'Enter a valid phone number', HttpStatus.BAD_REQUEST),
  passwordTooShort: () =>
    new AppException('PASSWORD_TOO_SHORT', 'Password must be at least 8 characters', HttpStatus.BAD_REQUEST),
  passwordMismatch: () =>
    new AppException('PASSWORD_MISMATCH', 'Passwords do not match', HttpStatus.BAD_REQUEST),
  passwordWeak: () =>
    new AppException(
      'PASSWORD_WEAK',
      'Password must include a letter and a number',
      HttpStatus.BAD_REQUEST,
    ),
  passwordNotSet: () =>
    new AppException('PASSWORD_NOT_SET', 'Set a password using the SMS code', HttpStatus.UNAUTHORIZED),
  csrfInvalid: () =>
    new AppException('CSRF_INVALID', 'Request could not be verified', HttpStatus.FORBIDDEN),
  authInvalid: () =>
    new AppException('AUTH_INVALID', 'Phone number or password is incorrect', HttpStatus.UNAUTHORIZED),
  authLocked: () =>
    new AppException('AUTH_LOCKED', 'Too many sign-in attempts', HttpStatus.TOO_MANY_REQUESTS),
};
