import Joi from 'joi';

export interface ResetPasswordFormData {
    password?: string;
    token?: string;
}

export const schema = {
    password: Joi.string().min(4).required(),
    token: Joi.string().required(),
};

const joiSchema = Joi.object(schema);

export default joiSchema;
