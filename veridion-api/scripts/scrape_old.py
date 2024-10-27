import scrapy
import re
import json
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import spacy
from spacy.matcher import Matcher

class ContactSpider(scrapy.Spider):
    name = 'contact_spider'
    custom_settings = {
        'LOG_LEVEL': 'INFO',
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'DOWNLOAD_TIMEOUT': 15,
        'CONCURRENT_REQUESTS': 20,
        'DOWNLOAD_DELAY': 0.5,
        'RETRY_TIMES': 1,
    }

    def __init__(self, urls=None, job_id=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_urls = urls.split(',') if urls else []
        print(self.start_urls)
        self.job_id = job_id
        self.visited_urls = set()
        self.results = []
        self.errors = []
        self.url_variants_cache = {}
        self.nlp = spacy.load("en_core_web_md")

        self.matcher = Matcher(self.nlp.vocab)
        phone_pattern = [{"ORTH": "("}, {"SHAPE": "ddd"}, {"ORTH": ")"}, {"SHAPE": "ddd"},{"ORTH": "-", "OP": "?"}, {"SHAPE": "ddd"}]
        self.matcher.add("PHONE_NUMBER", [phone_pattern])
        self.phone_regex = re.compile(r'\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b')
        
    def generate_url_variants(self, base_url):
        parsed_url = urlparse(base_url)
        domain = parsed_url.netloc or parsed_url.path
        schemes = ['https://','http://']
        prefixes = ['', 'www.']
        variants = [f"{scheme}{prefix}{domain}" for scheme in schemes for prefix in prefixes]
        return variants
    
    def start_requests(self):
        for url in self.start_urls:
            self.url_variants_cache[url] = self.generate_url_variants(url)
            yield from self.try_next_variant(url)

    def try_next_variant(self, base_url):
        variants = self.url_variants_cache.get(base_url, [])
        if variants:
            yield scrapy.Request(url=variants.pop(0), callback=self.parse, errback=self.errback, meta={'base_url': base_url})

    def parse(self, response):
        if response.url in self.visited_urls:
            return
        self.visited_urls.add(response.url)
        print('visited_urls', self.visited_urls)

        soup = BeautifulSoup(response.body, 'lxml')
        for script in soup(["script", "style"]):
            script.extract()

        text_content = re.sub(r'\s+', ' ', soup.get_text()).strip()
        doc = self.nlp(text_content)
        company_names = list(set(ent.text for ent in doc.ents if ent.label_ == "ORG"))
        locations = list(set(ent.text for ent in doc.ents if ent.label_ == "GPE"))
        phone_numbers = list(set(self.phone_regex.findall(text_content)))
        social_media_links = self.extract_social_media_links(soup)

        self.results.append({
            'url': response.meta['base_url'],
            'pages_visited': [response.url],
            'company_names': company_names,
            'locations': locations,
            'phone_numbers': phone_numbers,
            'social_media_links': social_media_links,
        })

        if len(self.visited_urls) % 10 == 0:
            self.log(f"PROGRESS: {(len(self.visited_urls) / len(self.start_urls)) * 100}%")

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

    def errback(self, failure):
        base_url = failure.request.meta['base_url']
        if base_url not in self.errors:
            self.errors.append(base_url)
        yield from self.try_next_variant(base_url)

    def closed(self, reason):
        filename = f"data/output/{self.job_id}.results.json"
        with open(filename, "w") as f:
            json.dump(self.results, f)
        if self.errors:
            self.log(f"SCRAPE FAILED FOR: {self.errors}")
        self.log("SCRAPE SUCCESS:")
