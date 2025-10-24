// common/decorators/match.decorator.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator constraint cho Match decorator
 */
@ValidatorConstraint({ name: 'Match', async: false })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} phải khớp với ${relatedPropertyName}`;
  }
}

/**
 * Decorator để kiểm tra 2 field có giá trị giống nhau
 * Ví dụ: password và confirmPassword
 *
 * @example
 * class CreateUserDto {
 *   @IsString()
 *   password: string;
 *
 *   @Match('password', { message: 'Mật khẩu xác nhận không khớp' })
 *   confirmPassword: string;
 * }
 */
export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'Match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: MatchConstraint,
    });
  };
}
