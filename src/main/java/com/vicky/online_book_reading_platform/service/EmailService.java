package com.vicky.online_book_reading_platform.service;

import com.vicky.online_book_reading_platform.enums.Role;
import com.vicky.online_book_reading_platform.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.base-url}")
    private String baseUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendWelcomeEmail(User user) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);

            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("🎉 Welcome to IntelliRead - Your Reading Journey Begins!");

            boolean isPublisher = user.getRole() == Role.PUBLISHER;

            String statusMessage = isPublisher
                    ? "<p style='margin-bottom: 15px;'>Your publisher account is currently <strong>pending admin approval</strong>. "
                    + "We'll notify you once it's activated — you'll then be able to publish and manage books on IntelliRead.</p>"
                    : "<p style='margin-bottom: 15px;'>Your account has been successfully created and you're all set to explore our vast library of books with AI-powered features.</p>";

            String buttonLabel = isPublisher ? "Go to Login 📚" : "Start Reading Now 📚";

            String content = "<html>" +
                    "<body style='font-family: Arial, sans-serif; color: #333; line-height: 1.6;'>" +
                    "<div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;'>" +
                    "<div style='text-align: center; margin-bottom: 30px;'>" +
                    "<img src='cid:logoImage' width='150' alt='IntelliRead Logo' style='margin-bottom: 20px;'>" +
                    "<h1 style='color: #2c5aa0; margin-bottom: 10px;'>Welcome to IntelliRead!</h1>" +
                    "<p style='color: #666; font-size: 16px;'>Your AI-Powered Reading Companion</p>" +
                    "</div>" +

                    "<div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;'>" +
                    "<h2 style='color: #2c5aa0; margin-bottom: 15px;'>Hello " + user.getName() + ",</h2>" +
                    "<p style='margin-bottom: 15px;'>We're thrilled to welcome you to <strong>IntelliRead</strong> - where reading meets intelligence! 🚀</p>" +
                    statusMessage +
                    "</div>" +

                    "<div style='text-align: center; margin: 30px 0;'>" +
                    "<a href='" + baseUrl + "/login' " +
                    "style='display: inline-block; padding: 12px 30px; background: #2c5aa0; color: white; " +
                    "text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;'>" +
                    buttonLabel +
                    "</a>" +
                    "</div>" +

                    "<div style='border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 20px; text-align: center;'>" +
                    "<p style='color: #666; margin-bottom: 10px;'>Need help? We're here for you!</p>" +
                    "<p style='color: #666; margin-bottom: 5px;'>📧 Email: <a href='mailto:noreply.intelliread@gmail.com' style='color: #2c5aa0;'>noreply.intelliread@gmail.com</a></p>" +
                    "</div>" +
                    "</div>" +
                    "</body></html>";

            helper.setText(content, true);

            try {
                helper.addInline("logoImage", new ClassPathResource("static/images/logo.png"));
            } catch (Exception e) {
                log.warn("Logo image not found, sending email without logo");
            }

            mailSender.send(mimeMessage);
            log.info("Welcome email sent to: {}", user.getEmail());

        } catch (MessagingException | RuntimeException e) {
            log.error("Failed to send welcome email to: {}", user.getEmail(), e);
        }
    }
}