export default ({accounts, unsubscribeURL}: {accounts: string; unsubscribeURL: string}) => `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />

        <style hash="39ecbcf2ebf27047e142cd975e5850c3">
            .cr-text {
                font-family: Helvetica, Arial, sans-serif !important;
                font-size: 15px;
                line-height: 120%;
                font-weight: normal;
                letter-spacing: inherit;
            }
        </style>

        <style type="cr/theme">
            .cr-mainwidth,
            .cr-maxwidth {
                max-width: 640px;
            }
            .color1 {
                color: #f5f5f5;
            }
            .color2 {
                color: #ffffff;
            }
            .color3 {
                color: #082137;
            }
            .color4 {
                color: #082137;
            }
            .color5 {
                color: #1976d2;
            }
            .bgcolor1 {
                background-color: #f5f5f5;
            }
            .bgcolor2 {
                background-color: #ffffff;
            }
            .bgcolor3 {
                background-color: #082137;
            }
            .bgcolor4 {
                background-color: #082137;
            }
            .bgcolor5 {
                background-color: #1976d2;
            }
            a {
                color: #1976d2;
            }
            body {
                color: #082137;
            }
            .footer {
                color: #082137;
            }
            .footer .cr-text {
                color: #082137;
            }
            hr {
                background-color: #ffffff;
            }
            h1,
            h2,
            h3,
            h4,
            h5,
            h6 {
                color: #082137;
            }
            .cred_Nb-Is {
                background-color: #ffffff;
            }
        </style>

        <style hash="b37272b3ea5584e9b70091a85da1ba">
            body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; }
            #body_style { font-family: inherit !important; font-size: inherit !important; line-height: inherit !important; color: inherit !important; margin: inherit !important; padding: inherit !important; }
            a { display: inline-block !important; }
            u + #body a { color: inherit; text-decoration: none; font-size: inherit; font-family: inherit; font-weight: inherit; line-height: inherit; width: 100%; }
            .cred_Be, .cred_Be a { line-height: 100% !important; }
            h1, h2, h3, h4, h5, h6 { font-weight: 300; line-height: 1.1; padding: 0; margin-top: 0; Margin-top: 0; margin-bottom: 5px; Margin-bottom: 5px; }
            h1 { font-size: 2em; }
            h2 { font-size: 1.8em; }
            h3 { font-size: 1.6em; }
            h4 { font-size: 1.4em; }
            h5 { font-size: 1.2em; }
            h6 { font-size: 1em; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            table { border-collapse: collapse !important; }
            hr { height: 2px; !important; border: 0 none !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; mso-line-height-rule: exactly; font-size: 0px; line-height: 0px; margin: 9px 0 9px 0; Margin: 9px 0 9px 0; }
            img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
            .cred_Ie a { display: block !important; width: 100%; line-height: 0px; }
            .cred_Ub a { display: inline !important; }
            .cred_Bt a { display: block !important; }
            .cred_Bt img { display: block !important; min-width: 160px; width: 160px !important; min-height: 60px; height: 60px !important; }
            .cred_Ie .cred_Da { line-height: 0px; }
            a.cred-index-anchor { display: block !important; height: 0px !important; line-height: 0px !important; font-size: 0px !important; }
            #cred_Nb-Cb { display: none !important; }
            a[x-apple-data-detectors] { color: inherit !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
            #MessageViewBody, #MessageWebViewDiv { width: 100% !important; }
        </style>
        <!--[if gt mso 16]>
            <style>
                .cred_Bm16 {
                    font-size: 15px !important;
                    line-height: 139.5% !important;
                }
            </style>
        <![endif]-->
        <!--[if (gte mso 9)|(IE)]>
            <xml>
                <o:OfficeDocumentSettings>
                    <o:AllowPNG />
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
        <![endif]-->

        <style hash="3a895841cadfb9c9a4fca7599b4aef4b">
            /*  @title Link Design
          @order 0 */
            a {
                text-decoration: none;
            }
        </style>

        <style hash="6b4c9efc6ba4db1f1250125fbe2bd123">
            /* @title  Mobile view padding
        @group Images
        @order 1 */
            @media (max-width: 600px) {
                .cr-image {
                    padding: 20px !important;
                }
            }
        </style>

        <style hash="75593a18a6a84038364cafbb43a47e53">
            .cr-col {
                width: 100%;
                display: inline-block;
                vertical-align: top;
            }
            .cr-col-3 {
                max-width: 33.333%;
            }
            .cr-col-6 {
                max-width: 50%;
            }
            .cr-col-9 {
                max-width: 66.666%;
            }
            @media screen and (max-width: 600px) {
                .cr-col {
                    max-width: 100%;
                    padding: 10px 0px !important;
                }
                .cr-col-first,
                .cr-col-last {
                    padding: 0px !important;
                }
                .cr-col img {
                    width: 100% !important;
                    height: 100% !important;
                }
            }
        </style>

        <style hash="d998e4e551e1560e62c821d1319d745f">
            .cr-col {
                width: 100%;
                display: inline-block;
                vertical-align: top;
            }
            .cr-col-3 {
                max-width: 33.333%;
            }
            .cr-col-6 {
                max-width: 50%;
            }
            .cr-col-9 {
                max-width: 66.666%;
            }
            @media screen and (max-width: 600px) {
                .cr-col {
                    max-width: 100%;
                    padding: 10px 0px !important;
                }
                .cr-col-first,
                .cr-col-last {
                    padding: 0px !important;
                }
                .cr-col img {
                    width: 100% !important;
                    /* height: 100% !important;  */
                }
            }
        </style>
        <style data-source="autogenerated google-fixes">
            u + #body a {
                color: #1976d2;
                display: inline-block !important;
                text-decoration: none;
            }
            u + #body {
                color: #082137;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }
        </style>
    </head>
    <body
        bgcolor="#f5f5f5"
        style="
            color: #082137;
            background-color: #f5f5f5;
            color: #082137;
            font-family: Helvetica, Arial, sans-serif !important;
            font-size: 15px;
            line-height: 120%;
            font-weight: normal;
            letter-spacing: inherit;
            margin: 0;
            padding: 0;
        "
        id="body"
        class="cred_Bm16 cr-text bgcolor1 color3"
    >
        <table
            border="0"
            cellpadding="0"
            cellspacing="0"
            width="100%"
            bgcolor="#f5f5f5"
            style="background-color: #f5f5f5; width: 100%; table-layout: fixed; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%"
            class="bgcolor1"
        >
            <tr>
                <td height="20" style="font-size: 1px; line-height: 1px; height: 20px">
                    <!--[if gte mso 15]>&nbsp;<![endif]-->
                </td>
            </tr>
            <tr>
                <td align="center" valign="top">
                    <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-mainwidth:max-width"><![endif]-->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px" class="cr-mainwidth">
                        ${accounts}
                        <tr>
                            <td height="10" style="font-size: 1px; line-height: 1px; height: 10px">
                                <!--[if gte mso 15]>&nbsp;<![endif]-->
                            </td>
                        </tr>
                        <tr>
                            <td class="footer" style="color: #082137">
                                <!--#loop#-->
                                <!--#loopitem#-->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tbody>
                                        <tr>
                                            <td
                                                align="center"
                                                valign="top"
                                                style="padding: 10px 20px"
                                                data-style="background-color:inherit; border: 0px;"
                                                class="cr-container editable"
                                                data-name="Container"
                                            >
                                                <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top" width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                                                <table
                                                    border="0"
                                                    cellpadding="0"
                                                    cellspacing="0"
                                                    width="100%"
                                                    class="cr-maxwidth editable"
                                                    style="max-width: 640px"
                                                    data-style="background-color:inherit;border:0px;"
                                                    data-name="Inner container"
                                                >
                                                    <tbody>
                                                        <tr>
                                                            <td align="center" valign="top" class="cr-button">
                                                                <!--#button text="Click me!" margin="0px"#-->
                                                                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="cred-button">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td align="center" valign="top" style="padding: 0px">
                                                                                <table border="0" cellpadding="0" cellspacing="0" align="center">
                                                                                    <tbody>
                                                                                        <tr>
                                                                                            <td
                                                                                                bgcolor="1976d2"
                                                                                                height="0"
                                                                                                style="
                                                                                                    border: 0px;
                                                                                                    border-radius: 7px;
                                                                                                    padding: 15px 20px;
                                                                                                    background-color: #1976d2;
                                                                                                    color: #ffffff;
                                                                                                    line-height: 100%;
                                                                                                    text-decoration: none !important;
                                                                                                "
                                                                                            >
                                                                                                <a
                                                                                                    href="https://app.analytodon.com"
                                                                                                    target="_blank"
                                                                                                    style="
                                                                                                        color: #1976d2;
                                                                                                        text-decoration: none;
                                                                                                        border-radius: 7px;
                                                                                                        color: #ffffff;
                                                                                                        border: 0px !important;
                                                                                                        font-size: 14px !important;
                                                                                                        font-family: inherit !important;
                                                                                                        font-weight: bold !important;
                                                                                                        letter-spacing: 0px !important;
                                                                                                        text-decoration: none !important;
                                                                                                        display: block !important;
                                                                                                    "
                                                                                                    title="Analytodon Dashboard"
                                                                                                    >Go to Dashboard</a
                                                                                                >
                                                                                            </td>
                                                                                        </tr>
                                                                                    </tbody>
                                                                                </table>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                                <!--#/button#-->
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
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" valign="top" style="padding: 10px 20px">
                                            <!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0"  width="640" gc-width-fix=".cr-maxwidth:max-width"><tr><td align="center" valign="top"  width="640" gc-width-fix=".cr-maxwidth:max-width"><![endif]-->
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px">
                                                <tr>
                                                    <td align="center" valign="top">
                                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                            <tr>
                                                                <td
                                                                    align="center"
                                                                    valign="top"
                                                                    style="
                                                                        font-family: Helvetica, Arial, sans-serif !important;
                                                                        font-size: 15px;
                                                                        line-height: 120%;
                                                                        font-weight: normal;
                                                                        letter-spacing: inherit;
                                                                        font-size: 11px;
                                                                        line-height: 15px;
                                                                        padding: 5px 0px;
                                                                    "
                                                                    class="cr-text"
                                                                >
                                                                    <div align="center">
                                                                        <!--#aboutus#-->Analytodon<br />Raphael St&auml;bler<br />Bischofsweg 31<br />60598
                                                                        Frankfurt am Main<br />Deutschland<br /><br />info@analytodon.com<br />https://www.analytodon.com<!--#/aboutus#-->
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td
                                                                    align="center"
                                                                    valign="top"
                                                                    style="
                                                                        font-family: Helvetica, Arial, sans-serif !important;
                                                                        font-size: 15px;
                                                                        line-height: 120%;
                                                                        font-weight: normal;
                                                                        letter-spacing: inherit;
                                                                        font-size: 11px;
                                                                        line-height: 15px;
                                                                        padding: 5px 0px;
                                                                    "
                                                                    class="cr-text"
                                                                >
                                                                    <div align="center">
                                                                        <!--#unsubscribe#-->
                                                                        <div>
                                                                            If you don't want to receive any more messages like this you can
                                                                            <a href="${unsubscribeURL}" target="_blank" style="color: #1976d2; text-decoration: none ;;">unsubscribe here</a>.
                                                                        </div>
                                                                        <!--#/unsubscribe#-->
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
                </td>
            </tr>
            <tr>
                <td height="20" style="font-size: 1px; line-height: 1px; height: 20px"></td>
            </tr>
        </table>
    </body>
</html>`;
