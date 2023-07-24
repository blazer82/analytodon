import type {NextApiRequest, NextApiResponse} from 'next';
import nodemailer from 'nodemailer';
import {setNoCache} from '@/helpers/setNoCache';
import handleAuthentication from '@/helpers/handleAuthentication';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import dbConnect from '@/helpers/dbConnect';
import {logger} from '@/helpers/logger';
import {Email} from '@/types/Email';
import getConfig from 'next/config';
import UserModel from '@/models/UserModel';

const {publicRuntimeConfig, serverRuntimeConfig} = getConfig();

const BATCH_SIZE = 5;

const handle = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    setNoCache(res);

    const {role: userRole} = await handleAuthentication([UserRole.Admin], AuthResponseType.Error, {req, res});

    if (!userRole) {
        return;
    }

    switch (req.method) {
        case 'POST':
            return await handlePost(req, res);
        default:
            return res.status(405).end();
    }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    try {
        await dbConnect();

        const {recipientGroup, recipients: recipientsString, subject, text, isTest} = req.body as Email & {isTest: boolean};

        logger.info(`Send${isTest ? ' TEST' : ''} email to ${recipientGroup} group: ${subject}`);

        const transporter = nodemailer.createTransport(serverRuntimeConfig.nodemailerTransport);

        const recipients = new Set<{_id: string; email: string}>();
        recipients.add({_id: '__admin__', email: publicRuntimeConfig.supportEmail});

        if (!isTest) {
            if (recipientGroup === 'custom') {
                for (const recipient of recipientsString.split(/\s+/gm)) {
                    recipients.add({_id: '__noid__', email: recipient});
                }
            } else {
                const users = await UserModel.find({
                    isActive: true,
                    emailVerified: true,
                    role: recipientGroup,
                    unsubscribed: {$nin: ['news']},
                });

                for (const user of users) {
                    recipients.add({_id: `${user._id}`, email: user.email});
                }
            }
        }

        const recipientList = Array.from(recipients);

        const emailBatches = Array.from({length: Math.ceil(recipientList.length / BATCH_SIZE)}, (_, i) =>
            recipientList.slice(i * BATCH_SIZE, i * BATCH_SIZE + BATCH_SIZE),
        );

        for (const batch of emailBatches) {
            await Promise.all(
                batch.map(async (recipient) => {
                    const mailSubject = `${isTest ? 'TEST: ' : ''}${subject}`;
                    const mailText = text
                        .replaceAll('[[userid]]', encodeURIComponent(recipient._id))
                        .replaceAll('[[email]]', encodeURIComponent(recipient.email));

                    logger.info(`Send ${mailSubject} to ${recipient._id}`);

                    await transporter.sendMail({
                        from: {name: publicRuntimeConfig.emailSenderName, address: publicRuntimeConfig.supportEmail},
                        to: recipient.email,
                        subject: mailSubject,
                        text: mailText,
                    });
                }),
            );
        }

        return res.end();
    } catch (error: any) {
        logger.error(error?.message);
        return res.status(500).end();
    }
};

export default handle;
