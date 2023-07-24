import Joi from 'joi';

export interface WeeklyStatsMailRequest {
    userID: string;
    accounts: string[];
    email?: string;
}

export const schema = {
    userID: Joi.string().required(),
    accounts: Joi.array<string>().required(),
    email: Joi.string().email(),
};

const joiSchema = Joi.object(schema);

export default joiSchema;
