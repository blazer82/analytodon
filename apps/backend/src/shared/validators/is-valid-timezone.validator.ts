import * as fs from 'fs';
import * as path from 'path';

import { Logger } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Assuming timezones.json is in apps/backend/src/shared/data/timezones.json
// Adjust the path as necessary based on your project structure and where this validator is located.
const timezonesPath = path.join(__dirname, '../data/timezones.json'); // Relative path from this validator file

interface TimezoneEntry {
  name: string;
  utcOffset: string;
}

let validTimezones: string[] = [];

try {
  const timezonesFile = fs.readFileSync(timezonesPath, 'utf-8');
  const timezonesData: TimezoneEntry[] = JSON.parse(timezonesFile);
  validTimezones = timezonesData.map((tz) => tz.name);
} catch (error) {
  new Logger('IsValidTimezoneConstraint').error('Failed to load or parse timezones.json:', error);
  // Depending on strictness, you might want to throw an error here
  // or allow the application to start with timezone validation potentially not working.
  // For now, it will log an error, and validation will fail for any timezone if the file is missing/corrupt.
}

@ValidatorConstraint({ name: 'isValidTimezone', async: false })
export class IsValidTimezoneConstraint implements ValidatorConstraintInterface {
  validate(timezone: unknown, _args: ValidationArguments) {
    if (typeof timezone !== 'string') {
      return false;
    }
    return validTimezones.includes(timezone);
  }

  defaultMessage(_args: ValidationArguments) {
    return `Timezone ($value) is not a valid timezone.`;
  }
}

export function IsValidTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTimezoneConstraint,
    });
  };
}
