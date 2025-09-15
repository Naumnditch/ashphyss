# Email Setup for Booking Notifications

The booking system is now configured to send booking information to `contact@ashphys.com`. To enable email functionality, you need to set up email service credentials.

## Gmail Setup (Recommended)

1. **Create App Password for Gmail:**
   - Go to your Google Account settings
   - Navigate to "Security" > "2-Step Verification"
   - Scroll down to "App passwords"
   - Generate a new app password for "Mail"
   - Copy the 16-character password

2. **Add Environment Variables:**
   Add these to your `.env.local` file:
   ```env
   EMAIL_USER=your-gmail-address@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

## Alternative Email Providers

If you prefer using a different email service, modify the `lib/email.ts` file to use the `createSMTPTransporter` function with your provider's SMTP settings.

### Examples:

**Outlook/Hotmail:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

**Yahoo:**
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

## Testing

Once configured, test the booking system by:
1. Filling out the booking form on your website
2. Checking the `contact@ashphys.com` inbox for the booking notification
3. Checking the server logs for any email sending errors

## Troubleshooting

- Ensure 2-factor authentication is enabled for Gmail
- Use app passwords, not your regular Gmail password
- Check spam/junk folders for test emails
- Verify environment variables are correctly set
- Check server logs for detailed error messages
