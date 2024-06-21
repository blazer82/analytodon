import Joi from 'joi';

export interface OldAccountMailRequest {
    userID: string;
}

export const schema = {
    userID: Joi.string().required(),
};

const joiSchema = Joi.object(schema);

export default joiSchema;
