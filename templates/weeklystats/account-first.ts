import {KPI} from '@/types/KPI';
import trend from './trend';

export default ({accountName, followers, replies, boosts, favorites}: {accountName: string; followers: KPI; replies: KPI; boosts: KPI; favorites: KPI}) => `
<tr>
<td>
    <!--#loop#-->
    <!--#loopitem#-->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="" data-style="background-color:inherit; padding: 0px; border: 0px;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;border:0px;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="center" valign="top" class="cr-image">
                                    <!--#image forcepx="true" margin="0px 20px 0px 20px"#-->
                                    <div class="cred-factory container cred-image-toolbar" style="" data-type="container" data-trash="true">
                                        <div data-trash="true" class="cred-factory hfbtn cred-btn fa fa-crop cred-plg-imagecrop" style=""></div>
                                    </div>
                                    <table cellpadding="0" cellspacing="0" style="width: 100%; border: 0px; padding: 0px; margin: 0px">
                                        <tbody>
                                            <tr>
                                                <td align="center" style="text-align: center; line-height: 0px; padding: 0px 20px; font-size: 18px">
                                                    <a href="https://www.analytodon.com" target="_blank" style="
                                                            color: #082137;
                                                            text-decoration: none;
                                                            display: inline-block;
                                                            width: 100%;
                                                            line-height: 20px;
                                                        " title="">
                                                        <img src="data:image/png;base64,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" alt="" height="20" style="
                                                                border: 0px;
                                                                margin: 0px;
                                                                padding: 0px;
                                                                display: inline;
                                                                width: auto;
                                                                height: 20px;
                                                            " class="" align="">&nbsp;&nbsp;Analytodon</a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <!--#/image#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->
    <!--#loopitem#-->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="padding: 30px 30px 30px 30px" data-style="background-color:inherit;border: 0px;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;border:0px;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="left" valign="top" style="
                                        font-family: Helvetica, Arial, sans-serif !important;
                                        font-size: 15px;
                                        line-height: 120%;
                                        font-weight: normal;
                                        letter-spacing: inherit; ;;
                                    " data-style="padding:0px;" class="cr-text editable" data-name="Text">
                                    <!--#html#-->
                                    <h1 style="color: #082137; text-align: center" align="left">
                                        <span style="font-family: arial, helvetica, sans-serif"><strong>Weekly Stats Overview for Your Mastodon Accounts</strong></span>
                                    </h1>
                                    <!--#/html#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->
    <!--#loopitem#-->

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="padding: 10px 20px; border: 0px" data-style="background-color:inherit;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;border:inherit;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="left" valign="top" style="
                                        font-family: Helvetica, Arial, sans-serif !important;
                                        font-size: 15px;
                                        line-height: 120%;
                                        font-weight: normal;
                                        letter-spacing: inherit; ;;
                                    " class="cr-text">
                                    <!--#html#-->
                                    <div style="text-align: center">
                                        <span style="font-size: 24px">${accountName}</span>
                                    </div>
                                    <!--#/html#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->

    <!--#/loop#-->
</td>
</tr>
<tr>
<td height="10" style="font-size: 1px; line-height: 1px; height: 10px">
    <!--[if gte mso 15]>&nbsp;<![endif]-->
</td>
</tr>
<tr>
<td align="center" valign="top" style="background-color: #ffffff; padding: 10px 0; border-radius: 3px" class="bgcolor2">
    <!--#loop#-->
    <!--#loopitem#-->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="padding: 10px 20px" data-style="background-color:inherit; border: 0px;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;border:0px;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="left" valign="top" style="
                                        font-family: Helvetica, Arial, sans-serif !important;
                                        font-size: 15px;
                                        line-height: 120%;
                                        font-weight: normal;
                                        letter-spacing: inherit; ;;
                                    " data-style="padding:0px;" class="cr-text editable" data-name="Text">
                                    <!--#html#-->
                                    <div align="left">
                                        <p class="false" style="text-align: center" align="left">
                                            <span style="font-size: 15px"><span style="font-size: 18px"><strong>Followers</strong> gained</span><br></span><br><span style="font-size: 36px">${trend(
                                                followers,
                                            )}</span>
                                        </p>
                                    </div>
                                    <!--#/html#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->
    <!--#loopitem#-->

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="" data-style="background-color:inherit;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="center" valign="top" class="cr-divider">
                                    <!--#divider padding="40px" width="85%" align="center" height="2px" color="#888888"#-->
                                    <table width="100%" class="cred-divider-container" cellpadding="0" cellspacing="0" border="0">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="cred-divider" border="0" cellpadding="0" cellspacing="0" width="95%" align="center">
                                                        <tbody>
                                                            <tr>
                                                                <td class="cred-divider-spacer" style="font-size: 0px; line-height: 0px" height="10"></td>
                                                            </tr>
                                                            <tr>
                                                                <td class="cred-divider-line" valign="top" height="2" style="
                                                                        height: 2px;
                                                                        background: #cccccc;
                                                                        font-size: 0px;
                                                                        line-height: 0px;
                                                                    ">
                                                                    <!--[if gte mso 15]>&nbsp;<![endif]-->
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td class="cred-divider-spacer" style="font-size: 0px; line-height: 0px" height="10"></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <!--#/divider#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->
    <!--#loopitem#-->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="padding: 10px 20px" data-style="background-color:inherit; border: 0px;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;border:0px;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="left" valign="top" style="
                                        font-family: Helvetica, Arial, sans-serif !important;
                                        font-size: 15px;
                                        line-height: 120%;
                                        font-weight: normal;
                                        letter-spacing: inherit; ;;
                                    " data-style="padding:0px;" class="cr-text editable" data-name="Text">
                                    <!--#html#-->
                                    <div align="left">
                                        <p class="false" style="text-align: center" align="left">
                                            <span style="font-size: 18px"><strong>Replies</strong> received<br></span><br><span style="font-size: 36px">${trend(
                                                replies,
                                            )}</span>
                                        </p>
                                    </div>
                                    <!--#/html#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->
    <!--#loopitem#-->

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="" data-style="background-color:inherit;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="center" valign="top" class="cr-divider">
                                    <!--#divider padding="40px" width="85%" align="center" height="2px" color="#888888"#-->
                                    <table width="100%" class="cred-divider-container" cellpadding="0" cellspacing="0" border="0">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="cred-divider" border="0" cellpadding="0" cellspacing="0" width="95%" align="center">
                                                        <tbody>
                                                            <tr>
                                                                <td class="cred-divider-spacer" style="font-size: 0px; line-height: 0px" height="10"></td>
                                                            </tr>
                                                            <tr>
                                                                <td class="cred-divider-line" valign="top" height="2" style="
                                                                        height: 2px;
                                                                        background: #cccccc;
                                                                        font-size: 0px;
                                                                        line-height: 0px;
                                                                    ">
                                                                    <!--[if gte mso 15]>&nbsp;<![endif]-->
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td class="cred-divider-spacer" style="font-size: 0px; line-height: 0px" height="10"></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <!--#/divider#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->
    <!--#loopitem#-->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="padding: 10px 20px" data-style="background-color:inherit; border: 0px;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;border:0px;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="left" valign="top" style="
                                        font-family: Helvetica, Arial, sans-serif !important;
                                        font-size: 15px;
                                        line-height: 120%;
                                        font-weight: normal;
                                        letter-spacing: inherit; ;;
                                    " data-style="padding:0px;" class="cr-text editable" data-name="Text">
                                    <!--#html#-->
                                    <div align="left">
                                        <p class="false" style="text-align: center" align="left">
                                            <span style="font-size: 18px"><strong>Boosts</strong> received<br></span><br><span style="font-size: 36px">${trend(
                                                boosts,
                                            )}</span>
                                        </p>
                                    </div>
                                    <!--#/html#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->
    <!--#loopitem#-->

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="" data-style="background-color:inherit;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="center" valign="top" class="cr-divider">
                                    <!--#divider padding="40px" width="85%" align="center" height="2px" color="#888888"#-->
                                    <table width="100%" class="cred-divider-container" cellpadding="0" cellspacing="0" border="0">
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <table class="cred-divider" border="0" cellpadding="0" cellspacing="0" width="95%" align="center">
                                                        <tbody>
                                                            <tr>
                                                                <td class="cred-divider-spacer" style="font-size: 0px; line-height: 0px" height="10"></td>
                                                            </tr>
                                                            <tr>
                                                                <td class="cred-divider-line" valign="top" height="2" style="
                                                                        height: 2px;
                                                                        background: #cccccc;
                                                                        font-size: 0px;
                                                                        line-height: 0px;
                                                                    ">
                                                                    <!--[if gte mso 15]>&nbsp;<![endif]-->
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td class="cred-divider-spacer" style="font-size: 0px; line-height: 0px" height="10"></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <!--#/divider#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->
    <!--#loopitem#-->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tbody>
            <tr>
                <td align="center" valign="top" style="padding: 10px 20px" data-style="background-color:inherit; border: 0px;" class="cr-container editable" data-name="Container">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cr-maxwidth editable" style="max-width: 640px" data-style="background-color:inherit;border:0px;" data-name="Inner container">
                        <tbody>
                            <tr>
                                <td align="left" valign="top" style="
                                        font-family: Helvetica, Arial, sans-serif !important;
                                        font-size: 15px;
                                        line-height: 120%;
                                        font-weight: normal;
                                        letter-spacing: inherit; ;;
                                    " data-style="padding:0px;" class="cr-text editable" data-name="Text">
                                    <!--#html#-->
                                    <div align="left">
                                        <p class="false" style="text-align: center" align="left">
                                            <span style="font-size: 18px"><strong>Favorites</strong> received<br></span><br><span style="font-size: 36px">${trend(
                                                favorites,
                                            )}</span>
                                        </p>
                                    </div>
                                    <!--#/html#-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
        </tbody>
    </table>
    <!--#/loopitem#-->

    <!--#/loop#-->
</td>
</tr>
`;
