package com.vicky.online_book_reading_platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class OnlineBookReadingPlatformApplication {

	public static void main(String[] args) {
		SpringApplication.run(OnlineBookReadingPlatformApplication.class, args);
	}

}
