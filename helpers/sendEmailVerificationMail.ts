import nodemailer from 'nodemailer';
import getConfig from 'next/config';
import {User} from '@/types/User';
import {logger} from './logger';

const {serverRuntimeConfig, publicRuntimeConfig} = getConfig();

const sendEmailVerificationMail = async (user: User) => {
    logger.info(`Send email verification mail to ${user._id}`);
    const verificationCode = user.emailVerificationCode;

    if (!verificationCode) {
        logger.error(`Failed to send email verification mail to ${user._id}: missing verification code`);
        return;
    }

    try {
        const transporter = nodemailer.createTransport(serverRuntimeConfig.nodemailerTransport);
        await transporter.sendMail({
            from: {name: publicRuntimeConfig.emailSenderName, address: publicRuntimeConfig.supportEmail},
            to: user.email,
            subject: 'Welcome to Analytodon - Please verify your email address',
            text:
                `Hi and welcome to Analytodon\n\n` +
                `To complete your signup, please verify your email address by clicking on the link below:\n\n` +
                `${publicRuntimeConfig.appURL}/register/verify?c=${verificationCode}\n\n` +
                `Best regards,\n` +
                `Raphael Stäbler\n` +
                `Analytodon\n\n` +
                `Email: ${publicRuntimeConfig.supportEmail}\n` +
                `Website: ${publicRuntimeConfig.marketingURL}\n` +
                `Mastodon: https://undefined.social/@analytodon\n`,
        });
    } catch (error: any) {
        logger.error(`Error while sending email verification mail: ${error?.message}`);
    }
};

export default sendEmailVerificationMail;
