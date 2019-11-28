# Freeway Mailer
An openfaas function for sending emails and keeping track of sent emails.

## Features
- Text / Html
- Templates
- Logging to a database (planned at least)
- Testing with [Ethereal](ethereal.email)
- Multiple recipients

## Environment variables
| Key            | Description                             | Default |
| -------------- | --------------------------------------- | ------- |
| MAIL_HOST      | The host of the transport server        | null    |
| MAIL_PORT      | The port of the transport server        | 587     |
| MAIL_SECURE    | If using the port 465                   | true    |
| MAIL_USER_NAME | Transport server user name              | null    |
| MAIL_USER_PASS | Transport server user password          | null    |
| DEBUG          | Use debug/testing profile from ethereal | false   |

## Testing
For testing the function run it with the DEBUG=true and MAIL_SECURE=false. A free testing profile from ethereal will be created automagically.

## Payload
```
{
    initiator: <string>,
    mail: {
        from:{
            name: <string>,     // Sender name
            address: <string>   // Sender address
        },
        to: <string>,           // May be a comma seperated list of multiple emails
        subject: <string>,      // Subject line
        text: <string>,         // plain text body
        html: <string>,         // html body
        template: {
            id: <string>,   // The template to use
            ...: <string>   // All others keys will be mapped to the innerText of html elements that have the same id. Eg. <p id="test-key"></p>
        }
    }
}
```
**Required** 
- `from`
  - `name` or `address`
  - or both (prefered)
- `to`
- `subject`
- `text` or `html` or `template`

**Attention**
- If `from.name` is not specified, the username of the user that executed the function will be used! This may not be what you want.
- If `from.address` is not specified, the hostname of the machine will be used! This may not be what you want.
## Response
```
{
    accepted: <number>,         // Number of sent emails
    rejected: <number>,         // Number of emails that were supposed to be sent
    previewUrl: <number>        // Link to view email on Ethereal.email (only returned if env DEBUG is true)
}
```

## Example
The following payload...
```
{
    initiator: "foobar",
    mail: {
        from:{
            name: "Felix",
            address: "felix@example.com"
        },
        to: "john@yahoo.com,olivia@gmx.com",
        subject: "Hey!",
        text: "Hello World!"
    }
}
```

will produce the follwing result...
#### Response
```
{
    accepted: 2,
    rejected: 0
}
```

#### 2 Emails
One for `john@yahoo.com` and one for `olivia@gmx.com`
```
FROM:     "Felix" <felix@example.com> | Many email clients only show 'Felix'
SUBJECT:  Hey!
BODY:     Hello World!
```

# Templates
You can make use of templates to have a centralized place of storing email designs. Just place the html file in the `templates` folder. You may take a look at the `templates/example.html` to get a better understanding of templates.

### Template Replacements
You can give elements in your html file a specific id to replace there contents dynamically. The replacement values can simply be send along with the payload in the template object.

#### Example
The following configuration...
- templates/my-template.html
  - ```<html><div><p id="labelAbc"/></div></html>```
- payload
  - ```{..., template: { id: "my-template", labelAbc: "Hello World" }}```
  
will send the following result...
```
<html>
    <div>
        <p id="labelAbc">Hello World</p>
    </div>
</html>
```

**Note**: Multiple elements with the same id are supported!

## Limitations
- Currently only text replacements are supported. No images :(
- As this is a function and nothing is persisted during calls there may be faster solutions for sending emails.

## Author
Paul von Allwörden