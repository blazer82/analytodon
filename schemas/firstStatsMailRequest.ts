import Joi from 'joi';

export interface FirstStatsMailRequest {
    userID: string;
    accounts: string[];
}

export const schema = {
    userID: Joi.string().required(),
    accounts: Joi.array<string>().required(),
};

const joiSchema = Joi.object(schema);

export default joiSchema;
