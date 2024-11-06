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
        'DOWNLOAD_TIMEOUT': 120,
        'CONCURRENT_REQUESTS': 16,
        'DOWNLOAD_DELAY': 0.5,
        'RETRY_TIMES': 0,
        'DEPTH_LIMIT': 0,
        'LOG_FORMAT': '[%(name)s]: %(message)s',
        'LOG_ENCODING': 'utf-8',
        'REDIRECT_ENABLED': True
    }

    def __init__(self, domains=None, job_id=None, total_domains=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Job params
        self.job_id = job_id
        self.domains = domains.split(',') if domains else []
        self.process_total_domains = len(self.domains)
        self.total_domains = total_domains
        self.successful_domains = 0
        self.errored_domains = 0
        
        # NLP
        self.nlp = spacy.load("en_core_web_md")
        
        # PHONE MATCHER
        self.matcher = Matcher(self.nlp.vocab)
        phone_pattern = [{"ORTH": "("}, {"SHAPE": "ddd"}, {"ORTH": ")"}, {"SHAPE": "ddd"},{"ORTH": "-", "OP": "?"}, {"SHAPE": "ddd"}]
        self.matcher.add("PHONE_NUMBER", [phone_pattern])
        
        # Script variables
        self.output_folder = "output"
        self.phone_regex = re.compile(r'\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
        self.working_domains = set()
        start= {
            'process_total_domains': self.process_total_domains
        }
        self.logger.info(json.dumps(start))

    def start_requests(self):
        for domain in self.domains:
            # Define URL variants for each domain
            url_variants = [
                f"https://{domain}",
                f"https://www.{domain}",
                f"http://{domain}",
                f"http://www.{domain}"
            ]
            # Pass URL variants to parse method
            yield scrapy.Request(
                url=url_variants[0],
                meta={
                    'variants': url_variants,
                    'index': 0,
                    'domain': domain,
                    'dont_redirect': True,
                    'handle_httpstatus_list': [301,302]
                    },
                callback=self.parse_variant,
                errback=self.errback_variant,
                headers={('User-Agent', 'Mozilla/5.0')})

    def parse_variant(self, response):
        """
        Parses the variant of the given response, handling redirects and extracting relevant data.
        Args:
            response (scrapy.http.Response): The response object to parse.
        Yields:
            scrapy.Request: A new request if the response is a redirect.
        Extracts:
            - Website title
            - Website description
            - Company names
            - Locations
            - Phone numbers
            - Social media links
        Updates:
            - Elasticsearch with the extracted data.
            - Job progress by incrementing the count of successful domains.
        Logs:
            - Information about the processing status and extracted data.
        """
        # Handle redirects
        self.logger.info(f"Processing {response.status} response from {response.url}")
        if response.status in [301, 302]:
            redirected_url = response.headers.get('Location').decode('utf-8')
            self.logger.info(f"Redirected to {redirected_url}")
            yield scrapy.Request(
                redirected_url,
                callback=self.parse_variant,
                errback=self.errback_variant,
                dont_filter=True,
                meta=response.meta,  # Preserve meta information
                headers={('User-Agent', 'Mozilla/5.0')}
            )
            return
        
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
        
        # Load nlp on text
        doc = self.nlp(text_content)
        
        ################## SCRAPE DATA ##################
        try:
            # Website metadata
            website_title = soup.title.string if soup.title else None
            website_description = soup.find("meta", property="og:description")['content'] if soup.find("meta", property="og:description") else None
        except Exception as e:
            self.logger.error(f"Error extracting website metadata: {e}")
            website_title = None
            website_description = None

        try:
            # NER to extract company names
            company_all_available_names = list(set(ent.text for ent in doc.ents if ent.label_ == "ORG"))
        except Exception as e:
            self.logger.error(f"Error extracting company names: {e}")
            company_all_available_names = []

        try:
            # NER to extract company name from website title, website description, or company_all_available_names
            company_commercial_name = next((ent.text for ent in self.nlp(str(website_title)).ents if ent.label_ == "ORG"), None)
            if not company_commercial_name and website_description:
                company_commercial_name = next((ent.text for ent in self.nlp(str(website_description)).ents if ent.label_ == "ORG"), None)
            if not company_commercial_name and company_all_available_names:
                company_commercial_name = company_all_available_names[0]
        except Exception as e:
            self.logger.error(f"Error extracting company commercial name: {e}")
            company_commercial_name = None

        try:
            # NER to extract locations
            locations = list(set(ent.text for ent in doc.ents if ent.label_ == "GPE"))
        except Exception as e:
            self.logger.error(f"Error extracting locations: {e}")
            locations = []

        try:
            # Extract phone numbers
            phone_numbers = list(set(self.phone_regex.findall(text_content)))
            # Normalize phone numbers to contain only digits and plus sign
            phone_numbers = [re.sub(r'[^\d+]', '', phone) for phone in phone_numbers]
        except Exception as e:
            self.logger.error(f"Error extracting phone numbers: {e}")
            phone_numbers = []

        try:
            # Extract phone numbers using spacy matcher
            matches = self.matcher(doc)
            self.logger.info(f"MMMMMMMMMMMMMMMMM: {matches}")
            phone_numbers_from_nlp = list(set([doc[start:end].text for _, start, end in matches]))
            # Normalize phone numbers to contain only digits and plus sign
            phone_numbers_from_nlp = [re.sub(r'[^\d+]', '', phone) for phone in phone_numbers_from_nlp]
        except Exception as e:
            self.logger.error(f"Error extracting phone numbers using NLP: {e}")
            phone_numbers_from_nlp = []

        try:
            # Extract social media links
            social_media_links = self.extract_social_media_links(soup)
        except Exception as e:
            self.logger.error(f"Error extracting social media links: {e}")
            social_media_links = {}
        
        # Extract data and return JSON object
        data = {
            'domain': domain,
            'valid_url': valid_url,
            'website_title': website_title,
            'website_description': website_description,
            'company_all_available_names': company_all_available_names,
            'company_commercial_name': company_commercial_name,
            'phone_numbers': phone_numbers if phone_numbers else None,
            'phone_numbers_from_nlp': phone_numbers_from_nlp if phone_numbers_from_nlp else None,
            'locations': locations,
            'facebook': social_media_links.get('facebook', None),
            'instagram': social_media_links.get('instagram', None),
            'linkedin': social_media_links.get('linkedin', None),
            'last_job_id': self.job_id,
            'last_crawled_date': datetime.now().isoformat(),
            'status': 'SUCCESS',
            'text_content': text_content  # Replace with actual data extraction logic
        }
        # self.logger.info(json.dumps(data))
        
        # Update Elasticsearch with the result
        self.update_elasticsearch(domain, data)
        
        # Update job progress
        self.successful_domains += 1

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
                    'found_working': failure.request.meta.get('found_working', False),
                    'dont_redirect': True,
                    'handle_httpstatus_list': [301,302]
                },
                callback=self.parse_variant,
                errback=self.errback_variant,
                headers={('User-Agent', 'Mozilla/5.0')}
            )
        else:
            # Log error JSON object if no variant is found
            error_data = {
                'domain': domain,
                'valid_url': None,
                'message': 'No working variant found',
                'status': 'ERROR',
                'error': str(failure.value),
                'last_job_id': self.job_id,
                'last_crawled_date': datetime.now().isoformat()
            }
            self.logger.error(json.dumps(error_data))
            
            # Update Elasticsearch with the error
            self.update_elasticsearch(domain, error_data)
            
            # Update job progress
            self.errored_domains += 1

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

    def finish_job(self):
        progress = round(
            ((self.successful_domains + self.errored_domains) / self.total_domains) * 100
        )
        job_data = {
            'successfulDomains': self.successful_domains,
            'erroredDomains': self.errored_domains,
            'progress': progress
        }
        url = f"http://localhost:9200/jobs/_update/{self.job_id}"
        auth = ('elastic', 'changeme')
        headers = {'Content-Type': 'application/json'}
        data = {
            "doc": job_data
        }
        response = requests.post(url, auth=auth, headers=headers, json=data)
        if response.status_code == 200:
            self.logger.info(f"Successfully updated job {self.job_id} progress in Elasticsearch.")
        else:
            self.logger.error(f"Failed to update job {self.job_id} progress in Elasticsearch: {response.text}")

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
        result = {
            'job': self.job_id,
            'status': 'COMPLETE',
            'reason': reason,
            'successfulDomains': self.successful_domains,
            'erroredDomains': self.errored_domains,
            'progress': round(
                ((self.successful_domains + self.errored_domains) / self.total_domains) * 100
            )
        }
        self.logger.info(json.dumps(result))
        self.finish_job()