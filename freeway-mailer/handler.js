"use strict"
/**
 * An openfaas function for sending emails and keeping track of sent emails.
 * The handler async (event, context) is exported.
 * 
 * Copyright: Paul von Allwörden 2019 Darmstadt, Germany
 */

const nodemailer = require("nodemailer");
const fs = require("./fs-async");
const path = require("path");
const htmlparser = require("node-html-parser");
const JobError = require("./JobError");
const DEBUG = getEnv("DEBUG", false);

// Environment variables
const MAIL_HOST = getEnv("MAIL_HOST", null);
const MAIL_PORT = getEnv("MAIL_PORT", 587);
const MAIL_SECURE = getEnv("MAIL_SECURE", true);
const MAIL_USER_NAME = getEnv("MAIL_USER_NAME", null);
const MAIL_USER_PASS = getEnv("MAIL_USER_PASS", null);

/**
 * This function is the handler. It is called by openfaas.
 */
module.exports = async (event, context) => {
    return doJob(event.body).then((result) => {
        return context
            .status(200)
            .succeed(result);
    }).catch((error) => {
        const handledError = handleError(error);
        return context
            .status(handledError.status)
            .succeed(handledError.response);
    });
}

/**
 * Main function. Sends an email.
 * 
 * @param {object} body The payload. Details found in README.md
 * @returns {object} The reponse. Details found in README.md
 * @throws {JobError, Error} 
 */
async function doJob(body) {
    const { initiator, mail } = body;
    const mailToSend = { from, to, subject, text, html };

    // From
    if (mail.from) {
        const { name, address } = mail.from;

        if (name === null && address === null)
            throw new JobError("Field 'name' and 'address' not set. Specify at least one.")

        mailToSend.from = `"${name || os.userInfo().username}" <${address || os.hostname()}>`;
    } else {
        throw new JobError("Field 'from' not set.", JobError.REASON_CLIENT);
    }

    // To
    if (mail.to) {
        mailToSend.to = mail.to;
    } else {
        throw new JobError("Field 'to' not set.", JobError.REASON_CLIENT);
    }

    // Subject
    if (mail.subject) {
        mailToSend.subject = mail.subject;
    } else {
        throw new JobError("Field 'subject' not set.", JobError.REASON_CLIENT);
    }

    // Text / Html / Template
    if (mail.text) {
        mailToSend.text = mail.text;
    } else if (mail.html) {
        mailToSend.html = mail.html;
    } else if (mail.template) {
        if (!mail.template.id) {
            throw new JobError("No template id specified.", JobError.REASON_CLIENT);
        }

        mailToSend.html = await getTemplate(mail.template.id, { ...mail.template, id: undefined });
    } else {
        throw new JobError("Field 'text' nor 'html' nor 'template' set.", JobError.REASON_CLIENT);
    }

    let transporter;
    if (DEBUG) {
        transporter = getTestingTransport();
    } else {
        transporter = getTransport()
    }

    // Send mail
    let info = await sendEmail(transporter, mailToSend);

    // Send result
    const result = {};
    if (DEBUG) {
        result.previewUrl = nodemailer.getTestMessageUrl(info);
    }

    result.accepted = info.accepted;
    result.rejected = info.rejected;

    return result;
}

/**
 * This function returns a SMTP transport from ethereal for testing.
 */
function getTestingTransport() {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass // generated ethereal password
        }
    });
}

/**
 * This function returns a SMTP transport based on the set environment variables.
 */
function getTransport() {
    // create reusable transporter object using the default SMTP transport
    return nodemailer.createTransport({
        host: MAIL_HOST,
        port: MAIL_PORT,
        secure: MAIL_SECURE,
        auth: {
            user: MAIL_USER_NAME,
            pass: MAIL_USER_PASS
        }
    });
}

/**
 * This functions loads a html template and inserts values from the values object.
 * 
 * Example:
 * Template File: templ.html > <div><p id='label'/></div>
 * id: "templ"
 * values: { label: "Hello World!" }
 * returns: <div><p id='label'>Hello World!</p></div>
 *  
 * 
 * @param {string} key Template key 
 * @param {object} values Values to replace in template
 * @returns The html template as a string 
 */
async function getTemplate(key, values) {
    // Find template
    const fileName = key + ".html";
    const templates = await fs.readDir("./templates");
    if (!templates[fileName]) throw new JobError(`Template '${key}' does not exist.`);

    // Read file & parse html
    const templatePath = path.join("./template", fileName);
    const template = await fs.readFile(templatePath).then(d => d.toString());
    const html = htmlparser.parse(template, { script: false });

    const valueKeys = Object.keys(values);

    // Go through every node and replace the content of nodes that have matching ids
    // in the values object.
    function setChildValues(node) {
        if (valueKeys.includes(node.id)) {
            node.set_content(values[node.id]);
            return;
        }

        node.childNodes.forEach(child => setChildValues(child));
    }

    setChildValues(html);

    return html.toString();
}

/**
 * This function sends an email via a transporter.
 * 
 * @param {SMTP Transporter} transporter The transporter to use
 * @param {Mail Object} mail The mail to send 
 * @throws {JobError} If sending emails fails
 */
function sendEmail(transporter, mail) {
    return transporter.sendMail(mailToSend)
        .catch(error => {
            throw new JobError("Sending emails failed.", JobError.REASON_SERVER, error);
        })
}

/**
 * This function returns the environment variable that corresponds to the given key. 
 * 
 * @param {string} key The env var key 
 * @param {object} def The default value to return if no env var with the key was found.
 * @returns The env var value.
 */
function getEnv(key, def) {
    return process.env[key] || def;
}

/**
 * This function returns an object with information about an error.
 * Furthermore it logs the error if the it is not caused by the client.
 * 
 * @param {Error} error The error to handle.
 * @returns {object} Object with status & response values. 
 */
function handleError(error) {
    if (!typeof error === "JobError") {
        console.error(error);
        return {
            status: 500,
            response: {
                error: "Unknown error"
            }
        };
    }

    // Client Error (probably bad input)
    if (error.reason === JobError.REASON_CLIENT) {
        return {
            status: 400,
            response: {
                error: error.message
            }
        };
    }

    // Server Error
    console.error(error.originalError);
    return {
        status: 500,
        response: {
            error: error.message
        }
    };
}