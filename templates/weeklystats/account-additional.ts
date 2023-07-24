import {KPI} from '@/types/KPI';
import trend from './trend';

export default ({accountName, followers, replies, boosts, favorites}: {accountName: string; followers: KPI; replies: KPI; boosts: KPI; favorites: KPI}) => `
<tr>
    <td height="30" style="font-size: 1px; line-height: 1px; height: 30px">
        <!--[if gte mso 15]>&nbsp;<![endif]-->
    </td>
</tr>
<tr>
    <td>
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
