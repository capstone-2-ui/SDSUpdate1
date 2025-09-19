<?php
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

namespace PHPMailer\PHPMailer;

/**
 * PHPMailer - PHP email creation and transport class.
 *
 * @author Marcus Bointon (Synchro/coolbru)
 * @author Jim Jagielski (jimjag)
 * @author Andy Prevost (codeworxtech)
 * @author Brent R. Matzelle (original founder)
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

    /**
     * Email priority.
     * Options: null (default), 1 = High, 3 = Normal, 5 = low.
     * When null, the header is not set at all.
     *
     * @var int|null
     */
    public $Priority;

    /**
     * The character set of the message.
     *
     * @var string
     */
    public $CharSet = self::CHARSET_ISO88591;

    /**
     * The MIME Content-type of the message.
     *
     * @var string
     */
    public $ContentType = self::CONTENT_TYPE_PLAINTEXT;

    /**
     * The message encoding.
     * Options: "8bit", "7bit", "binary", "base64", and "quoted-printable".
     *
     * @var string
     */
    public $Encoding = self::ENCODING_8BIT;

    /**
     * Holds the most recent mailer error message.
     *
     * @var string
     */
    public $ErrorInfo = '';

    /**
     * The From email address for the message.
     *
     * @var string
     */
    public $From = '';

    /**
     * The From name of the message.
     *
     * @var string
     */
    public $FromName = '';

    /**
     * The envelope sender of the message.
     * This will usually be turned into a Return-Path header by the receiver,
     * and is the address that bounces will be sent to.
     * If not empty, will be passed via `-f` to sendmail or as the 'MAIL FROM' value over SMTP.
     *
     * @var string
     */
    public $Sender = '';

    /**
     * The Subject of the message.
     *
     * @var string
     */
    public $Subject = '';

    /**
     * An HTML or plain text message body.
     * If HTML then call isHTML(true).
     *
     * @var string
     */
    public $Body = '';

    /**
     * The plain-text message body.
     * This body can be read by mail clients that do not have HTML email
     * capability such as mutt & Eudora.
     * Clients that can read HTML will view the normal Body.
     *
     * @var string
     */
    public $AltBody = '';

    /**
     * An iCal message part body.
     * Only supported in simple alt or alt_inline message types
     * To generate iCal event structures, use classes like EasyPeasyICS or iCalcreator.
     *
     * @see https://kigkonsult.se/iCalcreator/
     *
     * @var string
     */
    public $Ical = '';

    /**
     * Value-array of "method" in Contenttype header "text/calendar"
     *
     * @var string[]
     */
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

    /**
     * The complete compiled MIME message body.
     *
     * @var string
     */
    protected $MIMEBody = '';

    /**
     * The complete compiled MIME message headers.
     *
     * @var string
     */
    protected $MIMEHeader = '';

    /**
     * Extra headers that createHeader() doesn't fold in.
     *
     * @var string
     */
    protected $mailHeader = '';

    /**
     * Word-wrap the message body to this number of chars.
     * Set to 0 to not wrap. A useful value here is 78, for RFC2822 section 2.1.1 compliance.
     *
     * @see static::STD_LINE_LENGTH
     *
     * @var int
     */
    public $WordWrap = 0;

    /**
     * Which method to use to send mail.
     * Options: "mail", "sendmail", or "smtp".
     *
     * @var string
     */
    public $Mailer = 'mail';

    /**
     * The path to the sendmail program.
     *
     * @var string
     */
    public $Sendmail = '/usr/sbin/sendmail';

    /**
     * Whether mail() uses a fully sendmail-compatible MTA.
     * One which supports sendmail's "-oi -f" options.
     *
     * @var bool
     */
    public $UseSendmailOptions = true;

    /**
     * The email address that a reading confirmation should be sent to, also known as read receipt.
     *
     * @var string
     */
    public $ConfirmReadingTo = '';

    /**
     * The hostname to use in the Message-ID header and as default HELO string.
     * If empty, PHPMailer attempts to find one with, in order,
     * $_SERVER['SERVER_NAME'], gethostname(), php_uname('n'), or the value
     * 'localhost.localdomain'.
     *
     * @see PHPMailer::$Helo
     *
     * @var string
     */
    public $Hostname = '';

    /**
     * An ID to be used in the Message-ID header.
     * If empty, a unique id will be generated.
     * You can set your own, but it must be in the format "<id@domain>",
     * as defined in RFC5322 section 3.6.4 or it will be ignored.
     *
     * @see https://www.rfc-editor.org/rfc/rfc5322#section-3.6.4
     *
     * @var string
     */
    public $MessageID = '';

    /**
     * The message Date to be used in the Date header.
     * If empty, the current date will be added.
     *
     * @var string
     */
    public $MessageDate = '';

    /**
     * SMTP hosts.
     * Either a single hostname or multiple semicolon-delimited hostnames.
     * You can also specify a different port
     * for each host by using this format: [hostname:port]
     * (e.g. "smtp1.example.com:25;smtp2.example.com").
     * You can also specify encryption type, for example:
     * (e.g. "tls://smtp1.example.com:587;ssl://smtp2.example.com:465").
     * Hosts will be tried in order.
     *
     * @var string
     */
    public $Host = 'localhost';

    /**
     * The default SMTP server port.
     *
     * @var int
     */
    public $Port = 25;

    /**
     * The SMTP HELO/EHLO name used for the SMTP connection.
     * Default is $Hostname. If $Hostname is empty, PHPMailer attempts to find
     * one with the same method described above for $Hostname.
     *
     * @see PHPMailer::$Hostname
     *
     * @var string
     */
    public $Helo = '';

    /**
     * What kind of encryption to use on the SMTP connection.
     * Options: '', static::ENCRYPTION_STARTTLS, or static::ENCRYPTION_SMTPS.
     *
     * @var string
     */
    public $SMTPSecure = '';

    /**
     * Whether to enable TLS encryption automatically if a server supports it,
     * even if `SMTPSecure` is not set to 'tls'.
     * Be aware that in PHP >= 5.6 this requires that the server's certificates are valid.
     *
     * @var bool
     */
    public $SMTPAutoTLS = true;

    /**
     * Whether to use SMTP authentication.
     * Uses the Username and Password properties.
     *
     * @see PHPMailer::$Username
     * @see PHPMailer::$Password
     *
     * @var bool
     */
    public $SMTPAuth = false;

    /**
     * Options array passed to stream_context_create when connecting via SMTP.
     *
     * @var array
     */
    public $SMTPOptions = [];

    /**
     * SMTP username.
     *
     * @var string
     */
    public $Username = '';

    /**
     * SMTP password.
     *
     * @var string
     */
    public $Password = '';

    /**
     * SMTP authentication type. Options are CRAM-MD5, LOGIN, PLAIN, XOAUTH2.
     * If not specified, the first one from that list that the server supports will be selected.
     *
     * @var string
     */
    public $AuthType = '';

    /**
     * SMTP SMTPXClient command attributes
     *
     * @var array
     */
    protected $SMTPXClient = [];

    /**
     * An implementation of the PHPMailer OAuthTokenProvider interface.
     *
     * @var OAuthTokenProvider
     */
    protected $oauth;

    /**
     * The SMTP server timeout in seconds.
     * Default of 5 minutes (300sec) is from RFC2821 section 4.5.3.2.
     *
     * @var int
     */
    public $Timeout = 300;

    /**
     * Comma separated list of DSN notifications
     * 'NEVER' under no circumstances a DSN must be returned to the sender.
     * If you use NEVER all other notifications will be ignored.
     * 'SUCCESS' will notify you when your mail has arrived at its destination.
     * 'FAILURE' will arrive if an error occurred during delivery.
     * 'DELAY' will notify you if there is an unusual delay in delivery, but the actual
     * delivery's outcome (success or failure) is not yet decided.
     *
     * @see https://www.rfc-editor.org/rfc/rfc3461.html#section-4.1 for more information about NOTIFY
     */
    public $dsn = '';

    /**
     * SMTP class debug output mode.
     * Debug output level.
     * Options:
     * @see SMTP::DEBUG_OFF: No output
     * @see SMTP::DEBUG_CLIENT: Client messages
     * @see SMTP::DEBUG_SERVER: Client and server messages
     * @see SMTP::DEBUG_CONNECTION: As SERVER plus connection status
     * @see SMTP::DEBUG_LOWLEVEL: Noisy, low-level data output, rarely needed
     *
     * @see SMTP::$do_debug
     *
     * @var int
     */
    public $SMTPDebug = 0;

    /**
     * How to handle debug output.
     * Options:
     *
     * * `echo` Output plain-text as-is, appropriate for CLI
     * * `html` Output escaped, line breaks converted to `<br>`,
     * appropriate for browser output
     * * `error_log` Output to error log as configured in php.ini
     * By default PHPMailer will use `echo` if run from a `cli` or `cli-server` SAPI, `html` otherwise.
     * Alternatively, you can provide a callable expecting two params: a message string and the debug level:
     *
     * ```php
     * $mail->Debugoutput = function($str, $level) {echo "debug level $level; message: $str";};
     * ```
     *
     * Alternatively, you can pass in an instance of a PSR-3 compatible logger, though only `debug`
     * level output is used:
     * ```php
     * $mail->Debugoutput = new myPsr3Logger;
     * ```
     *
     * @see SMTP::$Debugoutput
     *
     * @var string|callable|\Psr\Log\LoggerInterface
     */
    public $Debugoutput = 'echo';

    /**
     * Whether to keep the SMTP connection open after each message.
     * If this is set to true then the connection will remain open after a send,
     * and closing the connection will require an explicit call to smtpClose().
     * It's a good idea to use this if you are sending multiple messages as it reduces overhead.
     * See the mailing list example for how to use it.
     *
     * @var bool
     */
    public $SMTPKeepAlive = false;

    /**
     * Whether to split multiple to addresses into multiple messages
     * or send them all in one message.
     * Only supported in `mail` and `sendmail` transports, not in SMTP.
     *
     * @var bool
     *
     * @deprecated 6.0.0 PHPMailer isn't a mailing list manager!
     */
    public $SingleTo = false;

    /**
     * Storage for addresses when SingleTo is enabled.
     *
     * @var array
     */
    protected $SingleToArray = [];

    /**
     * Whether to generate VERP addresses on send.
     * Only applicable when sending via SMTP.
     *
     * @see https://en.wikipedia.org/wiki/Variable_envelope_return_path
     * @see https://www.postfix.org/VERP_README.html Postfix VERP info
     *
     * @var bool
     */
    public $do_verp = false;

    /**
     * Whether to allow sending messages with an empty body.
     *
     * @var bool
     */
    public $AllowEmpty = false;

    /**
     * DKIM selector.
     *
     * @var string
     */
    public $DKIM_selector = '';

    /**
     * DKIM Identity.
     * Usually the email address used as the source of the email.
     *
     * @var string
     */
    public $DKIM_identity = '';

    /**
     * DKIM passphrase.
     * Used if your key is encrypted.
     *
     * @var string
     */
    public $DKIM_passphrase = '';

    /**
     * DKIM signing domain name.
     *
     * @example 'example.com'
     *
     * @var string
     */
    public $DKIM_domain = '';

    /**
     * DKIM Copy header field values for diagnostic use.
     *
     * @var bool
     */
    public $DKIM_copyHeaderFields = true;

    /**
     * DKIM Extra signing headers.
     *
     * @example ['List-Unsubscribe', 'List-Help']
     *
     * @var array
     */
    public $DKIM_extraHeaders = [];

    /**
     * DKIM private key file path.
     *
     * @var string
     */
    public $DKIM_private = '';

    /**
     * DKIM private key string.
     *
     * If set, takes precedence over `$DKIM_private`.
     *
     * @var string
     */
    public $DKIM_private_string = '';

    /**
     * Callback Action function name.
     *
     * The function that handles the result of the send email action.
     * It is called out by send() for each email sent.
     *
     * Value can be any php callable: https://www.php.net/is_callable
     *
     * Parameters:
     * bool $result result of the send action
     * array $to email addresses of the recipients
     * array $cc cc email addresses
     * array $bcc bcc email addresses
     * string $subject the subject
     * string $body the email body
     * string $from email address of sender
     * string $extra extra information of possible use
     * 'smtp_transaction_id' => last smtp transaction id
     *
     * @var callable|callable-string
     */
    public $action_function = '';

    /**
     * What to put in the X-Mailer header.
     * Options: An empty string for PHPMailer default, whitespace/null for none, or a string to use.
     *
     * @var string|null
     */
    public $XMailer = '';

    /**
     * Which validator to use by default when validating email addresses.
     * May be a callable to inject your own validator, but there are several built-in validators.
     * The default validator uses PHP's FILTER_VALIDATE_EMAIL filter_var option.
     *
     * If CharSet is UTF8, the validator is left at the default value,
     * and you send to addresses that use non-ASCII local parts, then
     * PHPMailer automatically changes to the 'eai' validator.
     *
     * @see PHPMailer::validateAddress()
     *
     * @var string|callable
     */
    public static $validator = 'php';

    /**
     * An instance of the SMTP sender class.
     *
     * @var SMTP
     */
    protected $smtp;

    /**
     * The array of 'to' names and addresses.
     *
     * @var array
     */
    protected $to = [];

    /**
     * The array of 'cc' names and addresses.
     *
     * @var array
     */
    protected $cc = [];

    /**
     * The array of 'bcc' names and addresses.
     *
     * @var array
     */
    protected $bcc = [];

    /**
     * The array of reply-to names and addresses.
     *
     * @var array
     */
    protected $ReplyTo = [];

    /**
     * An array of all kinds of addresses.
     * Includes all of $to, $cc, $bcc.
     *
     * @see PHPMailer::$to
     * @see PHPMailer::$cc
     * @see PHPMailer::$bcc
     *
     * @var array
     */
    protected $all_recipients = [];

    /**
     * An array of names and addresses queued for validation.
     * In send(), valid and non duplicate entries are moved to $all_recipients
     * and one of $to, $cc, or $bcc.
     * This array is used only for addresses with IDN.
     *
     * @see PHPMailer::$to
     * @see PHPMailer::$cc
     * @see PHPMailer::$bcc
     * @see PHPMailer::$all_recipients
     *
     * @var array
     */
    protected $RecipientsQueue = [];

    /**
     * An array of reply-to names and addresses queued for validation.
     * In send(), valid and non duplicate entries are moved to $ReplyTo.
     * This array is used only for addresses with IDN.
     *
     * @see PHPMailer::$ReplyTo
     *
     * @var array
     */
    protected $ReplyToQueue = [];

    /**
     * Whether the need for SMTPUTF8 has been detected. Set by
     * preSend() if necessary.
     *
     * @var bool
     */
    public $UseSMTPUTF8 = false;

    /**
     * The array of attachments.
     *
     * @var array
     */
    protected $attachment = [];

    /**
     * The array of custom headers.
     *
     * @var array
     */
    protected $CustomHeader = [];

    /**
     * The most recent Message-ID (including angular brackets).
     *
     * @var string
     */
    protected $lastMessageID = '';

    /**
     * The message's MIME type.
     *
     * @var string
     */
    protected $message_type = '';

    /**
     * The array of MIME boundary strings.
     *
     * @var array
     */
    protected $boundary = [];

    /**
     * The array of available text strings for the current language.
     *
     * @var array
     */
    protected static $language = [];

    /**
     * The number of errors encountered.
     *
     * @var int
     */
    protected $error_count = 0;

    /**
     * The S/MIME certificate file path.
     *
     * @var string
     */
    protected $sign_cert_file = '';

    /**
     * The S/MIME key file path.
     *
     * @var string
     */
    protected $sign_key_file = '';

    /**
     * The optional S/MIME extra certificates ("CA Chain") file path.
     *
     * @var string
     */
    protected $sign_extracerts_file = '';

    /**
     * The S/MIME password for the key.
     * Used only if the key is encrypted.
     *
     * @var string
     */
    protected $sign_key_pass = '';

    /**
     * Whether to throw exceptions for errors.
     *
     * @var bool
     */
    protected $exceptions = false;

    /**
     * Unique ID used for message ID and boundaries.
     *
     * @var string
     */
    protected $uniqueid = '';

    /**
     * The PHPMailer Version number.
     *
     * @var string
     */
    const VERSION = '6.10.0';

    /**
     * Error severity: message only, continue processing.
     *
     * @var int
     */
    const STOP_MESSAGE = 0;

    /**
     * Error severity: message, likely ok to continue processing.
     *
     * @var int
     */
    const STOP_CONTINUE = 1;

    /**
     * Error severity: message, plus full stop, critical error reached.
     *
     * @var int
     */
    const STOP_CRITICAL = 2;

    /**
     * The SMTP standard CRLF line break.
     * If you want to change line break format, change static::$LE, not this.
     */
    const CRLF = "\r\n";

    /**
     * "Folding White Space" a white space string used for line folding.
     */
    const FWS = ' ';

    /**
     * SMTP RFC standard line ending; Carriage Return, Line Feed.
     *
     * @var string
     */
    protected static $LE = self::CRLF;

    /**
     * The maximum line length supported by mail().
     *
     * Background: mail() will sometimes corrupt messages
     * with headers longer than 65 chars, see #818.
     *
     * @var int
     */
    const MAIL_MAX_LINE_LENGTH = 63;

    /**
     * The maximum line length allowed by RFC 2822 section 2.1.1.
     *
     * @var int
     */
    const MAX_LINE_LENGTH = 998;

    /**
     * The lower maximum line length allowed by RFC 2822 section 2.1.1.
     * This length does NOT include the line break
     * 76 means that lines will be 77 or 78 chars depending on whether
     * the line break format is LF or CRLF; both are valid.
     *
     * @var int
     */
    const STD_LINE_LENGTH = 76;

    /**
     * Constructor.
     *
     * @param bool $exceptions Should we throw external exceptions?
     */
    public function __construct($exceptions = null)
    {
        if (null !== $exceptions) {
            $this->exceptions = (bool) $exceptions;
        }
        //Pick an appropriate debug output format automatically
        $this->Debugoutput = (strpos(PHP_SAPI, 'cli') !== false ? 'echo' : 'html');
    }

    /**
     * Destructor.
     */
    public function __destruct()
    {
        //Close any open SMTP connection nicely
        $this->smtpClose();
    }

    /**
     * Call mail() in a safe_mode-aware fashion.
     * Also, unless sendmail_path points to sendmail (or something that
     * claims to be sendmail), don't pass params (not a perfect fix,
     * but it will do).
     *
     * @param string $to To
     * @param string $subject Subject
     * @param string $body Message Body
     * @param string $header Additional Header(s)
     * @param string|null $params Params
     *
     * @return bool
     */
    private function mailPassthru($to, $subject, $body, $header, $params)
    {
        //Check overloading of mail function to avoid double-encoding
        if ((int)ini_get('mbstring.func_overload') & 1) {
            $subject = $this->secureHeader($subject);
        } else {
            $subject = $this->encodeHeader($this->secureHeader($subject));
        }
        //Calling mail() with null params breaks
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

    /**
     * Output debugging info via a user-defined method.
     * Only generates output if debug output is enabled.
     *
     * @see PHPMailer::$Debugoutput
     * @see PHPMailer::$SMTPDebug
     *
     * @param string $str
     */
    protected function edebug($str)
    {
        if ($this->SMTPDebug <= 0) {
            return;
        }
        //Is this a PSR-3 logger?
        if ($this->Debugoutput instanceof \Psr\Log\LoggerInterface) {
            $this->Debugoutput->debug(rtrim($str, "\r\n"));

            return;
        }
        //Avoid clash with built-in function names
        if (is_callable($this->Debugoutput) && !in_array($this->Debugoutput, ['error_log', 'html', 'echo'])) {
            call_user_func($this->Debugoutput, $str, $this->SMTPDebug);

            return;
        }
        switch ($this->Debugoutput) {
            case 'error_log':
                //Don't output, just log
                /** @noinspection ForgottenDebugOutputInspection */
                error_log($str);
                break;
            case 'html':
                //Cleans up output a bit for a better looking, HTML-safe output
                echo htmlentities(
                    preg_replace('/[\r\n]+/', '', $str),
                    ENT_QUOTES,
                    'UTF-8'
                ),
                "<br>\n";
                break;
            case 'echo':
            default:
                //Normalize line breaks
                $str = preg_replace('/\r\n|\r/m', "\n", $str);
                echo gmdate('Y-m-d H:i:s'),
                "\t",
                //Trim trailing space
                trim(
                //Indent for readability, except for trailing break
                    str_replace(
                        "\n",
                        "\n \t ",
                        trim($str)
                    )
                ),
                "\n";
        }
    }

    /**
     * Sets message type to HTML or plain.
     *
     * @param bool $isHtml True for HTML mode
     */
    public function isHTML($isHtml = true)
    {
        if ($isHtml) {
            $this->ContentType = static::CONTENT_TYPE_TEXT_HTML;
        } else {
            $this->ContentType = static::CONTENT_TYPE_PLAINTEXT;
        }
    }

    /**
     * Send messages using SMTP.
     */
    public function isSMTP()
    {
        $this->Mailer = 'smtp';
    }

    /**
     * Send messages using PHP's mail() function.
     */
    public function isMail()
    {
        $this->Mailer = 'mail';
    }

    /**
     * Send messages using $Sendmail.
     */
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

    /**
     * Send messages using qmail.
     */
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

    /**
     * Add a "To" address.
     *
     * @param string $address The email address to send to
     * @param string $name
     *
     * @throws Exception
     *
     * @return bool true on success, false if address already used or invalid in some way
     */
    public function addAddress($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('to', $address, $name);
    }

    /**
     * Add a "CC" address.
     *
     * @param string $address The email address to send to
     * @param string $name
     *
     * @throws Exception
     *
     * @return bool true on success, false if address already used or invalid in some way
     */
    public function addCC($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('cc', $address, $name);
    }

    /**
     * Add a "BCC" address.
     *
     * @param string $address The email address to send to
     * @param string $name
     *
     * @throws Exception
     *
     * @return bool true on success, false if address already used or invalid in some way
     */
    public function addBCC($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('bcc', $address, $name);
    }

    /**
     * Add a "Reply-To" address.
     *
     * @param string $address The email address to reply to
     * @param string $name
     *
     * @throws Exception
     *
     * @return bool true on success, false if address already used or invalid in some way
     */
    public function addReplyTo($address, $name = '')
    {
        return $this->addOrEnqueueAnAddress('Reply-To', $address, $name);
    }

    /**
     * Add an address to one of the recipient arrays or to the ReplyTo array. Because PHPMailer
     * can't validate addresses with an IDN without knowing the PHPMailer::$CharSet (that can still
     * be modified after calling this function), addition of such addresses is delayed until send().
     * Addresses that have been added already return false, but do not throw exceptions.
     *
     * @param string $kind One of 'to', 'cc', 'bcc', or 'Reply-To'
     * @param string $address The email address
     * @param string $name An optional username associated with the address
     *
     * @throws Exception
     *
     * @return bool true on success, false if address already used or invalid in some way
     */
    protected function addOrEnqueueAnAddress($kind, $address, $name)
    {
        $pos = false;
        if ($address !== null) {
            $address = trim($address);
            $pos = strrpos($address, '@');
        }

        if (false === $pos) {
            //At-sign is missing.
            $error_message = sprintf(
                '%s (%s): %s', 
                self::lang('invalid_address'), 
                $kind,
                $address
            );
            $this->setError($error_message);
            $this->edebug($error_message);
            if ($this->exceptions) {
                throw new Exception($error_message);
            }

            return false;
        }

        if ($name !== null && is_string($name)) {
            $name = trim(preg_replace('/[\r\n]+/', '', $name)); //Strip breaks and trim
        } else {
            $name = '';
        }

        $params = [$kind, $address, $name];

        //Enqueue addresses with IDN until we know the PHPMailer::$CharSet.
        //Domain is assumed to be whatever is after the last @ symbol in the address
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
            //We have an 8-bit domain, but we are missing the necessary extensions to support it
            //Or we are already sending to this address
            return false;
        }

        //Immediately add standard addresses without IDN.
        return call_user_func_array([$this, 'addAnAddress'], $params);
    }

    /**
     * Set the boundaries to use for delimiting MIME parts.
     * If you override this, ensure you set all 3 boundaries to unique values.
     * The default boundaries include a "=_" sequence which cannot occur in quoted-printable bodies,
     * as suggested by https://www.rfc-editor.org/rfc/rfc2045#section-6.7
     *
     * @return void
     */
    public function setBoundaries()
    {
        $this->uniqueid = $this->generateId();
        $this->boundary[1] = 'b1=_' . $this->uniqueid;
        $this->boundary[2] = 'b2=_' . $this->uniqueid;
        $this->boundary[3] = 'b3=_' . $this->uniqueid;
    }

    /**
     * Add an address to one of the recipient arrays or to the ReplyTo array.
     * Addresses that have been added already return false, but do not throw exceptions.
     *
     * @param string $kind One of 'to', 'cc', 'bcc', or 'ReplyTo'
     * @param string $address The email address to send, resp. to reply to
     * @param string $name
     *
     * @throws Exception
     *
     * @return bool true on success, false if address already used or invalid in some way
     */
    protected function addAnAddress($kind, $address, $name = '')
    {
        if (
            self::$validator === 'php' &&
            ((bool) preg_match('/[\x80-\xFF]/', $address))
        ) {
            //The caller has not altered the validator and is sending to an address
            //with UTF-8, so assume that they want UTF-8 support instead of failing
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
                throw new Exception($error_message);
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
                throw new Exception($error_message);
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

    /**
     * Parse and validate a string containing one or more RFC822-style comma-separated email addresses
     * of the form "display name <address>" into an array of name/address pairs.
     * Uses the imap_rfc822_parse_adrlist function if the IMAP extension is available.
     * Note that quotes in the name part are removed.
     *
     * @see https://www.andrew.cmu.edu/user/agreen1/testing/mrbs/web/Mail/RFC822.php A more careful implementation
     *
     * @param string $addrstr The address list string
     * @param bool $useimap Whether to use the IMAP extension to parse the list
     * @param string $charset The charset to use when decoding the address list string.
     *
     * @return array
     */
    public static function parseAddresses($addrstr, $useimap = true, $charset = self::CHARSET_ISO88591)
    {
        $addresses = [];
        if ($useimap && function_exists('imap_rfc822_parse_adrlist')) {
            //Use this built-in parser if it's available
            $list = imap_rfc822_parse_adrlist($addrstr, '');
            // Clear any potential IMAP errors to get rid of notices being thrown at end of script.
            imap_errors();
            foreach ($list as $address) {
                if (
                    '.SYNTAX-ERROR.' !== $address->host &&
                    static::validateAddress($address->mailbox . '@' . $address->host)
                ) {
                    //Decode the name part if it's present and encoded
                    if (
                        property_exists($address, 'personal') &&
                        //Check for a Mbstring constant rather than using extension_loaded, which is sometimes disabled
                        defined('MB_CASE_UPPER') &&
                        preg_match('/^=\?.*\?=$/s', $address->personal)
                    ) {
                        $origCharset = mb_internal_encoding();
                        mb_internal_encoding($charset);
                        //Undo any RFC2047-encoded spaces-as-underscores
                        $address->personal = str_replace('_', '=20', $address->personal);
                        //Decode the name
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
            //Use this simpler parser
            $addresses = self::parseSimplerAddresses($addrstr, $charset);
        }

        return $addresses;
    }

    /**
     * Parse a string containing one or more RFC822-style comma-separated email addresses
     * with the form "display name <address>" into an array of name/address pairs.
     * Uses a simpler parser that does not require the IMAP extension but doesnt support
     * the full RFC822 spec. For full RFC822 support, use the PHP IMAP extension.
     *
     * @param string $addrstr The address list string
     * @param string $charset The charset to use when decoding the address list string.
     *
     * @return array
     */
    protected static function parseSimplerAddresses($addrstr, $charset)
    {
        // Emit a runtime notice to recommend using the IMAP extension for full RFC822 parsing
        trigger_error(self::lang('imap_recommended'), E_USER_NOTICE);
        $list = explode(',', $addrstr);
        foreach ($list as $address) {
            $address = trim($address);
            //Is there a separate name part?
            if (strpos($address, '<') === false) {
                //No separate name, just use the whole thing
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
                    //Check for a Mbstring constant rather than using extension_loaded, which is sometimes disabled
                    //If this name is encoded, decode it
                    if (defined('MB_CASE_UPPER') && preg_match('/^=\?.*\?=$/s', $name)) {
                        $origCharset = mb_internal_encoding();
                        mb_internal_encoding($charset);
                        //Undo any RFC2047-encoded spaces-as-underscores
                        $name = str_replace('_', '=20', $name);
                        //Decode the name
                        $name = mb_decode_mimeheader($name);
                        mb_internal_encoding($origCharset);
                    }
                    $addresses[] = [
                        //Remove any surrounding quotes and spaces from the name
                        'name' => trim($name, '\'" '),
                        'address' => $email,
                    ];
                }
            }
        }

        return $addresses;
    }

    /**
     * Set the From and FromName properties.
     *
     * @param string $address
     * @param string $name
     * @param bool $auto Whether to also set the Sender address, defaults to true
     *
     * @throws Exception
     *
     * @return bool
     */
    public function setFrom($address, $name = '', $auto = true)
    {
        if (is_null($name)) {
            //Helps avoid a deprecation warning in the preg_replace() below
            $name = '';
        }
        $address = trim((string)$address);
        $name = trim(preg_replace('/[\r\n]+/', '', $name)); //Strip breaks and trim
        //Don't validate now addresses with IDN. Will be done in send().
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
                throw new Exception($error_message);
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

    /**
     * Return the Message-ID header of the last email.
     * Technically this is the value from the last time the headers were created,
     * but it's also the message ID of the last sent message except in
     * pathological cases.
     *
     * @return string
     */
    public function getLastMessageID()
    {
        return $this->lastMessageID;
    }

    /**
     * Check that a string looks like an email address.
     * Validation patterns supported:
     *
     * * `auto` Pick best pattern automatically;
     * * `pcre8` Use the squiloople.com pattern, requires PCRE > 8.0;
     * * `pcre` Use old PCRE implementation;
     * * `php` Use PHP built-in FILTER_VALIDATE_EMAIL;
     * * `html5` Use the pattern given by the HTML5 spec for 'email' type form input elements.
     * * `eai` Use a pattern similar to the HTML5 spec for 'email' and to firefox, extended to support EAI (RFC6530).
     * * `noregex` Don't use a regex: super fast, really dumb.
     * Alternatively you may pass in a callable to inject your own validator, for example:
     *
     * ```php
     * PHPMailer::validateAddress('user@example.com', function($address) {
     * return (strpos($address, '@') !== false);
     * });
     * ```
     *
     * You can also set the PHPMailer::$validator static to a callable, allowing built-in methods to use your validator.
     *
     * @param string $address The email address to check
     * @param string|callable $patternselect Which pattern to use
     *
     * @return bool
     */
    public static function validateAddress($address, $patternselect = null)
    {
        if (null === $patternselect) {
            $patternselect = static::$validator;
        }
        //Don't allow strings as callables, see SECURITY.md and CVE-2021-3603
        if (is_callable($patternselect) && !is_string($patternselect)) {
            return call_user_func($patternselect, $address);
        }
        //Reject line breaks in addresses; it's valid RFC5322, but not RFC5321
        if (strpos($address, "\n") !== false || strpos($address, "\r") !== false) {
            return false;
        }
        switch ($patternselect) {
            case 'pcre': //Kept for BC
            case 'pcre8':
                // NOTE: The original complex PCRE-based validator is large and, in some distributions,
                // can become corrupted or cause parse errors if not copied exactly. To avoid parse
                // failures and still provide strong validation, use PHP's built-in FILTER_VALIDATE_EMAIL.
                // This is a pragmatic, safe fallback that eliminates the broken regex while keeping
                // address validation reliable for typical usage.
                return (bool) filter_var($address, FILTER_VALIDATE_EMAIL);
            case 'html5':
                /*
                 * This is the pattern used in the HTML5 spec for validation of 'email' type form input elements.
                 *
                 * @see https://html.spec.whatwg.org/#e-mail-state-(type=email)
                 */
                return (bool) preg_match(
                    '/^[a-zA-Z0-9.!#$%&\' *+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}' . 
                    '[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/sD',
                    $address
                );
            case 'eai':
                /*
                 * This is the pattern used in the HTML5 spec for validation of 'email' type
                 * form input elements (as above), modified to accept Unicode email addresses.
                 * This is also more lenient than Firefox' html5 spec, in order to make the regex faster.
                 * 'eai' is an acronym for Email Address Internationalization.
                 * This validator is selected automatically if you attempt to use recipient addresses
                 * that contain Unicode characters in the local part.
                 *
                 * @see https://html.spec.whatwg.org/#e-mail-state-(type=email)
                 * @see https://en.wikipedia.org/wiki/International_email
                 */
                return (bool) preg_match(
                    '/^[-p{L}p{N}p{M}.!#$%&\' *+\/=?^_`{|}~-]+@p{L}p{N}p{M}(?:[p{L}p{N}p{M}-]{0,61}' . 
                    '[p{L}p{N}p{M}])?(?:\.p{L}p{N}p{M}' . 
                    '(?:[-p{L}p{N}p{M}]{0,61}[p{L}p{N}p{M}])?)*$/usD',
                    $address
                );
            case 'php':
            default:
                return filter_var($address, FILTER_VALIDATE_EMAIL) !== false;
        }
    }

    /**
     * Tells whether IDNs (Internationalized Domain Names) are supported or not. This requires the
     * `intl` and `mbstring` PHP extensions.
     *
     * @return bool `true` if required functions for IDN support are present
     */
    public static function idnSupported()
    {
        return function_exists('idn_to_ascii') && function_exists('mb_convert_encoding');
    }

    /**
     * Converts IDN in given email address to its ASCII form, also known as punycode, if possible.
     * Important: Address must be passed in same encoding as currently set in PHPMailer::$CharSet.
     * This function silently returns unmodified address if:
     * - No conversion is necessary (i.e. domain name is not an IDN, or is already in ASCII form)
     * - Conversion to punycode is impossible (e.g. required PHP functions are not available)
     * or fails for any reason (e.g. domain contains characters not allowed in an IDN).
     *
     * @see PHPMailer::$CharSet
     *
     * @param string $address The email address to convert
     *
     * @return string The encoded address in ASCII form
     */
    public function punyencodeAddress($address)
    {
        //Verify we have required functions, CharSet, and at-sign.
        $pos = strrpos($address, '@');
        if (
            !empty($this->CharSet) &&
            false !== $pos &&
            static::idnSupported()
        ) {
            $domain = substr($address, ++$pos);
            //Verify CharSet string is a valid one, and domain properly encoded in this CharSet.
            if ($this->has8bitChars($domain) && @mb_check_encoding($domain, $this->CharSet)) {
                //Convert the domain from whatever charset it's in to UTF-8
                $domain = mb_convert_encoding($domain, self::CHARSET_UTF8, $this->CharSet);
                //Ignore IDE complaints about this line - method signature changed in PHP 5.4
                $errorcode = 0;
                if (defined('INTL_IDNA_VARIANT_UTS46')) {
                    //Use the current punycode standard (appeared in PHP 7.2)
                    $punycode = idn_to_ascii(
                        $domain,
                        \IDNA_DEFAULT | \IDNA_USE_STD3_RULES | \IDNA_CHECK_BIDI | \IDNA_CHECK_CONTEXTJ | \IDNA_NONTRANSITIONAL_TO_ASCII,
                        \INTL_IDNA_VARIANT_UTS46
                    );
                } elseif (defined('INTL_IDNA_VARIANT_2003')) {
                    //Fall back to this old, deprecated/removed encoding
                    $punycode = idn_to_ascii($domain, $errorcode, \INTL_IDNA_VARIANT_2003);
                } else {
                    //Fall back to a default we don't know about
                    $punycode = idn_to_ascii($domain, $errorcode);
                }
                if (false !== $punycode) {
                    return substr($address, 0, $pos) . $punycode;
                }
            }
        }

        return $address;
    }

    /**
     * Create a message and send it.
     * Uses the sending method specified by $Mailer.
     *
     * @throws Exception
     *
     * @return bool false on error - See the ErrorInfo property for details of the error
     */
    public function send()
    {
        try {
            if (!$this->preSend()) {
                return false;
            }

            return $this->postSend();
        } catch (Exception $exc) {
            $this->mailHeader = '';
            $this->setError($exc->getMessage());
            if ($this->exceptions) {
                throw $exc;
            }

            return false;
        }
    }

    /**
     * Prepare a message for sending.
     *
     * @throws Exception
     *
     * @return bool
     */
    public function preSend()
    {
        if (
            'smtp' === $this->Mailer ||
            ('mail' === $this->Mailer && (((\PHP_VERSION_ID >= 80000 || stripos(PHP_OS, 'WIN') === 0))))
        ) {
            //SMTP mandates RFC-compliant line endings
            //and it's also used with mail() on Windows
            static::setLE(self::CRLF);
        } else {
            //Maintain backward compatibility with legacy Linux command line mailers
            static::setLE(PHP_EOL);
        }
        //Check for buggy PHP versions that add a header with an incorrect line break
        if (
            'mail' === $this->Mailer &&
            (((\PHP_VERSION_ID >= 70000 && \PHP_VERSION_ID < 70017) || (\PHP_VERSION_ID >= 70100 && \PHP_VERSION_ID < 70103)) &&
                ini_get('mail.add_x_header') === '1' &&
                stripos(PHP_OS, 'WIN') === 0)
        ) {
            trigger_error(self::lang('buggy_php'), E_USER_WARNING);
        }

        try {
            $this->error_count = 0; //Reset errors
            $this->mailHeader = '';

            //The code below tries to support full use of Unicode,
            //while remaining compatible with legacy SMTP servers to
            //the greatest degree possible: If the message uses
            //Unicode in the local parts of any addresses, it is sent
            //using SMTPUTF8. If not, it it sent using
            //punycode-encoded domains and plain SMTP.
            if (
                static::CHARSET_UTF8 === strtolower($this->CharSet) &&
                ($this->anyAddressHasUnicodeLocalPart($this->RecipientsQueue) ||
                    $this->anyAddressHasUnicodeLocalPart(array_keys($this->all_recipients)) ||
                    $this->anyAddressHasUnicodeLocalPart($this->ReplyToQueue) ||
                    $this->addressHasUnicodeLocalPart($this->From))
            ) {
                $this->UseSMTPUTF8 = true;
            }

            //Dequeue recipient and Reply-To addresses with IDN
            foreach (array_merge($this->RecipientsQueue, $this->ReplyToQueue) as $params) {
                if (!$this->UseSMTPUTF8) {
                    $params[1] = $this->punyencodeAddress($params[1]);
                }
                call_user_func_array([$this, 'addAnAddress'], $params);
            }

            if (count($this->to) + count($this->cc) + count($this->bcc) < 1) {
                throw new Exception(self::lang('provide_address'), self::STOP_CRITICAL);
            }

            //Validate From, Sender, and ConfirmReadingTo addresses
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
                        throw new Exception($error_message);
                    }

                    return false;
                }
            }

            //Set whether the message is multipart/alternative
            if ($this->alternativeExists()) {
                $this->ContentType = static::CONTENT_TYPE_MULTIPART_ALTERNATIVE;
            }

            $this->setMessageType();
            //Refuse to send an empty message unless we are specifically allowing it
            if (!$this->AllowEmpty && empty($this->Body)) {
                throw new Exception(self::lang('empty_message'), self::STOP_CRITICAL);
            }

            //Trim subject consistently
            $this->Subject = trim($this->Subject);

            //Create body before headers in case body makes changes to headers (e.g. altering transfer encoding)
            $this->MIMEHeader = '';
            $this->MIMEBody = $this->createBody();
            //createBody may have added some headers, so retain them
            $tempheaders = $this->MIMEHeader;
            $this->MIMEHeader = $this->createHeader();
            $this->MIMEHeader .= $tempheaders;

            //To capture the complete message when using mail(), create
            //an extra header list which createHeader() doesn't fold in
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

            //Sign with DKIM if enabled
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
        } catch (Exception $exc) {
            $this->setError($exc->getMessage());
            if ($this->exceptions) {
                throw $exc;
            }

            return false;
        }
    }

    /**
     * Actually send a message via the selected mechanism.
     *
     * @throws Exception
     *
     * @return bool
     */
    public function postSend()
    {
        try {
            //Choose the mailer and send through it
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
        } catch (Exception $exc) {
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

    /**
     * Send mail using the $Sendmail program.
     *
     * @see PHPMailer::$Sendmail
     *
     * @param string $header The message headers
     * @param string $body The message body
     *
     * @throws Exception
     *
     * @return bool
     */
    protected function sendmailSend($header, $body)
    {
        if ($this->Mailer === 'qmail') {
            $this->edebug('Sending with qmail');
        } else {
            $this->edebug('Sending with sendmail');
        }
        $header = static::stripTrailingWSP($header) . static::$LE . static::$LE;

        //This sets the SMTP envelope sender which gets turned into a return-path header by the receiver
        //A space after `-f` is optional, but there is a long history of its presence
        //causing problems, so we don't use one
        //Exim docs: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-the_exim_command_line.html
        //Sendmail docs: https://www.sendmail.org/~ca/email/man/sendmail.html
        //Example problem: https://www.drupal.org/node/1057954
        //PHP 5.6 workaround
        $sendmail_from_value = ini_get('sendmail_from');
        if (empty($this->Sender) && !empty($sendmail_from_value)) {
            //PHP config has a sender address we can use
            $this->Sender = ini_get('sendmail_from');
        }
        //CVE-2016-10033, CVE-2016-10045: Don't pass -f if characters will be escaped.
        if (!empty($this->Sender) && static::validateAddress($this->Sender) && self::isShellSafe($this->Sender)) {
            if ($this->Mailer === 'qmail') {
                $sendmailFmt = '%s -f%s';
            } else {
                $sendmailFmt = '%s -oi -f%s -t';
            }
        } elseif ($this->Mailer === 'qmail') {
            $sendmailFmt = '%s';
        } else {
            //Allow sendmail to choose a default envelope sender. It may
            //seem preferable to force it to use the From header as with
            //SMTP, but that introduces new problems (see #513),
            //and it has historically worked this way.
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
                    throw new Exception(self::lang('execute') . $this->Sendmail, self::STOP_CRITICAL);
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
                    throw new Exception(self::lang('execute') . $this->Sendmail, self::STOP_CRITICAL);
                }
            }
        } else {
            $mail = @popen($sendmail, 'w');
            if (!$mail) {
                throw new Exception(self::lang('execute') . $this->Sendmail, self::STOP_CRITICAL);
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
                throw new Exception(self::lang('execute') . $this->Sendmail, self::STOP_CRITICAL);
            }
        }

        return true;
    }

    /**
     * Fix CVE-2016-10033 and CVE-2016-10045 by disallowing potentially unsafe shell characters.
     * Note that escapeshellarg and escapeshellcmd are inadequate for our purposes, especially on Windows.
     *
     * @see https://github.com/PHPMailer/PHPMailer/issues/924 CVE-2016-10045 bug report
     *
     * @param string $string The string to be validated
     *
     * @return bool
     */
    protected static function isShellSafe($string)
    {
        //It's not possible to use shell commands safely (which includes the mail() function) without escapeshellarg,
        //but some hosting providers disable it, creating a security problem that we don't want to have to deal with,
        //so we don't.
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
            //All other characters have a special meaning in at least one common shell, including = and +.
            //Full stop (.) has a special meaning in cmd.exe, but its impact should be negligible here.
            //Note that this does permit non-Latin alphanumeric characters based on the current locale.
            if (!ctype_alnum($c) && strpos('@_-.', $c) === false) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check whether a file path is of a permitted type.
     * Used to reject URLs and phar files from functions that access local file paths,
     * such as addAttachment.
     *
     * @param string $path A relative or absolute path to a file
     *
     * @return bool
     */
    protected static function isPermittedPath($path)
    {
        //Matches scheme definition from https://www.rfc-editor.org/rfc/rfc3986#section-3.1
        return !preg_match('#^[a-z][a-z\d+.-]*://#i', $path);
    }

    /**
     * Check whether a file path is safe, accessible, and readable.
     *
     * @param string $path A relative or absolute path to a file
     *
     * @return bool
     */
    protected static function fileIsAccessible($path)
    {
        if (!static::isPermittedPath($path)) {
            return false;
        }
        $readable = is_file($path);
        //If not a UNC path (expected to start with \), check read permission, see #2069
        if (strpos($path, '\\') !== 0) {
            $readable = $readable && is_readable($path);
        }

        return $readable;
    }

    /**
     * Send mail using the PHP mail() function.
     *
     * @see https://www.php.net/manual/en/book.mail.php
     *
     * @param string $header The message headers
     * @param string $body The message body
     *
     * @throws Exception
     *
     * @return bool
     */
    protected function mailSend($header, $body)
    {
        $header = static::stripTrailingWSP($header) . static::$LE . static::$LE;
        $toArr = [];
        foreach ($this->to as $toaddr) {
            $toArr[] = $this->addrFormat($toaddr);
        }
        $to = trim(implode(', ', $toArr));

        //If there are no To-addresses (e.g. when sending only to BCC-addresses)
        //the following should be added to get a correct DKIM-signature.
        //Compare with $this->preSend()
        if ($to === '') {
            $to = 'undisclosed-recipients:;';
        }

        $params = null;
        //This sets the SMTP envelope sender which gets turned into a return-path header by the receiver
        //A space after `-f` is optional, but there is a long history of its presence
        //causing problems, so we don't use one
        //Exim docs: https://www.exim.org/exim-html-current/doc/html/spec_html/ch-the_exim_command_line.html
        //Sendmail docs: https://www.sendmail.org/~ca/email/man/sendmail.html
        //Example problem: https://www.drupal.org/node/1057954
        //CVE-2016-10033, CVE-2016-10045: Don't pass -f if characters will be escaped.
        //PHP 5.6 workaround
        $sendmail_from_value = ini_get('sendmail_from');
        if (empty($this->Sender) && !empty($sendmail_from_value)) {
            //PHP config has a sender address we can use
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
            throw new Exception(self::lang('instantiate'), self::STOP_CRITICAL);
        }

        return true;
    }

    /**
     * Get an instance to use for SMTP operations.
     * Override this function to load your own SMTP implementation,
     * or set one with setSMTPInstance.
     *
     * @return SMTP
     */
    public function getSMTPInstance()
    {
        if (!is_object($this->smtp)) {
            $this->smtp = new SMTP();
        }

        return $this->smtp;
    }

    /**
     * Provide an instance to use for SMTP operations.
     *
     * @return SMTP
     */
    public function setSMTPInstance(SMTP $smtp)
    {
        $this->smtp = $smtp;

        return $this->smtp;
    }

    /**
     * Provide SMTP XCLIENT attributes
     *
     * @param string $name Attribute name
     * @param ?string $value Attribute value
     *
     * @return bool
     */
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

    /**
     * Get SMTP XCLIENT attributes
     *
     * @return array
     */
    public function getSMTPXclientAttributes()
    {
        return $this->SMTPXClient;
    }

    /**
     * Send mail via SMTP.
     * Returns false if there is a bad MAIL FROM, RCPT, or DATA input.
     *
     * @see PHPMailer::setSMTPInstance() to use a different class.
     *
    
     * @uses \PHPMailer\PHPMailer\SMTP
     *
     * @param string $header The message headers
     * @param string $body The message body
     *
     * @throws Exception
     *
     * @return bool
     */
    protected function smtpSend($header, $body)
    {
        $header = static::stripTrailingWSP($header) . static::$LE . static::$LE;
        $bad_rcpt = [];
        if (!$this->smtpConnect($this->SMTPOptions)) {
            throw new Exception(self::lang('smtp_connect_failed'), self::STOP_CRITICAL);
        }
        //If we have recipient addresses that need Unicode support,
        //but the server doesn't support it, stop here
        if ($this->UseSMTPUTF8 && !$this->smtp->getServerExt('SMTPUTF8')) {
            throw new Exception(self::lang('no_smtputf8'), self::STOP_CRITICAL);
        }
        //Sender already validated in preSend()
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
            throw new Exception($this->ErrorInfo, self::STOP_CRITICAL);
        }

        $callbacks = [];
        //Attempt to send to all recipients
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

        //Only send the DATA command if we have viable recipients
        if ((count($this->all_recipients) > count($bad_rcpt)) && !$this->smtp->data($header . $body)) {
            throw new Exception(self::lang('data_not_accepted'), self::STOP_CRITICAL);
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

        //Create error message for any bad addresses
        if (count($bad_rcpt) > 0) {
            $errstr = '';
            foreach ($bad_rcpt as $bad) {
                $errstr .= $bad['to'] . ': ' . $bad['error'];
            }
            throw new Exception(
                self::lang('recipients_failed') . $errstr,
                self::STOP_CONTINUE
            );
        }

        return true;
    }

    /**
     * Initiate a connection to an SMTP server.
     * Returns false if the operation failed.
     *
     * @param array $options An array of options compatible with stream_context_create()
     *
     * @throws Exception
     *
     * @uses \PHPMailer\PHPMailer\SMTP
     *
     * @return bool
     */
    public function smtpConnect($options = null)
    {
        if (null === $this->smtp) {
            $this->smtp = $this->getSMTPInstance();
        }

        //If no options are provided, use whatever is set in the instance
        if (null === $options) {
            $options = $this->SMTPOptions;
        }

        //Already connected?
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
                //Not a valid host entry
                continue;
            }

            //$hostinfo[1]: optional ssl or tls prefix
            //$hostinfo[2]: the hostname
            //$hostinfo[3]: optional port number

            //The host string prefix can temporarily override the current setting for SMTPSecure
            //If it's not specified, the default value is used
            //Check the host name is a valid name or IP address before trying to use it
            if (!static::isValidHost($hostinfo[2])) {
                $this->edebug(self::lang('invalid_host') . ' ' . $hostinfo[2]);
                continue;
            }

            $prefix = '';
            $secure = $this->SMTPSecure;
            $tls = (static::ENCRYPTION_STARTTLS === $this->SMTPSecure);

            if ('ssl' === $hostinfo[1] || ('' === $hostinfo[1] && static::ENCRYPTION_SMTPS === $this->SMTPSecure)) {
                $prefix = 'ssl://';
                $tls = false; //Can't have SSL and TLS at the same time
                $secure = static::ENCRYPTION_SMTPS;
            } elseif ('tls' === $hostinfo[1]) {
                $tls = true; //TLS doesn't use a prefix
                $secure = static::ENCRYPTION_STARTTLS;
            }

            //Do we need the OpenSSL extension?
            $sslext = defined('OPENSSL_ALGO_SHA256');
            if (static::ENCRYPTION_STARTTLS === $secure || static::ENCRYPTION_SMTPS === $secure) {
                //Check for an OpenSSL constant rather than using extension_loaded, which is sometimes disabled
                if (!$sslext) {
                    throw new Exception(self::lang('extension_missing') . 'openssl', self::STOP_CRITICAL);
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

                    //Automatically enable TLS encryption if:
                    //* it's not disabled
                    //* we are not connecting to localhost
                    //* we have openssl extension
                    //* we are not already using SSL
                    //* the server offers STARTTLS
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
                            throw new Exception($message);
                        }

                        //We must resend EHLO after TLS negotiation
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
                        throw new Exception(self::lang('authenticate'));
                    }

                    return true;
                } catch (Exception $exc) {
                    $lastexception = $exc;
                    $this->edebug($exc->getMessage());
                    //We must have connected, but then failed TLS or Auth, so close connection nicely
                    $this->smtp->quit();
                }
            }
        }
        //If we get here, all connection attempts have failed, so close connection hard
        $this->smtp->close();
        //As we've caught all exceptions, just report whatever the last one was
        if ($this->exceptions && null !== $lastexception) {
            throw $lastexception;
        }
        if ($this->exceptions) {
            // no exception was thrown, likely $this->smtp->connect() failed
            $message = $this->getSmtpErrorMessage('connect_host');
            throw new Exception($message);
        }

        return false;
    }

    /**
     * Close the active SMTP session if one exists.
     */
    public function smtpClose()
    {
        if ((null !== $this->smtp) && $this->smtp->connected()) {
            $this->smtp->quit();
            $this->smtp->close();
        }
    }

    /**
     * Set the language for error messages.
     * The default language is English.
     *
     * @param string $langcode ISO 639-1 2-character language code (e.g. French is "fr")
     * Optionally, the language code can be enhanced with a 4-character
     * script annotation and/or a 2-character country annotation.
     * @param string $lang_path Path to the language file directory, with trailing separator (slash)
     * Do not set this from user input!
     *
     * @return bool Returns true if the requested language was loaded, false otherwise.
     */
    public static function setLanguage($langcode = 'en', $lang_path = '')
    {
        //Backwards compatibility for renamed language codes
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
        //Define full set of translatable strings in English
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
            //Calculate an absolute path so it can work if CWD is not here
            $lang_path = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'language' . DIRECTORY_SEPARATOR;
        }
        //Validate $langcode
        $foundlang = true;
        $langcode = strtolower($langcode);
        if (!preg_match('/^(?P<lang>[a-z]{2})(?P<script>_[a-z]{4})?(?P<country>_[a-z]{2})?$/', $langcode, $matches)) {
            $foundlang = false;
        }

        $lang_file = $lang_path . $langcode . '.lang.php';
        //The language file contains a switch statement on the $langcode variable,
        //which has been validated as containing only basic alpha-numeric characters.
        //There's no risk of arbitrary code execution here.
        if ($foundlang && static::isPermittedPath($lang_file) && file_exists($lang_file)) {
            //Merge language strings
            $PHPMAILER_LANG = include $lang_file;
        }
        static::$language = $PHPMAILER_LANG;

        return true;
    }

    /**
     * Get the array of strings for the current language.
     *
     * @return array
     */
    public function getTranslations()
    {
        return static::$language;
    }

    /**
     * Add a generic address.
     *
     * @param string $kind 'to', 'cc', 'bcc', 'Reply-To'
     * @param string $address The email address
     * @param string $name An optional name
     *
     * @throws Exception
     *
     * @return bool
     */
        return $this->addOrEnqueueAnAddress('Reply-To', $address, $name);
    }

    /**
     * Get the current From address.
     *
     * @return string
     */
    public function getFrom()
    {
        return $this->From;
    }

    /**
     * Get the current From name.
     *
     * @return string
     */
    public function getFromName()
    {
        return $this->FromName;
    }

    /**
     * Get the current Sender address.
     *
     * @return string
     */
    public function getSender()
    {
        return $this->Sender;
    }

    /**
     * Get the current Subject.
     *
     * @return string
     */
    public function getSubject()
    {
        return $this->Subject;
    }

    /**
     * Get the current Body.
     *
     * @return string
     */
    public function getBody()
    {
        return $this->Body;
    }

    /**
     * Get the current AltBody.
     *
     * @return string
     */
    public function getAltBody()
    {
        return $this->AltBody;
    }

    /**
     * Get the current Ical.
     *
     * @return string
     */
    public function getIcal()
    {
        return $this->Ical;
    }

    /**
     * Get the current Mailer.
     *
     * @return string
     */
    public function getMailer()
    {
        return $this->Mailer;
    }

    /**
     * Get the current Sendmail path.
     *
     * @return string
     */
    public function getSendmail()
    {
        return $this->Sendmail;
    }

    /**
     * Get the current Host.
     *
     * @return string
     */
    public function getHost()
    {
        return $this->Host;
    }

    /**
     * Get the current Port.
     *
     * @return int
     */
    public function getPort()
    {
        return $this->Port;
    }

    /**
     * Get the current Helo.
     *
     * @return string
     */
    public function getHelo()
    {
        return $this->Helo;
    }

    /**
     * Get the current SMTPSecure.
     *
     * @return string
     */
    public function getSMTPSecure()
    {
        return $this->SMTPSecure;
    }

    /**
     * Get the current SMTPAutoTLS.
     *
     * @return bool
     */
    public function getSMTPAutoTLS()
    {
        return $this->SMTPAutoTLS;
    }

    /**
     * Get the current SMTPAuth.
     *
     * @return bool
     */
    public function getSMTPAuth()
    {
        return $this->SMTPAuth;
    }

    /**
     * Get the current SMTPOptions.
     *
     * @return array
     */
    public function getSMTPOptions()
    {
        return $this->SMTPOptions;
    }

    /**
     * Get the current Username.
     *
     * @return string
     */
    public function getUsername()
    {
        return $this->Username;
    }

    /**
     * Get the current Password.
     *
     * @return string
     */
    public function getPassword()
    {
        return $this->Password;
    }

    /**
     * Get the current AuthType.
     *
     * @return string
     */
    public function getAuthType()
    {
        return $this->AuthType;
    }

    /**
     * Get the current Timeout.
     *
     * @return int
     */
    public function getTimeout()
    {
        return $this->Timeout;
    }

    /**
     * Get the current SMTPDebug.
     *
     * @return int
     */
    public function getSMTPDebug()
    {
        return $this->SMTPDebug;
    }

    /**
     * Get the current Debugoutput.
     *
     * @return string|callable
     */
    public function getDebugoutput()
    {
        return $this->Debugoutput;
    }

    /**
     * Get the current SMTPKeepAlive.
     *
     * @return bool
     */
    public function getSMTPKeepAlive()
    {
        return $this->SMTPKeepAlive;
    }

    /**
     * Get the current SingleTo.
     *
     * @return bool
     */
    public function getSingleTo()
    {
        return $this->SingleTo;
    }

    /**
     * Get the current do_verp.
     *
     * @return bool
     */
    public function getVerp()
    {
        return $this->do_verp;
    }

    /**
     * Get the current AllowEmpty.
     *
     * @return bool
     */
    public function getAllowEmpty()
    {
        return $this->AllowEmpty;
    }

    /**
     * Get the current DKIM_selector.
     *
     * @return string
     */
    public function getDKIMSelector()
    {
        return $this->DKIM_selector;
    }

    /**
     * Get the current DKIM_identity.
     *
     * @return string
     */
    public function getDKIMIdentity()
    {
        return $this->DKIM_identity;
    }

    /**
     * Get the current DKIM_passphrase.
     *
     * @return string
     */
    public function getDKIMPassphrase()
    {
        return $this->DKIM_passphrase;
    }

    /**
     * Get the current DKIM_domain.
     *
     * @return string
     */
    public function getDKIMDomain()
    {
        return $this->DKIM_domain;
    }

    /**
     * Get the current DKIM_private.
     *
     * @return string
     */
    public function getDKIMprivate()
    {
        return $this->DKIM_private;
    }

    /**
     * Get the current action_function.
     *
     * @return callable|string
     */
    public function getActionfunction()
    {
        return $this->action_function;
    }

    /**
     * Get the current XMailer.
     *
     * @return string
     */
    public function getXMailer()
    {
        return $this->XMailer;
    }

    /**
     * Get the current validator.
     *
     * @return string|callable
     */
    public function getValidator()
    {
        return static::$validator;
    }

    /**
     * Get the current to array.
     *
     * @return array
     */
    public function getToAddresses()
    {
        return $this->to;
    }

    /**
     * Get the current cc array.
     *
     * @return array
     */
    public function getCcAddresses()
    {
        return $this->cc;
    }

    /**
     * Get the current bcc array.
     *
     * @return array
     */
    public function getBccAddresses()
    {
        return $this->bcc;
    }

    /**
     * Get the current Reply-to array.
     *
     * @return array
     */
    public function getReplyToAddresses()
    {
        return $this->ReplyTo;
    }

    /**
     * Get the current all_recipients array.
     *
     * @return array
     */
    public function getAllRecipientAddresses()
    {
        return $this->all_recipients;
    }

    /**
     * Get the current attachment array.
     *
     * @return array
     */
    public function getAttachments()
    {
        return $this->attachment;
    }

    /**
     * Get the current CustomHeader array.
     *
     * @return array
     */
    public function getCustomHeaders()
    {
        return $this->CustomHeader;
    }

    /**
     * Get the current message_type.
     *
     * @return string
     */
    public function getMessageType()
    {
        return $this->message_type;
    }

    /**
     * Get the current boundary array.
     *
     * @return array
     */
    public function getBoundary()
    {
        return $this->boundary;
    }

    /**
     * Get the current error_count.
     *
     * @return int
     */
    public function getErrorCount()
    {
        return $this->error_count;
    }

    /**
     * Get the current sign_cert_file.
     *
     * @return string
     */
    public function getSignCertFile()
    {
        return $this->sign_cert_file;
    }

    /**
     * Get the current sign_key_file.
     *
     * @return string
     */
    public function getSignKeyFile()
    {
        return $this->sign_key_file;
    }

    /**
     * Get the current sign_extracerts_file.
     *
     * @return string
     */
    public function getSignExtracertsFile()
    {
        return $this->sign_extracerts_file;
    }

    /**
     * Get the current sign_key_pass.
     *
     * @return string
     */
    public function getSignKeyPass()
    {
        return $this->sign_key_pass;
    }

    /**
     * Get the current exceptions.
     *
     * @return bool
     */
    public function getExceptions()
    {
        return $this->exceptions;
    }
}
