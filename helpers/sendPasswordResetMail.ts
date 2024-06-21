import nodemailer from 'nodemailer';
import getConfig from 'next/config';
import {User} from '@/types/User';
import {logger} from './logger';

const {serverRuntimeConfig, publicRuntimeConfig} = getConfig();

const sendPasswordResetMail = async (user: User) => {
    logger.info(`Send password reset mail to ${user._id}`);

    try {
        const transporter = nodemailer.createTransport(serverRuntimeConfig.nodemailerTransport);
        await transporter.sendMail({
            from: {name: publicRuntimeConfig.emailSenderName, address: publicRuntimeConfig.supportEmail},
            to: user.email,
            subject: 'Reset your Analytodon password!',
            text:
                `Hi,\n\n` +
                `You requested a link to reset your Analytodon password.\n` +
                `If this wasn't you then you can just ignore this email.\n\n` +
                `Click here to reset your password:\n` +
                `${publicRuntimeConfig.appURL}/reset-password?t=${user.resetPasswordToken}\n\n` +
                `Best regards,\n` +
                `Raphael Stäbler\n` +
                `Analytodon\n\n` +
                `Email: ${publicRuntimeConfig.supportEmail}\n` +
                `Website: ${publicRuntimeConfig.marketingURL}\n` +
                `Mastodon: https://undefined.social/@analytodon\n`,
        });
    } catch (error: any) {
        logger.error(`Error while sending password reset mail: ${error?.message}`);
    }
};

export default sendPasswordResetMail;
