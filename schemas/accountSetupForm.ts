import Joi from 'joi';
import {RegistrationFormData, schema as registrationFormSchema} from './registrationForm';

export type AccountSetupFormData = Pick<RegistrationFormData, 'serverURL' | 'timezone'> & {_id?: string};

export const schema = {
    _id: Joi.string(),
    serverURL: registrationFormSchema.serverURL,
    timezone: registrationFormSchema.timezone,
};

const joiSchema = Joi.object(schema);

export default joiSchema;
