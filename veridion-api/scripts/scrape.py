import scrapy
import re
from urllib.parse import urlparse
import json
from twisted.internet.error import TimeoutError, DNSLookupError, TCPTimedOutError, ConnectionRefusedError
import time

# NLP
import spacy
nlp = spacy.load("en_core_web_sm")

def extract_entities(text):
    doc = nlp(text)
    companies = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
    locations = [ent.text for ent in doc.ents if ent.label_ == "GPE"]
    return companies, locations


class ContactSpider(scrapy.Spider):
    name = 'contact_spider'
    custom_settings = {
        'LOG_LEVEL': 'ERROR',
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        'TIMEOUT': 15,
        'CONCURRENT_REQUESTS': 20,
        'DOWNLOAD_DELAY': 0.5,
        'RETRY_TIMES': 3,  # Increased retry count
        'RETRY_ENABLED': True,
    }

    def __init__(self, urls=None, job_id=None, *args, **kwargs):
        super(ContactSpider, self).__init__(*args, **kwargs)
        self.start_urls = urls.split(',')
        self.job_id = job_id
        self.visited_urls = set()
        self.results = []
        self.errors = []
        self.counter = 0
        self.url_variants_cache = {}  # Cache to track which variants have been tried per base domain
        self.retry_attempts = {}

    def generate_url_variants(self, base_url):
        parsed_url = urlparse(base_url)
        domain = parsed_url.netloc or parsed_url.path
        schemes = ['http://', 'https://']
        prefixes = ['', 'www.']

        variants = []
        for scheme in schemes:
            for prefix in prefixes:
                full_url = scheme + prefix + domain
                variants.append(full_url)
        print(f"Generated variants for {base_url}: {variants}")
        return variants

    def start_requests(self):
        for url in self.start_urls:
            self.allowed_domain = urlparse(url).netloc
            self.url_variants_cache[url] = self.generate_url_variants(url)
            yield from self.try_next_variant(url)

    def try_next_variant(self, base_url):
        variants = self.url_variants_cache.get(base_url, [])
        if variants:
            variant = variants.pop(0)
            # Track retry attempts for each base URL
            if base_url not in self.retry_attempts:
                self.retry_attempts[base_url] = 0
            yield scrapy.Request(url=variant, callback=self.parse, errback=self.errback, meta={'base_url': base_url})

    def parse(self, response):
        base_url = response.meta['base_url']
        self.url_variants_cache.pop(base_url, None)  # Remove other variants once one works

        if base_url in self.visited_urls:
            return
        self.visited_urls.add(base_url)

        phone_numbers = re.findall(r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', response.text)
        social_media_patterns = r'(https?://(?:www\.)?(facebook|twitter|instagram|linkedin)\.com/[^\s"]+)'
        social_media_links = re.findall(social_media_patterns, response.text)
        social_media = {platform: link for link, platform in social_media_links}
        locations = re.findall(r'\b\d{5}(?:[-\s]\d{4})?\b', response.text)
        company_commercial_name = response.css('title::text').get()
        description = response.css('meta[name="description"]::attr(content)').get()

        result = {
            'url': base_url,
            'company_commercial_name': company_commercial_name,
            'phone_numbers': phone_numbers,
            'social_media': social_media,
            'locations': locations,
            'description': description,
        }
        self.results.append(result)
        self.counter += 1

        if self.counter >= 2:
            self.write_results_to_file()
            self.counter = 0

        for href in response.css('a::attr(href)').getall():
            full_url = response.urljoin(href)
            link_domain = urlparse(full_url).netloc
            if link_domain == self.allowed_domain and full_url not in self.visited_urls:
                yield scrapy.Request(url=full_url, callback=self.parse, errback=self.errback)

    def errback(self, failure):
        base_url = failure.request.meta['base_url']
        variants = self.url_variants_cache.get(base_url, [])
        error_type = failure.type.__name__
        
        if isinstance(failure.value, (TimeoutError, DNSLookupError, TCPTimedOutError, ConnectionRefusedError)):
            # Retry with backoff logic
            retries = self.retry_attempts.get(base_url, 0)
            if retries < 3:  # Set a limit for retries
                self.retry_attempts[base_url] += 1
                wait_time = 2 ** retries  # Exponential backoff
                print(f"Retrying {base_url} in {wait_time} seconds due to {error_type}")
                time.sleep(wait_time)
                yield from self.try_next_variant(base_url)
            else:
                print(f"Max retries reached for {base_url}")
        else:
            if variants:
                yield from self.try_next_variant(base_url)
            else:
                self.errors.append({
                    'url': base_url,
                    'errorMessage': str(failure.getErrorMessage()),
                    'errorType': error_type,
                })
                self.counter += 1

                if self.counter >= 2:
                    self.write_results_to_file()
                    self.counter = 0

    def write_results_to_file(self):
        with open(f'output/{self.job_id}.results.json', 'a') as file:
            for result in self.results:
                file.write(json.dumps(result) + ',\n')
            for error in self.errors:
                file.write(json.dumps(error) + ',\n')
        self.results = []
        self.errors = []

    def close(self, reason):
        if self.results or self.errors:
            self.write_results_to_file()

        with open(f'output/{self.job_id}.results.json', 'r+') as file:
            content = file.read()
            file.seek(0)
            file.write('[\n' + content + '\n]')
