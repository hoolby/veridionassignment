from bs4 import BeautifulSoup
from datetime import datetime
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider
from spacy.matcher import Matcher
from urllib.parse import urlparse
import json
import logging
import os
import re
import requests  # Add requests to make HTTP calls
import scrapy
import spacy
import sys

# Configure logging to ensure each message is flushed immediately
logger = logging.getLogger("domain_spider")
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('[%(name)s]: %(message)s'))
handler.flush = sys.stdout.flush  # Force each log message to flush immediately
logger.addHandler(handler)
logger.setLevel(logging.INFO)  # Adjust level as needed

class ContactSpider(CrawlSpider):
    name = 'domain_spider'
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'DOWNLOAD_TIMEOUT': 15,
        'CONCURRENT_REQUESTS': 10,
        'DOWNLOAD_DELAY': 0.5,
        'RETRY_TIMES': 0,
        'DEPTH_LIMIT': 2,
        'LOG_FORMAT': '[%(name)s]: %(message)s',
        'LOG_ENCODING': 'utf-8'
    }

    def __init__(self, domains=None, job_id=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Job params
        self.job_id = job_id
        self.domains = domains.split(',') if domains else []
        self.total_domains = len(self.domains)
        
        # Script variables
        self.output_folder = "output"
        self.phone_regex = re.compile(r'\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
        self.working_domains = set()
        start= {
            'total_domains': self.total_domains
        }
        self.logger.info(json.dumps(start))

    def start_requests(self):
        for domain in self.domains:
            # Define URL variants for each domain
            url_variants = [
                f"https://{domain}",
                f"https://www.{domain}"
                f"http://{domain}",
                f"http://www.{domain}",
            ]
            # Pass URL variants to parse method
            yield scrapy.Request(url=url_variants[0], meta={'variants': url_variants, 'index': 0, 'domain': domain}, callback=self.parse_variant, errback=self.errback_variant)
            
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

        for link in links:
            yield scrapy.Request(
                    link.url,
                    callback=self.parse_item, 
                    errback=self.errback, 
                    dont_filter=True,
                    meta={'domain': domain}
                )

    def parse_variant(self, response):
        # Indicate that we found a working URL by marking a flag
        response.meta['found_working'] = True
        
        # Variables
        domain = response.meta['domain']
        valid_url = response.url
        
        # Extract content
        soup = BeautifulSoup(response.body, 'lxml')
        
        # Remove scripts and style tags
        for script in soup(["script", "style"]):
            script.extract()
        
        # Clean multiple spaces
        text_content = re.sub(r'\s+', ' ', soup.get_text()).strip()
        
        #################################################
        # Process response
        phone_numbers = list(set(self.phone_regex.findall(text_content)))
        social_media_links = self.extract_social_media_links(soup)
        
        # Extract data and return JSON object
        data = {
            'domain': domain,
            'valid_url': valid_url,
            'last_crawled_date': datetime.now().isoformat(),
            'social_media_links':social_media_links if social_media_links else None,
            'phone_numbers':phone_numbers if phone_numbers else None
            # 'text_content': text_content  # Replace with actual data extraction logic
        }
        self.logger.info(json.dumps(data))
        
        # Update Elasticsearch with the result
        self.update_elasticsearch(domain, data)

    def errback_variant(self, failure):
        # Retrieve metadata
        variants = failure.request.meta['variants']
        index = failure.request.meta['index']
        domain = failure.request.meta['domain']

        # If a working URL has been found, stop trying other variants
        if failure.request.meta.get('found_working', False):
            return

        # Check if there are more variants to try
        if index + 1 < len(variants):
            # Try the next URL variant
            next_variant = variants[index + 1]
            yield scrapy.Request(
                url=next_variant,
                meta={
                    'variants': variants,
                    'index': index + 1,
                    'domain': domain,
                    'found_working': failure.request.meta.get('found_working', False)
                },
                callback=self.parse_variant,
                errback=self.errback_variant
            )
        else:
            # Log error JSON object if no variant is found
            error_data = {
                'domain': domain,
                'valid_url': None,
                'message': 'No working variant found',
                'error': str(failure.value),
                'last_crawled_date': datetime.now().isoformat()
            }
            self.logger.error(json.dumps(error_data))
            
            # Update Elasticsearch with the error
            self.update_elasticsearch(domain, error_data)

    def update_elasticsearch(self, domain, result):
        url = "http://localhost:9200/domains/_update_by_query"
        auth = ('elastic', 'changeme')
        headers = {'Content-Type': 'application/json'}
        data = {
            "script": {
                "source": "ctx._source.putAll(params)",
                "params": result
            },
            "query": {
                "term": {
                    "domain": domain
                }
            }
        }
        response = requests.post(url, auth=auth, headers=headers, json=data)
        if response.status_code == 200:
            self.logger.info(f"Successfully updated domain {domain} in Elasticsearch.")
        else:
            self.logger.error(f"Failed to update domain {domain} in Elasticsearch: {response.text}")
    
    def extract_social_media_links(self, soup):
        links = {}
        for a in soup.find_all('a', href=True):
            href = a['href']
            if 'facebook.com' in href:
                links['facebook'] = href
            elif 'instagram.com' in href:
                links['instagram'] = href
            elif 'linkedin.com' in href:
                links['linkedin'] = href
            elif 'twitter.com' in href:
                links['twitter'] = href
        return links
    
    def closed(self, reason):
        logger.info(f"PROGRESS COMPLETE: Crawling completed with reason: {reason}.")