<?php
namespace PHPMailer\PHPMailer;
/**
 * PHPMailer - PHP email creation and transport class.
 *
 * @author Marcus Bointon (Synchro/coolbru) <phpmailer@synchro.co.uk>
 * @author Jim Jagielski (jimjag) <jimjag@gmail.com>
 * @author Andy Prevost (codeworxtech) <codeworxtech@users.sourceforge.net>
 * @author Brent R. Matzelle (original founder)
 * @copyright 2012 - 2020 Marcus Bointon
 * @copyright 2010 - 2012 Jim Jagielski
 * @copyright 2004 - 2009 Andy Prevost
 * @license https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html GNU Lesser General Public License
 * @note This program is distributed in the hope that it will be useful - WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.
 */

class PHPMailer
{
    const CHARSET_ASCII = 'us-ascii';
    const CHARSET_ISO88591 = 'iso-8859-1';
    const CHARSET_UTF8 = 'utf-8';
    const CONTENT_TYPE_PLAINTEXT = 'text/plain';
    const CONTENT_TYPE_TEXT_CALENDAR = 'text/calendar';
    const CONTENT_TYPE_TEXT_HTML = 'text/html';
    const CONTENT_TYPE_MULTIPART_ALTERNATIVE = 'multipart/alternative';
    const CONTENT_TYPE_MULTIPART_MIXED = 'multipart/mixed';
    const CONTENT_TYPE_MULTIPART_RELATED = 'multipart/related';
    const ENCODING_7BIT = '7bit';
    const ENCODING_8BIT = '8bit';
    const ENCODING_BASE64 = 'base64';
    const ENCODING_BINARY = 'binary';
    const ENCODING_QUOTED_PRINTABLE = 'quoted-printable';
    const ENCRYPTION_STARTTLS = 'tls';
    const ENCRYPTION_SMTPS = 'ssl';
    const ICAL_METHOD_REQUEST = 'REQUEST';
    const ICAL_METHOD_PUBLISH = 'PUBLISH';
    const ICAL_METHOD_REPLY = 'REPLY';
    const ICAL_METHOD_ADD = 'ADD';
    const ICAL_METHOD_CANCEL = 'CANCEL';
    const ICAL_METHOD_REFRESH = 'REFRESH';
    const ICAL_METHOD_COUNTER = 'COUNTER';
    const ICAL_METHOD_DECLINECOUNTER = 'DECLINECOUNTER';

    public $Priority;
    public $CharSet = self::CHARSET_ISO88591;
    public $ContentType = self::CONTENT_TYPE_PLAINTEXT;
    public $Encoding = self::ENCODING_8BIT;
    public $ErrorInfo = '';
    public $From = '';
    public $FromName = '';
    public $Sender = '';
    public $Subject = '';
    public $Body = '';
    public $AltBody = '';
    public $Ical = '';
    protected static $IcalMethods = [
        self::ICAL_METHOD_REQUEST,
        self::ICAL_METHOD_PUBLISH,
        self::ICAL_METHOD_REPLY,
        self::ICAL_METHOD_ADD,
        self::ICAL_METHOD_CANCEL,
        self::ICAL_METHOD_REFRESH,
        self::ICAL_METHOD_COUNTER,
        self::ICAL_METHOD_DECLINECOUNTER,
    ];
    protected $MIMEBody = '';
    protected $MIMEHeader = '';
    protected $mailHeader = '';
    public $WordWrap = 0;
    public $Mailer = 'mail';
    public $Sendmail = '/usr/sbin/sendmail';
    public $UseSendmailOptions = true;
    public $ConfirmReadingTo = '';
    public $Hostname = '';
    public $MessageID = '';
    public $MessageDate = '';
    public $Host = 'localhost';
    public $Port = 25;
    public $Helo = '';
    public $SMTPSecure = '';
    public $SMTPAutoTLS = true;
    public $SMTPAuth = false;
    public $SMTPOptions = [];
    public $Username = '';
    public $Password = '';
    public $AuthType = '';
    protected $SMTPXClient = [];
    protected $oauth;
    public $Timeout = 300;
    public $dsn = '';
    public $SMTPDebug = 0;
    public $Debugoutput = 'echo';
    public $SMTPKeepAlive = false;
    public $SingleTo = false;
    protected $SingleToArray = [];
    public $do_verp = false;
    public $AllowEmpty = false;
    public $DKIM_selector = '';
    public $DKIM_identity = '';
    public $DKIM_passphrase = '';
    public $DKIM_domain = '';
    public $DKIM_copyHeaderFields = true;
    public $DKIM_extraHeaders = [];
    public $DKIM_private = '';
    public $DKIM_private_string = '';
    public $action_function = '';
    public $XMailer = '';
    public static $validator = 'php';
    protected $smtp;
    protected $to = [];
    protected $cc = [];
    protected $bcc = [];
    protected $ReplyTo = [];
    protected $all_recipients = [];
    protected $RecipientsQueue = [];
    protected $ReplyToQueue = [];
    public $UseSMTPUTF8 = false;
    protected $attachment = [];
    protected $CustomHeader = [];
    protected $lastMessageID = '';
    protected $message_type = '';
    protected $boundary = [];
    protected static $language = [];
    protected $error_count = 0;
    protected $sign_cert_file = '';
    protected $sign_key_file = '';
    protected $sign_extracerts_file = '';
    protected $sign_key_pass = '';
    protected $exceptions = false;
    protected $uniqueid = '';
    const VERSION = '6.10.0';
    const STOP_MESSAGE = 0;
    const STOP_CONTINUE = 1;
    const STOP_CRITICAL = 2;
    const CRLF = "\r\n";
    const FWS = ' ';
    protected static $LE = self::CRLF;
    const MAIL_MAX_LINE_LENGTH = 63;
    const MAX_LINE_LENGTH = 998;
    const STD_LINE_LENGTH = 76;

    public function __construct($exceptions = null)
    {
        if (null !== $exceptions) {
            $this->exceptions = (bool) $exceptions;
        }
        $this->Debugoutput = (strpos(PHP_SAPI, 'cli') !== false ? 'echo' : 'html');
    }

    public function __destruct()
    {
        $this->smtpClose();
    }

    private function mailPassthru($to, $subject, $body, $header, $params)
    {
        if ((int)ini_get('mbstring.func_overload') & 1) {
            $subject = $this->secureHeader($subject);
        } else {
            $subject = $this->encodeHeader($this->secureHeader($subject));
        }
        $this->edebug('Sending with mail()');
        $this->edebug('Sendmail path: ' . ini_get('sendmail_path'));
        $this->edebug("Envelope sender: {$this->Sender}");
        $this->edebug("To: {$to}");
        $this->edebug("Subject: {$subject}");
        $this->edebug("Headers: {$header}");
        if (!$this->UseSendmailOptions || null === $params) {
            $result = @mail($to, $subject, $body, $header);
        } else {
            $this->edebug("Additional params: {$params}");
            $result = @mail($to, $subject, $body, $header, $params);
        }
        $this->edebug('Result: ' . ($result ? 'true' : 'false'));

        return $result;
    }

    protected function edebug($str)
    {
        if ($this->SMTPDebug <= 0) {
            return;
        }
        if ($this->Debugoutput instanceof \Psr\Log\LoggerInterface) {
            $this->Debugoutput->debug(rtrim($str, "\r\n"));

            return;
        }
        if (is_callable($this->Debugoutput) && !in_array($this->Debugoutput, ['error_log', 'html', 'echo'])) {
            call_user_func($this->Debugoutput, $str, $this->SMTPDebug);

            return;
        }
        switch ($this->Debugoutput) {
            case 'error_log':
                error_log($str);
                break;
            case 'html':
                echo htmlentities(
                    preg_replace('/[\r\n]+/', '', $str),
                    ENT_QUOTES,
                    'UTF-8'
                ),
                "<br>\n";
                break;
            case 'echo':
            default:
                $str = preg_replace('/\r\n|\r/m', "\n", $str);
                echo gmdate('Y-m-d H:i:s'),
                "\t",
                trim(
                    str_replace(
                        "\n",
                        "\n \t ",
                        trim($str)
                    )
                ),
                "\n";
        }
    }

    public function isHTML($isHtml = true)
    {
        if ($isHtml) {
            $this->ContentType = static::CONTENT_TYPE_TEXT_HTML;
        } else {
            $this->ContentType = static::CONTENT_TYPE_PLAINTEXT;
        }
    }

    public function isSMTP()
    {
        $this->Mailer = 'smtp';
    }

    public function isMail()
    {
        $this->Mailer = 'mail';
    }

    public function isSendmail()
    {
        $ini_sendmail_path = ini_get('sendmail_path');
        if (false === stripos($ini_sendmail_path, 'sendmail')) {
            $this->Sendmail = '/usr/sbin/sendmail';
        } else {
            $this->Sendmail = $ini_sendmail_path;
        }
        $this->Mailer = 'sendmail';
    }

    public function isQmail()
    {
        $ini_sendmail_path = ini_get('sendmail_path');
        if (false === stripos($ini_sendmail_path, 'qmail')) {
            $this->Sendmail = '/var/qmail/bin/qmail-inject';
        } else {
            $this->Sendmail = $ini_sendmail_path;
        }
        $this->Mailer = 'qmail';
    }

    public function addAddress($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('to', $address, $name);
    }

    public function addCC($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('cc', $address, $name);
    }

    public function addBCC($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('bcc', $address, $name);
    }

    public function addReplyTo($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('Reply-To', $address, $name);
    }

    protected function addOrEnqueueAnAddress($kind, $address, $name)
    {
        $pos = false;
        if ($address !== null) {
            $address = trim($address);
            $pos = strrpos($address, '@');
        }

        if (false === $pos) {
            $error_message = sprintf(
                '%s (%s): %s', 
                self::lang('invalid_address'), 
                $kind,
                $address
            );
            $this->setError($error_message);
            $this->edebug($error_message);
            if ($this->exceptions) {
                throw new PHPMailerException($error_message);
            }

            return false;
        }

        if ($name !== null && is_string($name)) {
            $name = trim(preg_replace('/[\r\n]+/', '', $name));
        } else {
            $name = '';
        }

        $params = [$kind, $address, $name];

        if ($this->has8bitChars(substr($address, ++$pos))) {
            if (static::idnSupported()) {
                if ('Reply-To' !== $kind) {
                    if (!array_key_exists($address, $this->RecipientsQueue)) {
                        $this->RecipientsQueue[$address] = $params;

                        return true;
                    }
                } elseif (!array_key_exists($address, $this->ReplyToQueue)) {
                    $this->ReplyToQueue[$address] = $params;

                    return true;
                }
            }
            return false;
        }

        return call_user_func_array([$this, 'addAnAddress'], $params);
    }

    public function setBoundaries()
    {
        $this->uniqueid = $this->generateId();
        $this->boundary[1] = 'b1=_' . $this->uniqueid;
        $this->boundary[2] = 'b2=_' . $this->uniqueid;
        $this->boundary[3] = 'b3=_' . $this->uniqueid;
    }

    protected function addAnAddress($kind, $address, $name = '')
    {
        if (
            self::$validator === 'php' &&
            ((bool) preg_match('/[\x80-\xFF]/', $address))
        ) {
            $this->CharSet = self::CHARSET_UTF8;
            self::$validator = 'eai';
        }
        if (!in_array($kind, ['to', 'cc', 'bcc', 'Reply-To'])) {
            $error_message = sprintf(
                '%s: %s', 
                self::lang('Invalid recipient kind'), 
                $kind
            );
            $this->setError($error_message);
            $this->edebug($error_message);
            if ($this->exceptions) {
                throw new PHPMailerException($error_message);
            }

            return false;
        }
        if (!static::validateAddress($address)) {
            $error_message = sprintf(
                '%s (%s): %s', 
                self::lang('invalid_address'), 
                $kind,
                $address
            );
            $this->setError($error_message);
            $this->edebug($error_message);
            if ($this->exceptions) {
                throw new PHPMailerException($error_message);
            }

            return false;
        }
        if ('Reply-To' !== $kind) {
            if (!array_key_exists(strtolower($address), $this->all_recipients)) {
                $this->{$kind}[] = [$address, $name];
                $this->all_recipients[strtolower($address)] = true;

                return true;
            }
        } elseif (!array_key_exists(strtolower($address), $this->ReplyTo)) {
            $this->ReplyTo[strtolower($address)] = [$address, $name];

            return true;
        }

        return false;
    }

    public static function parseAddresses($addrstr, $useimap = true, $charset = self::CHARSET_ISO88591)
    {
        $addresses = [];
        if ($useimap && function_exists('imap_rfc822_parse_adrlist')) {
            $list = imap_rfc822_parse_adrlist($addrstr, '');
            imap_errors();
            foreach ($list as $address) {
                if (
                    '.SYNTAX-ERROR.' !== $address->host &&
                    static::validateAddress($address->mailbox . '@' . $address->host)
                ) {
                    if (
                        property_exists($address, 'personal') &&
                        defined('MB_CASE_UPPER') &&
                        preg_match('/^=\?.*\?=$/s', $address->personal)
                    ) {
                        $origCharset = mb_internal_encoding();
                        mb_internal_encoding($charset);
                        $address->personal = str_replace('_', '=20', $address->personal);
                        $address->personal = mb_decode_mimeheader($address->personal);
                        mb_internal_encoding($origCharset);
                    }
                    $addresses[] = [
                        'name' => (property_exists($address, 'personal') ? $address->personal : ''),
                        'address' => $address->mailbox . '@' . $address->host,
                    ];
                }
            }
        } else {
            $addresses = self::parseSimplerAddresses($addrstr, $charset);
        }

        return $addresses;
    }

    protected static function parseSimplerAddresses($addrstr, $charset)
    {
        trigger_error(self::lang('imap_recommended'), E_USER_NOTICE);
        $list = explode(',', $addrstr);
        foreach ($list as $address) {
            $address = trim($address);
            if (strpos($address, '<') === false) {
                if (static::validateAddress($address)) {
                    $addresses[] = [
                        'name' => '',
                        'address' => $address,
                    ];
                }
            } else {
                list($name, $email) = explode('<', $address);
                $email = trim(str_replace('>', '', $email));
                $name = trim($name);
                if (static::validateAddress($email)) {
                    if (defined('MB_CASE_UPPER') && preg_match('/^=\?.*\?=$/s', $name)) {
                        $origCharset = mb_internal_encoding();
                        mb_internal_encoding($charset);
                        $name = str_replace('_', '=20', $name);
                        $name = mb_decode_mimeheader($name);
                        mb_internal_encoding($origCharset);
                    }
                    $addresses[] = [
                        'name' => trim($name, '\'" '),
                        'address' => $email,
                    ];
                }
            }
        }

        return $addresses;
    }

    public function setFrom($address, $name = '', $auto = true)
    {
        if (is_null($name)) {
            $name = '';
        }
        $address = trim((string)$address);
        $name = trim(preg_replace('/[\r\n]+/', '', $name));
        $pos = strrpos($address, '@');
        if (
            (false === $pos) ||
            ((!$this->has8bitChars(substr($address, ++$pos)) || !static::idnSupported()) &&
                !static::validateAddress($address))
        ) {
            $error_message = sprintf(
                '%s (From): %s', 
                self::lang('invalid_address'), 
                $address
            );
            $this->setError($error_message);
            $this->edebug($error_message);
            if ($this->exceptions) {
                throw new PHPMailerException($error_message);
            }

            return false;
        }
        $this->From = $address;
        $this->FromName = $name;
        if ($auto && empty($this->Sender)) {
            $this->Sender = $address;
        }

        return true;
    }

    public function getLastMessageID()
    {
        return $this->lastMessageID;
    }

    public static function validateAddress($address, $patternselect = null)
    {
        if (null === $patternselect) {
            $patternselect = static::$validator;
        }
        if (is_callable($patternselect) && !is_string($patternselect)) {
            return call_user_func($patternselect, $address);
        }
        if (strpos($address, "\n") !== false || strpos($address, "\r") !== false) {
            return false;
        }
        switch ($patternselect) {
            case 'pcre':
            case 'pcre8':
                return (bool) filter_var($address, FILTER_VALIDATE_EMAIL);
            case 'html5':
                return (bool) preg_match(
                    '/^[a-zA-Z0-9.!#$%&\\' * +\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}' . 
                    '[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/sD',
                    $address
                );
            case 'eai':
                return (bool) preg_match(
                    '/^[-p{L}p{N}p{M}.!#$%&\\' * +\/=?^_`{|}~-]+@p{L}p{N}p{M}(?:[p{L}p{N}p{M}-]{0,61}' . 
                    '[p{L}p{N}p{M}])?(?:\.p{L}p{N}p{M}' . 
                    '(?:[-p{L}p{N}p{M}]{0,61}[p{L}p{N}p{M}])?)*$/usD',
                    $address
                );
            case 'php':
            default:
                return filter_var($address, FILTER_VALIDATE_EMAIL) !== false;
        }
    }

    public static function idnSupported()
    {
        return function_exists('idn_to_ascii') && function_exists('mb_convert_encoding');
    }

    public function punyencodeAddress($address)
    {
        $pos = strrpos($address, '@');
        if (
            !empty($this->CharSet) &&
            false !== $pos &&
            static::idnSupported()
        ) {
            $domain = substr($address, ++$pos);
            if ($this->has8bitChars($domain) && @mb_check_encoding($domain, $this->CharSet)) {
                $domain = mb_convert_encoding($domain, self::CHARSET_UTF8, $this->CharSet);
                $errorcode = 0;
                if (defined('INTL_IDNA_VARIANT_UTS46')) {
                    $punycode = idn_to_ascii(
                        $domain,
                        IDNA_DEFAULT | IDNA_USE_STD3_RULES | IDNA_CHECK_BIDI | IDNA_CHECK_CONTEXTJ | IDNA_NONTRANSITIONAL_TO_ASCII,
                        INTL_IDNA_VARIANT_UTS46
                    );
                } elseif (defined('INTL_IDNA_VARIANT_2003')) {
                    $punycode = idn_to_ascii($domain, $errorcode, INTL_IDNA_VARIANT_2003);
                } else {
                    $punycode = idn_to_ascii($domain, $errorcode);
                }
                if (false !== $punycode) {
                    return substr($address, 0, $pos) . $punycode;
                }
            }
        }

        return $address;
    }

    public function send()
    {
        try {
            if (!$this->preSend()) {
                return false;
            }

            return $this->postSend();
        } catch (PHPMailerException $exc) {
            $this->mailHeader = '';
            $this->setError($exc->getMessage());
            if ($this->exceptions) {
                throw $exc;
            }

            return false;
        }
    }

    public function preSend()
    {
        if (
            'smtp' === $this->Mailer ||
            ('mail' === $this->Mailer && (((PHP_VERSION_ID >= 80000 || stripos(PHP_OS, 'WIN') === 0))))
        ) {
            static::setLE(self::CRLF);
        } else {
            static::setLE(PHP_EOL);
        }
        if (
            'mail' === $this->Mailer &&
            (((PHP_VERSION_ID >= 70000 && PHP_VERSION_ID < 70017) || (PHP_VERSION_ID >= 70100 && PHP_VERSION_ID < 70103)) &&
                ini_get('mail.add_x_header') === '1' &&
                stripos(PHP_OS, 'WIN') === 0)
        ) {
            trigger_error(self::lang('buggy_php'), E_USER_WARNING);
        }

        try {
            $this->error_count = 0;
            $this->mailHeader = '';

            if (
                static::CHARSET_UTF8 === strtolower($this->CharSet) &&
                ($this->anyAddressHasUnicodeLocalPart($this->RecipientsQueue) ||
                    $this->anyAddressHasUnicodeLocalPart(array_keys($this->all_recipients)) ||
                    $this->anyAddressHasUnicodeLocalPart($this->ReplyToQueue) ||
                    $this->addressHasUnicodeLocalPart($this->From))
            ) {
                $this->UseSMTPUTF8 = true;
            }

            foreach (array_merge($this->RecipientsQueue, $this->ReplyToQueue) as $params) {
                if (!$this->UseSMTPUTF8) {
                    $params[1] = $this->punyencodeAddress($params[1]);
                }
                call_user_func_array([$this, 'addAnAddress'], $params);
            }

            if (count($this->to) + count($this->cc) + count($this->bcc) < 1) {
                throw new PHPMailerException(self::lang('provide_address'), self::STOP_CRITICAL);
            }

            foreach (['From', 'Sender', 'ConfirmReadingTo'] as $address_kind) {
                if ($this->{$address_kind} === null) {
                    $this->{$address_kind} = '';
                    continue;
                }
                $this->{$address_kind} = trim($this->{$address_kind});
                if (empty($this->{$address_kind})) {
                    continue;
                }
                $this->{$address_kind} = $this->punyencodeAddress($this->{$address_kind});
                if (!static::validateAddress($this->{$address_kind})) {
                    $error_message = sprintf(
                        '%s (%s): %s', 
                        self::lang('invalid_address'), 
                        $address_kind,
                        $this->{$address_kind}
                    );
                    $this->setError($error_message);
                    $this->edebug($error_message);
                    if ($this->exceptions) {
                        throw new PHPMailerException($error_message);
                    }

                    return false;
                }
            }

            if ($this->alternativeExists()) {
                $this->ContentType = static::CONTENT_TYPE_MULTIPART_ALTERNATIVE;
            }

            $this->setMessageType();
            if (!$this->AllowEmpty && empty($this->Body)) {
                throw new PHPMailerException(self::lang('empty_message'), self::STOP_CRITICAL);
            }

            $this->Subject = trim($this->Subject);

            $this->MIMEHeader = '';
            $this->MIMEBody = $this->createBody();
            $tempheaders = $this->MIMEHeader;
            $this->MIMEHeader = $this->createHeader();
            $this->MIMEHeader .= $tempheaders;

            if ('mail' === $this->Mailer) {
                if (count($this->to) > 0) {
                    $this->mailHeader .= $this->addrAppend('To', $this->to);
                } else {
                    $this->mailHeader .= $this->headerLine('To', 'undisclosed-recipients:;');
                }
                $this->mailHeader .= $this->headerLine(
                    'Subject',
                    $this->encodeHeader($this->secureHeader($this->Subject))
                );
            }

            if (
                !empty($this->DKIM_domain) &&
                !empty($this->DKIM_selector) &&
                (!empty($this->DKIM_private_string) ||
                    (!empty($this->DKIM_private) &&
                        static::isPermittedPath($this->DKIM_private) &&
                        file_exists($this->DKIM_private)
                    )
                )
            ) {
                $header_dkim = $this->DKIM_Add(
                    $this->MIMEHeader . $this->mailHeader,
                    $this->encodeHeader($this->secureHeader($this->Subject)),
                    $this->MIMEBody
                );
                $this->MIMEHeader = static::stripTrailingWSP($this->MIMEHeader) . static::$LE .
                    static::normalizeBreaks($header_dkim) . static::$LE;
            }

            return true;
        } catch (PHPMailerException $exc) {
            $this->setError($exc->getMessage());
            if ($this->exceptions) {
                throw $exc;
            }

            return false;
        }
    }

    public function postSend()
    {
        try {
            switch ($this->Mailer) {
                case 'sendmail':
                case 'qmail':
                    return $this->sendmailSend($this->MIMEHeader, $this->MIMEBody);
                case 'smtp':
                    return $this->smtpSend($this->MIMEHeader, $this->MIMEBody);
                case 'mail':
                    return $this->mailSend($this->MIMEHeader, $this->MIMEBody);
                default:
                    $sendMethod = $this->Mailer . 'Send';
                    if (method_exists($this, $sendMethod)) {
                        return $this->{$sendMethod}($this->MIMEHeader, $this->MIMEBody);
                    }

                    return $this->mailSend($this->MIMEHeader, $this->MIMEBody);
            }
        } catch (PHPMailerException $exc) {
            $this->setError($exc->getMessage());
            $this->edebug($exc->getMessage());
            if ($this->Mailer === 'smtp' && $this->SMTPKeepAlive == true && $this->smtp->connected()) {
                $this->smtp->reset();
            }
            if ($this->exceptions) {
                throw $exc;
            }
        }

        return false;
    }

    protected function sendmailSend($header, $body)
    {
        if ($this->Mailer === 'qmail') {
            $this->edebug('Sending with qmail');
        } else {
            $this->edebug('Sending with sendmail');
        }
        $header = static::stripTrailingWSP($header) . static::$LE . static::$LE;

        $sendmail_from_value = ini_get('sendmail_from');
        if (empty($this->Sender) && !empty($sendmail_from_value)) {
            $this->Sender = ini_get('sendmail_from');
        }
        if (!empty($this->Sender) && static::validateAddress($this->Sender) && self::isShellSafe($this->Sender)) {
            if ($this->Mailer === 'qmail') {
                $sendmailFmt = '%s -f%s';
            } else {
                $sendmailFmt = '%s -oi -f%s -t';
            }
        } elseif ($this->Mailer === 'qmail') {
            $sendmailFmt = '%s';
        } else {
            $sendmailFmt = '%s -oi -t';
        }

        $sendmail = sprintf($sendmailFmt, escapeshellcmd($this->Sendmail), $this->Sender);

        $this->edebug('Sendmail path: ' . $this->Sendmail);
        $this->edebug('Sendmail command: ' . $sendmail);
        $this->edebug('Envelope sender: ' . $this->Sender);
        $this->edebug("Headers: {$header}");

        if ($this->SingleTo) {
            foreach ($this->SingleToArray as $toAddr) {
                $mail = @popen($sendmail, 'w');
                if (!$mail) {
                    throw new PHPMailerException(self::lang('execute') . $this->Sendmail, self::STOP_CRITICAL);
                }
                $this->edebug("To: {$toAddr}");
                fwrite($mail, 'To: ' . $toAddr . "\n");
                fwrite($mail, $header);
                fwrite($mail, $body);
                $result = pclose($mail);
                $addrinfo = static::parseAddresses($toAddr, true, $this->CharSet);
                foreach ($addrinfo as $addr) {
                    $this->doCallback(
                        ($result === 0),
                        [[$addr['address'], $addr['name']]],
                        $this->cc,
                        $this->bcc,
                        $this->Subject,
                        $body,
                        $this->From,
                        []
                    );
                }
                $this->edebug('Result: ' . ($result === 0 ? 'true' : 'false'));
                if (0 !== $result) {
                    throw new PHPMailerException(self::lang('execute') . $this->Sendmail, self::STOP_CRITICAL);
                }
            }
        } else {
            $mail = @popen($sendmail, 'w');
            if (!$mail) {
                throw new PHPMailerException(self::lang('execute') . $this->Sendmail, self::STOP_CRITICAL);
            }
            fwrite($mail, $header);
            fwrite($mail, $body);
            $result = pclose($mail);
            $this->doCallback(
                ($result === 0),
                $this->to,
                $this->cc,
                $this->bcc,
                $this->Subject,
                $body,
                $this->From,
                []
            );
            $this->edebug('Result: ' . ($result === 0 ? 'true' : 'false'));
            if (0 !== $result) {
                throw new PHPMailerException(self::lang('execute') . $this->Sendmail, self::STOP_CRITICAL);
            }
        }

        return true;
    }

    protected static function isShellSafe($string)
    {
        if (!function_exists('escapeshellarg') || !function_exists('escapeshellcmd')) {
            return false;
        }
        if (
            escapeshellcmd($string) !== $string ||
            !in_array(escapeshellarg($string), ["'$string'", "\"$string\""]) 
        ) {
            return false;
        }

        $length = strlen($string);
        for ($i = 0; $i < $length; ++$i) {
            $c = $string[$i];
            if (!ctype_alnum($c) && strpos('@_-.', $c) === false) {
                return false;
            }
        }

        return true;
    }

    protected static function isPermittedPath($path)
    {
        return !preg_match('#^[a-z][a-z\d+.-]*://#i', $path);
    }

    protected static function fileIsAccessible($path)
    {
        if (!static::isPermittedPath($path)) {
            return false;
        }
        $readable = is_file($path);
        if (strpos($path, '\\') !== 0) {
            $readable = $readable && is_readable($path);
        }

        return $readable;
    }

    protected function mailSend($header, $body)
    {
        $header = static::stripTrailingWSP($header) . static::$LE . static::$LE;
        $toArr = [];
        foreach ($this->to as $toaddr) {
            $toArr[] = $this->addrFormat($toaddr);
        }
        $to = trim(implode(', ', $toArr));

        if ($to === '') {
            $to = 'undisclosed-recipients:;';
        }

        $params = null;
        $sendmail_from_value = ini_get('sendmail_from');
        if (empty($this->Sender) && !empty($sendmail_from_value)) {
            $this->Sender = ini_get('sendmail_from');
        }
        if (!empty($this->Sender) && static::validateAddress($this->Sender)) {
            if (self::isShellSafe($this->Sender)) {
                $params = sprintf('-f%s', $this->Sender);
            }
            $old_from = ini_get('sendmail_from');
            ini_set('sendmail_from', $this->Sender);
        }

        $result = false;
        if ($this->SingleTo && count($toArr) > 1) {
            foreach ($toArr as $toAddr) {
                $result = $this->mailPassthru($toAddr, $this->Subject, $body, $header, $params);
                $addrinfo = static::parseAddresses($toAddr, true, $this->CharSet);
                foreach ($addrinfo as $addr) {
                    $this->doCallback(
                        $result,
                        [[$addr['address'], $addr['name']]],
                        $this->cc,
                        $this->bcc,
                        $this->Subject,
                        $body,
                        $this->From,
                        []
                    );
                }
            }
        } else {
            $result = $this->mailPassthru($to, $this->Subject, $body, $header, $params);
            $this->doCallback($result, $this->to, $this->cc, $this->bcc, $this->Subject, $body, $this->From, []);
        }

        if (isset($old_from)) {
            ini_set('sendmail_from', $old_from);
        }

        if (!$result) {
            throw new PHPMailerException(self::lang('instantiate'), self::STOP_CRITICAL);
        }

        return true;
    }

    public function getSMTPInstance()
    {
        if (!is_object($this->smtp)) {
            $this->smtp = new SMTP();
        }

        return $this->smtp;
    }

    public function setSMTPInstance(SMTP $smtp)
    {
        $this->smtp = $smtp;

        return $this->smtp;
    }

    public function setSMTPXclientAttribute($name, $value)
    {
        if (!in_array($name, SMTP::$xclient_allowed_attributes)) {
            return false;
        }
        if (isset($this->SMTPXClient[$name]) && $value === null) {
            unset($this->SMTPXClient[$name]);
        } elseif ($value !== null) {
            $this->SMTPXClient[$name] = $value;
        }

        return true;
    }

    public function getSMTPXclientAttributes()
    {
        return $this->SMTPXClient;
    }

    protected function smtpSend($header, $body)
    {
        $header = static::stripTrailingWSP($header) . static::$LE . static::$LE;
        $bad_rcpt = [];
        if (!$this->smtpConnect($this->SMTPOptions)) {
            throw new PHPMailerException(self::lang('smtp_connect_failed'), self::STOP_CRITICAL);
        }
        if ($this->UseSMTPUTF8 && !$this->smtp->getServerExt('SMTPUTF8')) {
            throw new PHPMailerException(self::lang('no_smtputf8'), self::STOP_CRITICAL);
        }
        if ('' === $this->Sender) {
            $smtp_from = $this->From;
        } else {
            $smtp_from = $this->Sender;
        }
        if (count($this->SMTPXClient)) {
            $this->smtp->xclient($this->SMTPXClient);
        }
        if (!$this->smtp->mail($smtp_from)) {
            $this->setError(self::lang('from_failed') . $smtp_from . ' : ' . implode(',', $this->smtp->getError()));
            throw new PHPMailerException($this->ErrorInfo, self::STOP_CRITICAL);
        }

        $callbacks = [];
        foreach ([$this->to, $this->cc, $this->bcc] as $togroup) {
            foreach ($togroup as $to) {
                if (!$this->smtp->recipient($to[0], $this->dsn)) {
                    $error = $this->smtp->getError();
                    $bad_rcpt[] = ['to' => $to[0], 'error' => $error['detail']];
                    $isSent = false;
                } else {
                    $isSent = true;
                }
                $callbacks[] = ['issent' => $isSent, 'to' => $to[0], 'name' => $to[1]];
            }
        }

        if ((count($this->all_recipients) > count($bad_rcpt)) && !$this->smtp->data($header . $body)) {
            throw new PHPMailerException(self::lang('data_not_accepted'), self::STOP_CRITICAL);
        }

        $smtp_transaction_id = $this->smtp->getLastTransactionID();

        if ($this->SMTPKeepAlive) {
            $this->smtp->reset();
        } else {
            $this->smtp->quit();
            $this->smtp->close();
        }

        foreach ($callbacks as $cb) {
            $this->doCallback(
                $cb['issent'],
                [[$cb['to'], $cb['name']]],
                [],
                [],
                $this->Subject,
                $body,
                $this->From,
                ['smtp_transaction_id' => $smtp_transaction_id]
            );
        }

        if (count($bad_rcpt) > 0) {
            $errstr = '';
            foreach ($bad_rcpt as $bad) {
                $errstr .= $bad['to'] . ': ' . $bad['error'];
            }
            throw new PHPMailerException(
                self::lang('recipients_failed') . $errstr,
                self::STOP_CONTINUE
            );
        }

        return true;
    }

    public function smtpConnect($options = null)
    {
        if (null === $this->smtp) {
            $this->smtp = $this->getSMTPInstance();
        }

        if (null === $options) {
            $options = $this->SMTPOptions;
        }

        if ($this->smtp->connected()) {
            return true;
        }

        $this->smtp->setTimeout($this->Timeout);
        $this->smtp->setDebugLevel($this->SMTPDebug);
        $this->smtp->setDebugOutput($this->Debugoutput);
        $this->smtp->setVerp($this->do_verp);
        $this->smtp->setSMTPUTF8($this->UseSMTPUTF8);

        if ($this->Host === null) {
            $this->Host = 'localhost';
        }

        $hosts = explode(';', $this->Host);
        $lastexception = null;

        foreach ($hosts as $hostentry) {
            $hostinfo = [];
            if (
                !preg_match(
                    '/^(?:(ssl|tls):\/\/)?(.+?)(?::(\d+))?$/',
                    trim($hostentry),
                    $hostinfo
                )
            ) {
                $this->edebug(self::lang('invalid_hostentry') . ' ' . trim($hostentry));
                continue;
            }

            if (!static::isValidHost($hostinfo[2])) {
                $this->edebug(self::lang('invalid_host') . ' ' . $hostinfo[2]);
                continue;
            }

            $prefix = '';
            $secure = $this->SMTPSecure;
            $tls = (static::ENCRYPTION_STARTTLS === $this->SMTPSecure);

            if ('ssl' === $hostinfo[1] || ('' === $hostinfo[1] && static::ENCRYPTION_SMTPS === $this->SMTPSecure)) {
                $prefix = 'ssl://';
                $tls = false;
                $secure = static::ENCRYPTION_SMTPS;
            } elseif ('tls' === $hostinfo[1]) {
                $tls = true;
                $secure = static::ENCRYPTION_STARTTLS;
            }

            $sslext = defined('OPENSSL_ALGO_SHA256');
            if (static::ENCRYPTION_STARTTLS === $secure || static::ENCRYPTION_SMTPS === $secure) {
                if (!$sslext) {
                    throw new PHPMailerException(self::lang('extension_missing') . 'openssl', self::STOP_CRITICAL);
                }
            }

            $host = $hostinfo[2];
            $port = $this->Port;
            if (
                array_key_exists(3, $hostinfo) &&
                is_numeric($hostinfo[3]) &&
                $hostinfo[3] > 0 &&
                $hostinfo[3] < 65536
            ) {
                $port = (int) $hostinfo[3];
            }

            if ($this->smtp->connect($prefix . $host, $port, $this->Timeout, $options)) {
                try {
                    if ($this->Helo) {
                        $hello = $this->Helo;
                    } else {
                        $hello = $this->serverHostname();
                    }
                    $this->smtp->hello($hello);

                    if (
                        $this->SMTPAutoTLS &&
                        $this->Host !== 'localhost' &&
                        $sslext &&
                        $secure !== 'ssl' &&
                        $this->smtp->getServerExt('STARTTLS')
                    ) {
                        $tls = true;
                    }

                    if ($tls) {
                        if (!$this->smtp->startTLS()) {
                            $message = $this->getSmtpErrorMessage('connect_host');
                            throw new PHPMailerException($message);
                        }

                        $this->smtp->hello($hello);
                    }
                    if (
                        $this->SMTPAuth &&
                        !$this->smtp->authenticate(
                            $this->Username,
                            $this->Password,
                            $this->AuthType,
                            $this->oauth
                        )
                    ) {
                        throw new PHPMailerException(self::lang('authenticate'));
                    }

                    return true;
                } catch (PHPMailerException $exc) {
                    $lastexception = $exc;
                    $this->edebug($exc->getMessage());
                    $this->smtp->quit();
                }
            }
        }
        $this->smtp->close();
        if ($this->exceptions && null !== $lastexception) {
            throw $lastexception;
        }
        if ($this->exceptions) {
            $message = $this->getSmtpErrorMessage('connect_host');
            throw new PHPMailerException($message);
        }

        return false;
    }

    public function smtpClose()
    {
        if ((null !== $this->smtp) && $this->smtp->connected()) {
            $this->smtp->quit();
            $this->smtp->close();
        }
    }

    public static function setLanguage($langcode = 'en', $lang_path = '')
    {
        $renamed_langcodes = [
            'br' => 'pt_br',
            'cz' => 'cs',
            'dk' => 'da',
            'no' => 'nb',
            'se' => 'sv',
            'rs' => 'sr',
            'tg' => 'tl',
            'am' => 'hy',
        ];
        if (array_key_exists($langcode, $renamed_langcodes)) {
            $langcode = $renamed_langcodes[$langcode];
        }
        $PHPMAILER_LANG = [
            'authenticate' => 'SMTP Error: Could not authenticate.',
            'buggy_php' => 'Your version of PHP is affected by a bug that may result in corrupted messages.'
                . ' To fix it, switch to sending using SMTP, disable the mail.add_x_header option in'
                . ' your php.ini, switch to MacOS or Linux, or upgrade your PHP to version 7.0.17+ or 7.1.3+.',
            'connect_host' => 'SMTP Error: Could not connect to SMTP host.',
            'data_not_accepted' => 'SMTP Error: data not accepted.',
            'empty_message' => 'Message body empty',
            'encoding' => 'Unknown encoding: ',
            'execute' => 'Could not execute: ',
            'extension_missing' => 'Extension missing: ',
            'file_access' => 'Could not access file: ',
            'file_open' => 'File Error: Could not open file: ',
            'from_failed' => 'The following From address failed: ',
            'instantiate' => 'Could not instantiate mail function.',
            'invalid_address' => 'Invalid address: ',
            'invalid_header' => 'Invalid header name or value',
            'invalid_hostentry' => 'Invalid hostentry: ',
            'invalid_host' => 'Invalid host: ',
            'mailer_not_supported' => ' mailer is not supported.',
            'provide_address' => 'You must provide at least one recipient email address.',
            'recipients_failed' => 'SMTP Error: The following recipients failed: ',
            'signing' => 'Signing Error: ',
            'smtp_code' => 'SMTP code: ',
            'smtp_code_ex' => 'Additional SMTP info: ',
            'smtp_error' => 'SMTP server error: ',
            'variable_set' => 'Cannot set or reset variable: ',
            'no_smtputf8' => 'Server does not support SMTPUTF8 needed to send to Unicode addresses',
            'imap_recommended' => 'Using simplified address parser is not recommended. '.
                'Install the PHP IMAP extension for full RFC822 parsing.',
        ];
        if (empty($lang_path)) {
            $lang_path = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'language' . DIRECTORY_SEPARATOR;
        }
        $foundlang = true;
        $langcode = strtolower($langcode);
        if (!preg_match('/^(?P<lang>[a-z]{2})(?P<script>_[a-z]{4})?(?P<country>_[a-z]{2})?$/', $langcode, $matches)) {
            $foundlang = false;
        }

        $lang_file = $lang_path . $langcode . '.lang.php';
        if ($foundlang && static::isPermittedPath($lang_file) && file_exists($lang_file)) {
            $PHPMAILER_LANG = include $lang_file;
        }
        static::$language = $PHPMAILER_LANG;

        return true;
    }

    public function getTranslations()
    {
        return static::$language;
    }

    public function addReplyTo($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('Reply-To', $address, $name);
    }

    public function getFrom()
    {
        return $this->From;
    }

    public function getFromName()
    {
        return $this->FromName;
    }

    public function getSender()
    {
        return $this->Sender;
    }

    public function getSubject()
    {
        return $this->Subject;
    }

    public function getBody()
    {
        return $this->Body;
    }

    public function getAltBody()
    {
        return $this->AltBody;
    }

    public function getIcal()
    {
        return $this->Ical;
    }

    public function getMailer()
    {
        return $this->Mailer;
    }

    public function getSendmail()
    {
        return $this->Sendmail;
    }

    public function getHost()
    {
        return $this->Host;
    }

    public function getPort()
    {
        return $this->Port;
    }

    public function getHelo()
    {
        return $this->Helo;
    }

    public function getSMTPSecure()
    {
        return $this->SMTPSecure;
    }

    public function getSMTPAutoTLS()
    {
        return $this->SMTPAutoTLS;
    }

    public function getSMTPAuth()
    {
        return $this->SMTPAuth;
    }

    public function getSMTPOptions()
    {
        return $this->SMTPOptions;
    }

    public function getUsername()
    {
        return $this->Username;
    }

    public function getPassword()
    {
        return $this->Password;
    }

    public function getAuthType()
    {
        return $this->AuthType;
    }

    public function getTimeout()
    {
        return $this->Timeout;
    }

    public function getSMTPDebug()
    {
        return $this->SMTPDebug;
    }

    public function getDebugoutput()
    {
        return $this->Debugoutput;
    }

    public function getSMTPKeepAlive()
    {
        return $this->SMTPKeepAlive;
    }

    public function getSingleTo()
    {
        return $this->SingleTo;
    }

    public function getVerp()
    {
        return $this->do_verp;
    }

    public function getAllowEmpty()
    {
        return $this->AllowEmpty;
    }

    public function getDKIMSelector()
    {
        return $this->DKIM_selector;
    }

    public function getDKIMIdentity()
    {
        return $this->DKIM_identity;
    }

    public function getDKIMPassphrase()
    {
        return $this->DKIM_passphrase;
    }

    public function getDKIMDomain()
    {
        return $this->DKIM_domain;
    }

    public function getDKIMprivate()
    {
        return $this->DKIM_private;
    }

    public function getActionfunction()
    {
        return $this->action_function;
    }

    public function getXMailer()
    {
        return $this->XMailer;
    }

    public function getValidator()
    {
        return static::$validator;
    }

    public function getToAddresses()
    {
        return $this->to;
    }

    public function getCcAddresses()
    {
        return $this->cc;
    }

    public function getBccAddresses()
    {
        return $this->bcc;
    }

    public function getReplyToAddresses()
    {
        return $this->ReplyTo;
    }

    public function getAllRecipientAddresses()
    {
        return $this->all_recipients;
    }

    public function getAttachments()
    {
        return $this->attachment;
    }

    public function getCustomHeaders()
    {
        return $this->CustomHeader;
    }

    public function getMessageType()
    {
        return $this->message_type;
    }

    public function getBoundary()
    {
        return $this->boundary;
    }

    public function getErrorCount()
    {
        return $this->error_count;
    }

    public function getSignCertFile()
    {
        return $this->sign_cert_file;
    }

    public function getSignKeyFile()
    {
        return $this->sign_key_file;
    }

    public function getSignExtracertsFile()
    {
        return $this->sign_extracerts_file;
    }

    public function getSignKeyPass()
    {
        return $this->sign_key_pass;
    }

    public function getExceptions()
    {
        return $this->exceptions;
    }
}