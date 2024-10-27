import scrapy
from scrapy.spiders import CrawlSpider
from scrapy.linkextractors import LinkExtractor
import os
import re
from urllib.parse import urlparse
from bs4 import BeautifulSoup

class ContactSpider(CrawlSpider):
    name = 'contact_spider'
    custom_settings = {
        'LOG_LEVEL': 'DEBUG',
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'DOWNLOAD_TIMEOUT': 15,
        'CONCURRENT_REQUESTS': 10,
        'DOWNLOAD_DELAY': 0.5,
        'RETRY_TIMES': 0,
        'DEPTH_LIMIT': 2
    }

    def __init__(self, urls=None, job_id=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.job_id = job_id
        self.output_folder = "output"
        self.working_domains = set()
        self.current_domain_index = 0
        self.current_variant_index = 0
        self.domains = urls.split(',') if urls else []

        # Ensure the output folder exists
        os.makedirs(self.output_folder, exist_ok=True)

    def generate_url_variants(self, domain):
        return [f"{scheme}{prefix}{domain}" for scheme in ["https://", "http://"] for prefix in ["", "www."]]

    def start_requests(self):
        """Override start_requests to yield the first URL."""
        if self.domains:
            yield from self.start_next_url()

    def start_next_url(self):
        if self.current_domain_index < len(self.domains):
            domain = self.domains[self.current_domain_index]
            variants = self.generate_url_variants(domain)

            if self.current_variant_index < len(variants):
                url_to_crawl = variants[self.current_variant_index]
                self.log(f"Trying URL: {url_to_crawl}")
                yield scrapy.Request(
                    url_to_crawl, 
                    callback=self.parse_item, 
                    errback=self.errback, 
                    dont_filter=True,
                    meta={'domain': domain}
                )
            else:
                self.current_domain_index += 1
                self.current_variant_index = 0
                yield from self.start_next_url()
        else:
            self.log("All URLs have been processed.")
            yield None  # Completion message can be useful for logging

    def parse_item(self, response):
        domain = response.meta['domain']
        
        if domain not in self.working_domains:
            self.working_domains.add(domain)
            domain_folder = os.path.join(self.output_folder, domain)
            os.makedirs(domain_folder, exist_ok=True)

        soup = BeautifulSoup(response.body, 'lxml')
        for script in soup(["script", "style"]):
            script.extract()

        text_content = re.sub(r'\s+', ' ', soup.get_text()).strip()
        path = urlparse(response.url).path.strip("/").replace("/", "_")
        filename = os.path.join(self.output_folder, domain, f"{path if path else 'index'}.txt")
        
        with open(filename, "w", encoding='utf-8') as f:
            f.write(text_content)
            link_extractor = LinkExtractor(
                allow_domains=[domain],
                deny_extensions=['pdf', 'doc', 'jpg', 'png', 'gif', 'zip'],
                deny=['mailto:', 'javascript:', 'tel:', 'fax:', 'sms:', 'callto:', 'skype:', 'whatsapp:', r'#.*']
            )
            links = link_extractor.extract_links(response)
            self.log(f"Found {len(links)} links on {response.url}")

        for link in links:
            self.log(f"Following link: {link.url}")
            yield scrapy.Request(
                    link.url,
                    callback=self.parse_item, 
                    errback=self.errback, 
                    dont_filter=True,
                    meta={'domain': domain}
                )

        self.current_variant_index += 1
        yield from self.start_next_url()

    def errback(self, failure):
        self.log(f"Error for {failure.request.url}: {failure.value}")
        self.current_variant_index += 1
        yield from self.start_next_url()

    def closed(self, reason):
        self.log("Crawling complete. Results saved in individual text files for each domain.")
