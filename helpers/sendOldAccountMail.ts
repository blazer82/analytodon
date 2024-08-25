import nodemailer from 'nodemailer';
import getConfig from 'next/config';
import {User} from '@/types/User';
import {logger} from './logger';

const {serverRuntimeConfig, publicRuntimeConfig} = getConfig();

const sendOldAccountMail = async (user: User) => {
    logger.info(`Send old account mail to ${user._id}`);

    try {
        const transporter = nodemailer.createTransport(serverRuntimeConfig.nodemailerTransport);
        await transporter.sendMail({
            from: {name: publicRuntimeConfig.emailSenderName, address: publicRuntimeConfig.supportEmail},
            to: user.email,
            subject: "You haven't been on Analytodon in a while - we'll be deleting your data soon!",
            text:
                `Hi and thanks for signing up to Analytodon!\n\n` +
                `We haven't seen you in a while and we'll be deleting your data soon.\n` +
                `If you don't want your data to be deleted just log in to your dashboard:\n` +
                `${publicRuntimeConfig.appURL}\n\n` +
                `If you don't intend to use Analytodon anymore you don't need to do anything.\n\n` +
                `Best regards,\n` +
                `Raphael Stäbler\n` +
                `Analytodon\n\n` +
                `Email: ${publicRuntimeConfig.supportEmail}\n` +
                `Website: ${publicRuntimeConfig.marketingURL}\n` +
                `Mastodon: https://undefined.social/@analytodon\n`,
        });
    } catch (error: any) {
        logger.error(`Error while sending old account mail: ${error?.message}`);
    }
};

export default sendOldAccountMail;
