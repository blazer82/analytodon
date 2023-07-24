import nodemailer from 'nodemailer';
import getConfig from 'next/config';
import {User} from '@/types/User';
import {logger} from './logger';

const {serverRuntimeConfig, publicRuntimeConfig} = getConfig();

const sendSignupNotificationMail = async (user: User) => {
    logger.info(`Send sign up notification mail to admin`);

    try {
        const transporter = nodemailer.createTransport(serverRuntimeConfig.nodemailerTransport);
        await transporter.sendMail({
            from: {name: publicRuntimeConfig.emailSenderName, address: publicRuntimeConfig.supportEmail},
            to: publicRuntimeConfig.supportEmail,
            subject: 'Analytodon: New Sign Up',
            text:
                `A new user just signed up to Analytodon\n\n` +
                `${user.email}\n\n` +
                `Best regards,\n` +
                `Raphael Stäbler\n` +
                `Analytodon\n\n` +
                `Email: ${publicRuntimeConfig.supportEmail}\n` +
                `Website: ${publicRuntimeConfig.marketingURL}\n` +
                `Mastodon: https://undefined.social/@analytodon\n`,
        });
    } catch (error: any) {
        logger.error(`Error while sending sign up notification mail: ${error?.message}`);
    }
};

export default sendSignupNotificationMail;
