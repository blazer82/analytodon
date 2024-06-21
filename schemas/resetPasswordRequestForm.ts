import Joi from 'joi';

export interface ResetPasswordRequestFormData {
    email?: string;
}

export const schema = {
    email: Joi.string()
        .email({tlds: {allow: false}})
        .required(),
};

const joiSchema = Joi.object(schema);

export default joiSchema;
