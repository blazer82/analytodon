import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Supported locales - should match i18n configuration and frontend i18n config
const SUPPORTED_LOCALES = ['en', 'de'] as const;

@ValidatorConstraint({ name: 'isValidLocale', async: false })
export class IsValidLocaleConstraint implements ValidatorConstraintInterface {
  validate(locale: unknown, _args: ValidationArguments) {
    if (typeof locale !== 'string') {
      return false;
    }
    return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
  }

  defaultMessage(_args: ValidationArguments) {
    return `Locale ($value) is not a valid locale. Supported locales: ${SUPPORTED_LOCALES.join(', ')}`;
  }
}

export function IsValidLocale(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidLocaleConstraint,
    });
  };
}

// Export supported locales for reuse in other parts of the application
export { SUPPORTED_LOCALES };
