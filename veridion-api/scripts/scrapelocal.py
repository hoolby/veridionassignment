import scrapy
import re
from urllib.parse import urlparse

class ContactSpider(scrapy.Spider):
    name = 'contact_spider'

    def start_requests(self):
        urls = ['http://creativebusinessassociates.com']  # List of websites to scrape
        for url in urls:
            # Parse the starting domain
            self.allowed_domain = urlparse(url).netloc
            yield scrapy.Request(url=url, callback=self.parse)

    def parse(self, response):
        # Extract phone numbers
        phone_numbers = re.findall(r'\(?\b[0-9]{3}[-.)\s]*[0-9]{3}[-.\s]*[0-9]{4}\b', response.text)
        # Extract social media links
        social_media = response.css('a::attr(href)').re(r'.*(facebook|twitter|instagram|linkedin)\.com.*')
        # Extract locations (assuming they follow common patterns like postal codes or city names)
        locations = re.findall(r'\b\d{5}(?:[-\s]\d{4})?\b', response.text)  # Example: US ZIP codes

        # Process the results
        yield {
            'url': response.url,
            'phone_numbers': phone_numbers,
            'social_media': social_media,
            'locations': locations,
        }

        # Follow internal links only (on the same domain)
        for href in response.css('a::attr(href)').getall():
            # Get the full URL from the href attribute
            full_url = response.urljoin(href)
            # Parse the domain of the href link
            link_domain = urlparse(full_url).netloc
            # Follow the link if it belongs to the same domain
            if link_domain == self.allowed_domain:
                yield response.follow(href, self.parse)
