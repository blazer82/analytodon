import Joi from 'joi';
import timezones from '@/helpers/timezones.json';

export interface RegistrationFormData {
    email: string;
    password: string;
    serverURL: string;
    timezone: string;
}

export const schema = {
    email: Joi.string()
        .email({tlds: {allow: false}})
        .required(),
    password: Joi.string().min(4).required(),
    serverURL: Joi.alternatives().try(Joi.string().hostname(), Joi.string().uri()).required(),
    timezone: Joi.string()
        .valid(...timezones.map(({name}) => name))
        .required(),
};

const joiSchema = Joi.object(schema);

export default joiSchema;
